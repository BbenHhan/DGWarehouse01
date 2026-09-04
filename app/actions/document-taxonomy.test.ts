import { beforeEach, describe, expect, it, vi } from "vitest";

// The actions branch on DATA_SOURCE. Pointing them at the local store lets the
// whole path be exercised for real — gate, validation, disposition, write —
// rather than mocked at the boundary, which is where the interesting failures
// would hide.
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
  createGroup,
  renameGroup,
  moveGroup,
  deleteGroup,
  createCategory,
  renameCategory,
  moveCategory,
  deleteCategory,
} = await import("@/app/actions/document-taxonomy");

const {
  localCreateDocumentCategory,
  localCreateDocumentGroup,
  localGetDocumentGroups,
  localGetDocuments,
  localGetDocumentCategories,
  localSaveDocumentFile,
} = await import("@/lib/local/store");

let testId: number;
beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
  requireRole.mockReset();
  requireRole.mockResolvedValue({ role: "editor" });
});

async function seedCategory(label = "a") {
  const category = await localCreateDocumentCategory(`หมวดทดสอบ ${label} ${testId}`, "📁");
  if (!category) throw new Error("could not seed a category");
  return category;
}

async function seedGroup(categoryId: string, name: string) {
  const group = await localCreateDocumentGroup(categoryId, name);
  if (!group) throw new Error(`could not seed group ${name}`);
  return group;
}

// ActionResult is a discriminated union: `error` only exists on the refusal
// arm. Narrowing here keeps every assertion below reading as "this must have
// been refused, and here is what it must say".
function refusal(result: { ok: boolean } & Record<string, unknown>): string {
  if (result.ok) throw new Error("expected the action to be refused, but it succeeded");
  return String(result.error ?? "");
}

function file(name = "doc.pdf") {
  return new File(["x"], name, { type: "application/pdf" });
}

// ---------------------------------------------------------------------------
// quickstart Scenario 8 (FR-016, SC-006): a viewer does not merely lack the
// buttons — the server refuses the action when it is invoked directly. Hiding
// a control is presentation; this is the actual boundary.
// ---------------------------------------------------------------------------
describe("every taxonomy action is refused for someone without edit rights", () => {
  const cases: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
    ["createGroup", () => createGroup({ categoryId: "cat", nameTh: "ชื่อใหม่" })],
    ["renameGroup", () => renameGroup({ id: crypto.randomUUID(), nameTh: "ชื่อใหม่" })],
    ["moveGroup", () => moveGroup({ id: crypto.randomUUID(), direction: "up" })],
    ["deleteGroup", () => deleteGroup({ id: crypto.randomUUID(), documents: { kind: "none" } })],
    ["createCategory", () => createCategory({ nameTh: "หมวดใหม่", emoji: "📁" })],
    ["renameCategory", () => renameCategory({ id: "cat", nameTh: "หมวดใหม่" })],
    ["moveCategory", () => moveCategory({ id: "cat", direction: "up" })],
    ["deleteCategory", () => deleteCategory({ id: "cat", documents: { kind: "none" } })],
  ];

  it.each(cases)("%s is refused for a viewer", async (_name, invoke) => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    const result = await invoke();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
  });

  it.each(cases)("%s is refused when nobody is signed in", async (_name, invoke) => {
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));
    const result = await invoke();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
  });

  it("writes nothing when the gate refuses", async () => {
    const category = await seedCategory();
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await createGroup({ categoryId: category.id, nameTh: "ไม่ควรถูกสร้าง" });

    expect(await localGetDocumentGroups(category.id)).toHaveLength(0);
  });

  it("gates on editor, not admin — the admin role's only extra power is role management", async () => {
    const category = await seedCategory();
    await createGroup({ categoryId: category.id, nameTh: "หมวดย่อยของผู้แก้ไข" });
    expect(requireRole).toHaveBeenCalledWith("editor");
  });
});

