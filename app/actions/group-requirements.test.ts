import { beforeEach, describe, expect, it, vi } from "vitest";

// specs/046-subgroup-requirement-checklist — contracts/server-actions.md.
// Runs the real actions against the local store with only the rights check
// mocked, the pattern app/actions/document-taxonomy.test.ts established.
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "local", USE_MOCK_DATA: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireRole = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  createServiceClient: () => {
    throw new Error("no Supabase client should be built in local mode");
  },
}));

const {
  addRequirement,
  updateRequirement,
  deleteRequirement,
  moveRequirement,
  setGroupDescription,
  setCategoryDescription,
} = await import("@/app/actions/group-requirements");

const {
  localAddRequirement,
  localCreateDocumentCategory,
  localCreateDocumentGroup,
  localGetDocumentCategories,
  localGetDocumentGroups,
  localGetGroupRequirements,
} = await import("@/lib/local/store");

let run: number;
let seeded = 0;
beforeEach(() => {
  run = Math.floor(Math.random() * 1_000_000);
  requireRole.mockReset();
  requireRole.mockResolvedValue({ role: "editor" });
});

async function seed() {
  seeded += 1;
  const category = await localCreateDocumentCategory(`หมวดสิทธิ์ ${run}-${seeded}`, "📋");
  const group = await localCreateDocumentGroup(category!.id, `หมวดย่อย ${run}-${seeded}`);
  const item = await localAddRequirement({ groupId: group!.id, nameTh: "ใบรับรอง", status: "missing", note: null });
  return { category: category!, group: group!, item: item! };
}

async function itemsOf(categoryId: string, groupId: string) {
  return (await localGetGroupRequirements(categoryId))[groupId] ?? [];
}

function refusal(result: { ok: boolean } & Record<string, unknown>): string {
  if (result.ok) throw new Error("expected the action to be refused, but it succeeded");
  return String(result.error ?? "");
}

// ---------------------------------------------------------------------------
// FR-013, SC-004: refused by the server, not merely hidden.
// ---------------------------------------------------------------------------
describe("every checklist action is refused without edit rights", () => {
  function everyAction(ids: { groupId: string; itemId: string; categoryId: string }) {
    return [
      ["addRequirement", () => addRequirement({ groupId: ids.groupId, nameTh: "ใหม่" })],
      ["updateRequirement", () => updateRequirement({ id: ids.itemId, status: "have" })],
      ["deleteRequirement", () => deleteRequirement({ id: ids.itemId })],
      ["moveRequirement", () => moveRequirement({ id: ids.itemId, direction: "down" })],
      ["setGroupDescription", () => setGroupDescription({ groupId: ids.groupId, description: "x" })],
      ["setCategoryDescription", () => setCategoryDescription({ categoryId: ids.categoryId, description: "x" })],
    ] as const;
  }

  it("tells a viewer they lack the right, and changes nothing", async () => {
    const { category, group, item } = await seed();
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    for (const [, call] of everyAction({ groupId: group.id, itemId: item.id, categoryId: category.id })) {
      expect(refusal(await call())).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    }

    const items = await itemsOf(category.id, group.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name_th: "ใบรับรอง", status: "missing" });
    expect((await localGetDocumentGroups(category.id))[0].description ?? null).toBeNull();
    const storedCategory = (await localGetDocumentCategories()).find((c) => c.id === category.id);
    expect(storedCategory?.description ?? null).toBeNull();
  });

  it("tells someone signed out to sign in, distinctly from a viewer", async () => {
    const { category, group, item } = await seed();
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));

    for (const [, call] of everyAction({ groupId: group.id, itemId: item.id, categoryId: category.id })) {
      expect(refusal(await call())).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
    }
    expect(await itemsOf(category.id, group.id)).toHaveLength(1);
  });

  // Constitution VII: admin's only extra power is changing roles.
  it("asks for editor rights, not admin", async () => {
    const { group } = await seed();
    await addRequirement({ groupId: group.id, nameTh: "ใหม่" });
    expect(requireRole).toHaveBeenCalledWith("editor");
  });

  it("checks rights before validating, so a viewer learns nothing from bad input", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    expect(refusal(await addRequirement({ groupId: "not-a-uuid", nameTh: "" }))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
  });
});

