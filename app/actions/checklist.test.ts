import { beforeEach, describe, expect, it, vi } from "vitest";

// specs/048-server-action-coverage. The room and sub-item rules are covered at
// the data layer already; these run them through the action, where the rights
// gate and the schema live and where people actually reach them.
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
  addChecklistItem,
  setChecklistItemStatus,
  setChecklistItemRoomStatus,
  editChecklistItem,
  deleteChecklistItem,
} = await import("@/app/actions/checklist");
const { localGetChecklistItems } = await import("@/lib/local/store");

const ROOM_A = "hong-raek";
const ROOM_B = "hong-klang";

async function item(id: string) {
  const found = (await localGetChecklistItems()).find((candidate) => candidate.id === id);
  if (!found) throw new Error("item not found");
  return found;
}

async function add(text: string, roomIds: string[] = [], parentId?: string) {
  const result = await addChecklistItem({ text, roomIds, ...(parentId ? { parentId } : {}) });
  if (!result.ok) throw new Error(`could not add ${text}: ${result.error}`);
  return result.data;
}

function refusal(result: { ok: boolean } & Record<string, unknown>): string {
  if (result.ok) throw new Error("expected the action to be refused, but it succeeded");
  return String(result.error ?? "");
}

beforeEach(() => {
  requireRole.mockReset();
  requireRole.mockResolvedValue({ role: "editor" });
});

// ---------------------------------------------------------------------------
// US1 — the security boundary (FR-001 to FR-004)
// ---------------------------------------------------------------------------
describe("every checklist action is refused without edit rights", () => {
  const cases = (id: string) =>
    [
      ["addChecklistItem", () => addChecklistItem({ text: "งานใหม่", roomIds: [ROOM_A] })],
      ["setChecklistItemStatus", () => setChecklistItemStatus(id, "done")],
      ["setChecklistItemRoomStatus", () => setChecklistItemRoomStatus(id, ROOM_A, "done")],
      ["editChecklistItem", () => editChecklistItem({ id, text: "ชื่อใหม่" })],
      ["deleteChecklistItem", () => deleteChecklistItem(id)],
    ] as const;

  it("tells a viewer they lack the right, and changes nothing", async () => {
    const existing = await add("ห้ามแตะ", [ROOM_A]);
    const before = await localGetChecklistItems();
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    for (const [, call] of cases(existing.id)) {
      expect(refusal(await call())).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    }

    expect(await localGetChecklistItems()).toEqual(before);
  });

  it("tells someone signed out to sign in, distinctly from a viewer", async () => {
    const existing = await add("ยังอยู่", [ROOM_A]);
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));

    for (const [, call] of cases(existing.id)) {
      expect(refusal(await call())).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
    }
  });

  it("asks for editor rights, not admin", async () => {
    await add("ขอสิทธิ์อะไร", [ROOM_A]);
    expect(requireRole).toHaveBeenCalledWith("editor");
  });

  it("checks rights before the input", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    expect(refusal(await addChecklistItem({ text: "   ", roomIds: [] }))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    expect(refusal(await setChecklistItemStatus("ไม่ใช่ uuid", "done"))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
  });
});

// ---------------------------------------------------------------------------
// US4 — rooms are independent of each other (FR-010)
// ---------------------------------------------------------------------------
describe("ticking a task in one room", () => {
  it("leaves the other room and the task's own status alone", async () => {
    const task = await add("ติดตั้งป้ายหนีไฟ", [ROOM_A, ROOM_B]);

    const result = await setChecklistItemRoomStatus(task.id, ROOM_A, "done");

    expect(result.ok).toBe(true);
    const after = await item(task.id);
    const byRoom = Object.fromEntries(after.room_statuses.map((r) => [r.room_id, r.status]));
    expect(byRoom[ROOM_A]).toBe("done");
    expect(byRoom[ROOM_B]).toBe("todo");
    // The task is only finished when every room is.
    expect(after.status).not.toBe("done");
  });

  it("counts the task as finished once every room is", async () => {
    const task = await add("ตรวจไฟฉุกเฉิน", [ROOM_A, ROOM_B]);

    await setChecklistItemRoomStatus(task.id, ROOM_A, "done");
    await setChecklistItemRoomStatus(task.id, ROOM_B, "done");

    expect((await item(task.id)).status).toBe("done");
  });

  it("brings the task back when a room is reopened", async () => {
    const task = await add("ทาสีผนัง", [ROOM_A, ROOM_B]);
    await setChecklistItemRoomStatus(task.id, ROOM_A, "done");
    await setChecklistItemRoomStatus(task.id, ROOM_B, "done");

    await setChecklistItemRoomStatus(task.id, ROOM_B, "todo");

    expect((await item(task.id)).status).not.toBe("done");
  });

  it("refuses a status that is not one of the three", async () => {
    const task = await add("สถานะแปลก", [ROOM_A]);
    // @ts-expect-error — the point of the check is that the schema refuses it
    expect(refusal(await setChecklistItemRoomStatus(task.id, ROOM_A, "finished"))).toBeTruthy();
    expect((await item(task.id)).room_statuses[0].status).toBe("todo");
  });
});