// ---------------------------------------------------------------------------
// quickstart Scenario 7 (FR-011, FR-011a, FR-011b): deleting something that
// holds files must be a decision, never a side effect.
// ---------------------------------------------------------------------------
describe("deleting a group that still holds documents", () => {
  it("refuses when the caller claims it is empty and it is not", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "มีไฟล์อยู่");
    await localSaveDocumentFile(category.id, group.id, file());

    const result = await deleteGroup({ id: group.id, documents: { kind: "none" } });

    expect(refusal(result)).toContain("1");
    expect(await localGetDocumentGroups(category.id)).toHaveLength(1);
  });

  it("refuses a destination inside the very group being deleted", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "กำลังจะลบ");
    await localSaveDocumentFile(category.id, group.id, file());

    const result = await deleteGroup({
      id: group.id,
      documents: { kind: "move", toCategoryId: category.id, toGroupId: group.id },
    });

    expect(result.ok).toBe(false);
    expect(await localGetDocuments(category.id)).toHaveLength(1);
  });

  it("moves the documents out, then deletes the group", async () => {
    const category = await seedCategory();
    const from = await seedGroup(category.id, "ต้นทาง");
    const to = await seedGroup(category.id, "ปลายทาง");
    await localSaveDocumentFile(category.id, from.id, file("a.pdf"));
    await localSaveDocumentFile(category.id, from.id, file("b.pdf"));

    const result = await deleteGroup({
      id: from.id,
      documents: { kind: "move", toCategoryId: category.id, toGroupId: to.id },
    });

    expect(result.ok).toBe(true);
    const groups = await localGetDocumentGroups(category.id);
    expect(groups.map((g) => g.name_th)).toEqual(["ปลายทาง"]);
    expect(groups[0].document_count).toBe(2);
  });

  // FR-011a: the number the user agreed to must still be the number destroyed.
  it("refuses a destructive delete when the count has changed since it was confirmed", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "จำนวนเปลี่ยน");
    await localSaveDocumentFile(category.id, group.id, file("a.pdf"));
    await localSaveDocumentFile(category.id, group.id, file("b.pdf"));

    // The dialog was shown while only one file was there.
    const result = await deleteGroup({
      id: group.id,
      documents: { kind: "delete", confirmedCount: 1 },
    });

    expect(refusal(result)).toContain("2");
    expect(await localGetDocuments(category.id)).toHaveLength(2);
  });

  it("destroys exactly what was confirmed when the count still matches", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "ลบพร้อมไฟล์");
    await localSaveDocumentFile(category.id, group.id, file("a.pdf"));
    await localSaveDocumentFile(category.id, group.id, file("b.pdf"));

    const result = await deleteGroup({
      id: group.id,
      documents: { kind: "delete", confirmedCount: 2 },
    });

    expect(result.ok).toBe(true);
    expect(await localGetDocumentGroups(category.id)).toHaveLength(0);
    expect(await localGetDocuments(category.id)).toHaveLength(0);
  });
});