describe("keeping the list true (US2)", () => {
  it("adds an item at the end, marked missing", async () => {
    const { category, group } = await seed();
    const result = await addRequirement({ groupId: group.id, nameTh: "  ผลดันเทสสปริงเกลอร์  " });

    expect(result.ok).toBe(true);
    const items = await itemsOf(category.id, group.id);
    expect(items.map((i) => [i.name_th, i.status, i.sort_order])).toEqual([
      ["ใบรับรอง", "missing", 1],
      ["ผลดันเทสสปริงเกลอร์", "missing", 2],
    ]);
  });

  it("refuses a blank name and adds nothing (FR-012)", async () => {
    const { category, group } = await seed();
    expect(refusal(await addRequirement({ groupId: group.id, nameTh: "   " }))).toBe("กรุณาระบุชื่อรายการ");
    expect(await itemsOf(category.id, group.id)).toHaveLength(1);
  });

  it("records an arrival: status and note together", async () => {
    const { category, group, item } = await seed();
    const result = await updateRequirement({ id: item.id, status: "have", note: "ไฟล์ ES-cert.pdf" });

    expect(result.ok).toBe(true);
    expect((await itemsOf(category.id, group.id))[0]).toMatchObject({ status: "have", note: "ไฟล์ ES-cert.pdf" });
  });

  it("stores a note cleared to spaces as none", async () => {
    const { category, group, item } = await seed();
    await updateRequirement({ id: item.id, note: "ชั่วคราว" });
    await updateRequirement({ id: item.id, note: "   " });
    expect((await itemsOf(category.id, group.id))[0].note).toBeNull();
  });

  it("deletes an item", async () => {
    const { category, group, item } = await seed();
    expect((await deleteRequirement({ id: item.id })).ok).toBe(true);
    expect(await itemsOf(category.id, group.id)).toEqual([]);
  });

  it("reorders, and says so when an item cannot move further", async () => {
    const { category, group, item } = await seed();
    await addRequirement({ groupId: group.id, nameTh: "ที่สอง" });

    expect(refusal(await moveRequirement({ id: item.id, direction: "up" }))).toBe("ย้ายต่อไม่ได้แล้ว");
    expect((await moveRequirement({ id: item.id, direction: "down" })).ok).toBe(true);
    expect((await itemsOf(category.id, group.id)).map((i) => i.name_th)).toEqual(["ที่สอง", "ใบรับรอง"]);
  });

  it("sets and clears descriptions on sub-groups and categories", async () => {
    const { category, group } = await seed();

    await setGroupDescription({ groupId: group.id, description: "ใบรับรองของวัสดุ" });
    await setCategoryDescription({ categoryId: category.id, description: "ชุดยื่นขออนุญาต" });
    expect((await localGetDocumentGroups(category.id))[0].description).toBe("ใบรับรองของวัสดุ");
    expect((await localGetDocumentCategories()).find((c) => c.id === category.id)?.description).toBe(
      "ชุดยื่นขออนุญาต"
    );

    await setGroupDescription({ groupId: group.id, description: "  " });
    expect((await localGetDocumentGroups(category.id))[0].description).toBeNull();
  });

  it("names what could not be found", async () => {
    const missing = crypto.randomUUID();
    expect(refusal(await updateRequirement({ id: missing, status: "have" }))).toBe("ไม่พบรายการนี้");
    expect(refusal(await deleteRequirement({ id: missing }))).toBe("ไม่พบรายการนี้");
    expect(refusal(await moveRequirement({ id: missing, direction: "up" }))).toBe("ไม่พบรายการนี้");
    expect(refusal(await addRequirement({ groupId: missing, nameTh: "x" }))).toBe("ไม่พบหมวดย่อยนี้");
    expect(refusal(await setGroupDescription({ groupId: missing, description: "x" }))).toBe("ไม่พบหมวดย่อยนี้");
    expect(refusal(await setCategoryDescription({ categoryId: `ไม่มี-${run}`, description: "x" }))).toBe(
      "ไม่พบหมวดนี้"
    );
  });

  it("refuses an update that changes nothing", async () => {
    const { item } = await seed();
    expect(refusal(await updateRequirement({ id: item.id }))).toBe("ไม่มีข้อมูลที่จะแก้ไข");
  });
});

describe("the read-only sample backend", () => {
  it("refuses every write", async () => {
    vi.resetModules();
    vi.doMock("@/lib/data-config", () => ({ DATA_SOURCE: "mock", USE_MOCK_DATA: true }));
    const mockActions = await import("@/app/actions/group-requirements");
    const id = crypto.randomUUID();

    const results = await Promise.all([
      mockActions.addRequirement({ groupId: id, nameTh: "x" }),
      mockActions.updateRequirement({ id, status: "have" }),
      mockActions.deleteRequirement({ id }),
      mockActions.moveRequirement({ id, direction: "up" }),
      mockActions.setGroupDescription({ groupId: id, description: "x" }),
      mockActions.setCategoryDescription({ categoryId: "safety", description: "x" }),
    ]);
    for (const result of results) expect(refusal(result)).toBe("โหมดตัวอย่างแก้ไขข้อมูลไม่ได้");
    vi.doUnmock("@/lib/data-config");
  });
});