// ---------------------------------------------------------------------------
// US4 — a parent follows its sub-items (FR-011)
// ---------------------------------------------------------------------------
describe("a task broken into steps", () => {
  it("counts as finished only when every step is", async () => {
    const parent = await add("งานพื้นกันไฟฟ้าสถิต", [ROOM_A]);
    const first = await add("วัดค่าโซนหน้า", [ROOM_A], parent.id);
    const second = await add("วัดค่าโซนหลัง", [ROOM_A], parent.id);

    await setChecklistItemStatus(first.id, "done");
    expect((await item(parent.id)).status).not.toBe("done");

    await setChecklistItemStatus(second.id, "done");
    expect((await item(parent.id)).status).toBe("done");
  });

  it("reopens the parent when one step is reopened", async () => {
    const parent = await add("งานประตู", [ROOM_A]);
    const step = await add("ติดตั้งบานประตู", [ROOM_A], parent.id);
    await setChecklistItemStatus(step.id, "done");
    expect((await item(parent.id)).status).toBe("done");

    await setChecklistItemStatus(step.id, "todo");

    expect((await item(parent.id)).status).not.toBe("done");
  });
});

// ---------------------------------------------------------------------------
// US4 — deleting a parent takes its steps (FR-012)
// ---------------------------------------------------------------------------
describe("deleting a task", () => {
  it("removes its steps with it, and nothing else", async () => {
    const parent = await add("งานที่จะลบ", [ROOM_A]);
    const step = await add("ขั้นตอนย่อย", [ROOM_A], parent.id);
    const bystander = await add("งานของคนอื่น", [ROOM_A]);

    const result = await deleteChecklistItem(parent.id);

    expect(result).toEqual({ ok: true, data: { id: parent.id } });
    const remaining = await localGetChecklistItems();
    const ids = remaining.flatMap((i) => [i.id, ...i.sub_items.map((s) => s.id)]);
    expect(ids).not.toContain(parent.id);
    expect(ids).not.toContain(step.id);
    expect(ids).toContain(bystander.id);
  });

  it("refuses an id that does not exist", async () => {
    expect(refusal(await deleteChecklistItem(crypto.randomUUID()))).toBe("ไม่พบรายการนี้");
  });
});

// ---------------------------------------------------------------------------
// US4 — adding and editing
// ---------------------------------------------------------------------------
describe("adding and editing a task", () => {
  it("tags exactly the rooms given", async () => {
    const task = await add("ตรวจถังดับเพลิง", [ROOM_A, ROOM_B]);
    expect((await item(task.id)).room_ids.sort()).toEqual([ROOM_B, ROOM_A].sort());
  });

  it("keeps a task with no room at all off every room", async () => {
    const task = await add("งานรวมของไซต์", []);
    expect((await item(task.id)).room_ids).toEqual([]);
  });

  it("refuses blank text", async () => {
    expect(refusal(await addChecklistItem({ text: "   ", roomIds: [ROOM_A] }))).toBe("กรุณาระบุข้อความ");
  });

  it("changes text, detail and dates", async () => {
    const task = await add("ก่อนแก้", [ROOM_A]);

    const result = await editChecklistItem({
      id: task.id,
      text: "หลังแก้",
      detail: "ต้องวัดค่าหลังปูเสร็จ",
      dueDate: "2026-10-15",
    });

    expect(result.ok).toBe(true);
    const after = await item(task.id);
    expect(after.text).toBe("หลังแก้");
    expect(after.detail).toBe("ต้องวัดค่าหลังปูเสร็จ");
    expect(after.due_date).toBe("2026-10-15");
  });

  it("refuses an edit that changes nothing", async () => {
    const task = await add("ไม่แก้อะไร", [ROOM_A]);
    expect(refusal(await editChecklistItem({ id: task.id }))).toBe("ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข");
  });
});