describe("deleting a category", () => {
  // FR-010: its sub-groups go with it in one action, rather than the user
  // being made to empty it by hand first.
  it("takes its sub-groups with it in one action", async () => {
    const category = await seedCategory();
    await seedGroup(category.id, "ย่อยหนึ่ง");
    await seedGroup(category.id, "ย่อยสอง");

    const result = await deleteCategory({ id: category.id, documents: { kind: "none" } });

    expect(result.ok).toBe(true);
    expect(await localGetDocumentGroups(category.id)).toHaveLength(0);
    const remaining = await localGetDocumentCategories();
    expect(remaining.find((c) => c.id === category.id)).toBeUndefined();
  });

  it("refuses a destination inside the category being deleted", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "ปลายทางในตัวเอง");
    await localSaveDocumentFile(category.id, group.id, file());

    const result = await deleteCategory({
      id: category.id,
      documents: { kind: "move", toCategoryId: category.id, toGroupId: group.id },
    });

    expect(result.ok).toBe(false);
    expect(await localGetDocuments(category.id)).toHaveLength(1);
  });

  it("moves its documents to another category before deleting", async () => {
    const from = await seedCategory("from");
    const to = await seedCategory("to");
    const target = await seedGroup(to.id, "ปลายทางข้ามหมวด");
    await localSaveDocumentFile(from.id, null, file("a.pdf"));

    const result = await deleteCategory({
      id: from.id,
      documents: { kind: "move", toCategoryId: to.id, toGroupId: target.id },
    });

    expect(result.ok).toBe(true);
    expect(await localGetDocuments(from.id)).toHaveLength(0);
    expect(await localGetDocuments(to.id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// quickstart Scenario 11 (Constitution V, FR-022): a rejected write comes back
// as a stated reason, never as a silent no-op.
// ---------------------------------------------------------------------------
describe("a rejected write states why", () => {
  it("refuses a duplicate group name within a category", async () => {
    const category = await seedCategory();
    await createGroup({ categoryId: category.id, nameTh: "ชื่อซ้ำ" });

    const result = await createGroup({ categoryId: category.id, nameTh: "ชื่อซ้ำ" });

    expect(refusal(result)).toBeTruthy();
    expect(await localGetDocumentGroups(category.id)).toHaveLength(1);
  });

  it("allows the same name under a different category", async () => {
    const a = await seedCategory("a");
    const b = await seedCategory("b");
    await createGroup({ categoryId: a.id, nameTh: "ชื่อเดียวกัน" });

    const result = await createGroup({ categoryId: b.id, nameTh: "ชื่อเดียวกัน" });

    expect(result.ok).toBe(true);
  });

  it("refuses a blank name rather than storing one", async () => {
    const category = await seedCategory();
    const result = await createGroup({ categoryId: category.id, nameTh: "   " });

    expect(result.ok).toBe(false);
    expect(await localGetDocumentGroups(category.id)).toHaveLength(0);
  });

  it("refuses renaming a group to a sibling's name, keeping the original", async () => {
    const category = await seedCategory();
    await seedGroup(category.id, "หนึ่ง");
    const second = await seedGroup(category.id, "สอง");

    const result = await renameGroup({ id: second.id, nameTh: "หนึ่ง" });

    expect(result.ok).toBe(false);
    const groups = await localGetDocumentGroups(category.id);
    expect(groups.map((g) => g.name_th).sort()).toEqual(["สอง", "หนึ่ง"]);
  });

  it("refuses to move the first group up", async () => {
    const category = await seedCategory();
    const first = await seedGroup(category.id, "แรก");
    await seedGroup(category.id, "ที่สอง");

    const result = await moveGroup({ id: first.id, direction: "up" });

    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// quickstart Scenario 4 (US2, SC-002, FR-013)
// ---------------------------------------------------------------------------
describe("renaming", () => {
  it("renames a group without moving the documents inside it", async () => {
    const category = await seedCategory();
    const group = await seedGroup(category.id, "ชื่อเดิม");
    await localSaveDocumentFile(category.id, group.id, file());

    const result = await renameGroup({ id: group.id, nameTh: "ชื่อใหม่" });

    expect(result.ok).toBe(true);
    const groups = await localGetDocumentGroups(category.id);
    expect(groups[0].name_th).toBe("ชื่อใหม่");
    expect(groups[0].document_count).toBe(1);
  });

  // FR-013: the slug is a live URL, so renaming must not break existing links.
  it("renames a category without changing its slug", async () => {
    const category = await seedCategory();

    const result = await renameCategory({ id: category.id, nameTh: "ชื่อหมวดใหม่" });

    expect(result.ok).toBe(true);
    const after = (await localGetDocumentCategories()).find((c) => c.id === category.id);
    expect(after!.name_th).toBe("ชื่อหมวดใหม่");
    expect(after!.slug).toBe(category.slug);
  });
});
