import { beforeEach, describe, expect, it } from "vitest";
import {
  localAddChecklistItem,
  localDeleteChecklistItem,
  localEditChecklistItem,
  localGetChecklistItems,
  localGetRoomChecklistItems,
  localSetChecklistItemRoomStatus,
  localSetChecklistItemStatus,
} from "@/lib/local/store";

// vitest.setup.ts points the local store at a disposable temp directory for
// the whole run (specs/005-automated-testing FR-003).
//
// Unlike photos, checklist items aren't scoped by room at the storage layer —
// localGetChecklistItems returns every top-level item in the store, so items
// from earlier tests are still there. Each test therefore mints its own room
// ids and filters the sitewide list by its own text prefix.
let testId: number;
let prefix: string;

beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
  prefix = `t${testId}`;
});

function rooms() {
  return { roomA: `test-room-a-${testId}`, roomB: `test-room-b-${testId}` };
}

/** The sitewide list, narrowed to just the items this test created. */
async function ownItems() {
  const all = await localGetChecklistItems();
  return all.filter((item) => item.text.startsWith(prefix));
}

describe("localAddChecklistItem", () => {
  it("stores a new item as todo with no rooms and no sub-items", async () => {
    const item = await localAddChecklistItem({ text: `${prefix} ทาสีผนัง`, roomIds: [] });

    expect(item.status).toBe("todo");
    expect(item.room_ids).toEqual([]);
    expect(item.room_statuses).toEqual([]);
    expect(item.parent_id).toBeNull();
    expect(item.sub_items).toEqual([]);

    const mine = await ownItems();
    expect(mine.map((i) => i.id)).toContain(item.id);
  });

  it("seeds a todo room_status for every tagged room", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ติดป้ายทางออก`, roomIds: [roomA, roomB] });

    expect(item.room_ids).toEqual([roomA, roomB]);
    expect(item.room_statuses).toEqual([
      { room_id: roomA, status: "todo" },
      { room_id: roomB, status: "todo" },
    ]);
  });

  it("stores the optional detail, start date, and due date", async () => {
    const item = await localAddChecklistItem({
      text: `${prefix} ตรวจระบบดับเพลิง`,
      roomIds: [],
      detail: "กรมโรงงานขอเอกสารประกอบ",
      startDate: "2026-09-01",
      dueDate: "2026-09-30",
    });

    expect(item.detail).toBe("กรมโรงงานขอเอกสารประกอบ");
    expect(item.start_date).toBe("2026-09-01");
    expect(item.due_date).toBe("2026-09-30");
  });

  it("defaults the optional fields to null when they're omitted", async () => {
    const item = await localAddChecklistItem({ text: `${prefix} งานด่วน`, roomIds: [] });

    expect(item.detail).toBeNull();
    expect(item.start_date).toBeNull();
    expect(item.due_date).toBeNull();
  });
});

describe("localGetChecklistItems", () => {
  it("nests sub-items under their parent and keeps them off the top level", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานหลัก`, roomIds: [] });
    const sub = await localAddChecklistItem({ text: `${prefix} งานย่อย`, roomIds: [], parentId: parent.id });

    const mine = await ownItems();
    expect(mine.map((i) => i.id)).toContain(parent.id);
    expect(mine.map((i) => i.id)).not.toContain(sub.id);

    const stored = mine.find((i) => i.id === parent.id);
    expect(stored?.sub_items.map((s) => s.id)).toEqual([sub.id]);
  });
});

describe("localGetRoomChecklistItems", () => {
  it("returns only the items tagged to that room", async () => {
    const { roomA, roomB } = rooms();
    const tagged = await localAddChecklistItem({ text: `${prefix} เฉพาะห้อง A`, roomIds: [roomA] });
    await localAddChecklistItem({ text: `${prefix} เฉพาะห้อง B`, roomIds: [roomB] });
    await localAddChecklistItem({ text: `${prefix} ไม่ผูกห้อง`, roomIds: [] });

    const forRoomA = await localGetRoomChecklistItems(roomA);
    expect(forRoomA.map((i) => i.id)).toEqual([tagged.id]);
  });

  it("never shows an untagged item in any room's box", async () => {
    const { roomA } = rooms();
    const untagged = await localAddChecklistItem({ text: `${prefix} งานทั่วไป`, roomIds: [] });

    const forRoomA = await localGetRoomChecklistItems(roomA);
    expect(forRoomA.map((i) => i.id)).not.toContain(untagged.id);
  });

  it("drops an item from a room's box once that room's own tag is done", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ติดตั้งถังดับเพลิง`, roomIds: [roomA, roomB] });

    await localSetChecklistItemRoomStatus(item.id, roomA, "done");

    expect((await localGetRoomChecklistItems(roomA)).map((i) => i.id)).not.toContain(item.id);
    expect((await localGetRoomChecklistItems(roomB)).map((i) => i.id)).toContain(item.id);
  });

  it("keeps an item visible while that room's tag is merely in progress", async () => {
    const { roomA } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} เดินสายไฟ`, roomIds: [roomA] });

    await localSetChecklistItemRoomStatus(item.id, roomA, "in_progress");

    expect((await localGetRoomChecklistItems(roomA)).map((i) => i.id)).toContain(item.id);
  });

  it("hides a done sub-item while keeping its unfinished siblings", async () => {
    const { roomA } = rooms();
    const parent = await localAddChecklistItem({ text: `${prefix} งานผนัง`, roomIds: [roomA] });
    const doneSub = await localAddChecklistItem({ text: `${prefix} ฉาบปูน`, roomIds: [], parentId: parent.id });
    const openSub = await localAddChecklistItem({ text: `${prefix} ทาสี`, roomIds: [], parentId: parent.id });

    await localSetChecklistItemStatus(doneSub.id, "done");

    const box = await localGetRoomChecklistItems(roomA);
    const shown = box.find((i) => i.id === parent.id);
    expect(shown?.sub_items.map((s) => s.id)).toEqual([openSub.id]);
  });
});

describe("localSetChecklistItemStatus", () => {
  it("cascades a parent's new status down to every sub-item", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานแม่`, roomIds: [] });
    const subOne = await localAddChecklistItem({ text: `${prefix} ลูก 1`, roomIds: [], parentId: parent.id });
    const subTwo = await localAddChecklistItem({ text: `${prefix} ลูก 2`, roomIds: [], parentId: parent.id });

    await localSetChecklistItemStatus(parent.id, "done");

    const stored = (await ownItems()).find((i) => i.id === parent.id);
    expect(stored?.status).toBe("done");
    expect(stored?.sub_items.find((s) => s.id === subOne.id)?.status).toBe("done");
    expect(stored?.sub_items.find((s) => s.id === subTwo.id)?.status).toBe("done");
  });

  it("rolls a parent up to in_progress when only some sub-items are done", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานแม่`, roomIds: [] });
    const subOne = await localAddChecklistItem({ text: `${prefix} ลูก 1`, roomIds: [], parentId: parent.id });
    await localAddChecklistItem({ text: `${prefix} ลูก 2`, roomIds: [], parentId: parent.id });

    await localSetChecklistItemStatus(subOne.id, "done");

    const stored = (await ownItems()).find((i) => i.id === parent.id);
    expect(stored?.status).toBe("in_progress");
  });

  it("rolls a parent up to done once every sub-item is done", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานแม่`, roomIds: [] });
    const subOne = await localAddChecklistItem({ text: `${prefix} ลูก 1`, roomIds: [], parentId: parent.id });
    const subTwo = await localAddChecklistItem({ text: `${prefix} ลูก 2`, roomIds: [], parentId: parent.id });

    await localSetChecklistItemStatus(subOne.id, "done");
    await localSetChecklistItemStatus(subTwo.id, "done");

    const stored = (await ownItems()).find((i) => i.id === parent.id);
    expect(stored?.status).toBe("done");
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localSetChecklistItemStatus("no-such-id", "done")).toBeNull();
  });
});

describe("localSetChecklistItemRoomStatus", () => {
  it("updates only the room it names, leaving the other room untouched", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} งานสองห้อง`, roomIds: [roomA, roomB] });

    await localSetChecklistItemRoomStatus(item.id, roomA, "done");

    const stored = (await ownItems()).find((i) => i.id === item.id);
    expect(stored?.room_statuses.find((rs) => rs.room_id === roomA)?.status).toBe("done");
    expect(stored?.room_statuses.find((rs) => rs.room_id === roomB)?.status).toBe("todo");
  });

  it("derives the item's own status by rolling its rooms up", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} งานสองห้อง`, roomIds: [roomA, roomB] });

    const afterFirst = await localSetChecklistItemRoomStatus(item.id, roomA, "done");
    expect(afterFirst?.status).toBe("in_progress");

    const afterSecond = await localSetChecklistItemRoomStatus(item.id, roomB, "done");
    expect(afterSecond?.status).toBe("done");
  });

  it("returns null when the item carries no tag for that room", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ห้องเดียว`, roomIds: [roomA] });

    expect(await localSetChecklistItemRoomStatus(item.id, roomB, "done")).toBeNull();
  });

  it("returns null for an item that isn't in the store", async () => {
    const { roomA } = rooms();
    expect(await localSetChecklistItemRoomStatus("no-such-id", roomA, "done")).toBeNull();
  });
});

describe("localEditChecklistItem", () => {
  it("updates the text, detail, and dates it's given", async () => {
    const item = await localAddChecklistItem({ text: `${prefix} ก่อน`, roomIds: [] });

    const updated = await localEditChecklistItem(item.id, {
      text: `${prefix} หลัง`,
      detail: "เพิ่มรายละเอียด",
      startDate: "2026-10-01",
      dueDate: "2026-10-15",
    });

    expect(updated?.text).toBe(`${prefix} หลัง`);
    expect(updated?.detail).toBe("เพิ่มรายละเอียด");
    expect(updated?.start_date).toBe("2026-10-01");
    expect(updated?.due_date).toBe("2026-10-15");
  });

  it("leaves fields alone when they aren't part of the update", async () => {
    const item = await localAddChecklistItem({
      text: `${prefix} เดิม`,
      roomIds: [],
      detail: "รายละเอียดเดิม",
      dueDate: "2026-11-01",
    });

    const updated = await localEditChecklistItem(item.id, { text: `${prefix} ใหม่` });

    expect(updated?.detail).toBe("รายละเอียดเดิม");
    expect(updated?.due_date).toBe("2026-11-01");
  });

  it("clears a field that's explicitly set to null", async () => {
    const item = await localAddChecklistItem({ text: `${prefix} มีกำหนด`, roomIds: [], dueDate: "2026-11-01" });

    const updated = await localEditChecklistItem(item.id, { dueDate: null });

    expect(updated?.due_date).toBeNull();
  });

  it("replaces the room set wholesale and restarts every room at todo", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ย้ายห้อง`, roomIds: [roomA] });
    await localSetChecklistItemRoomStatus(item.id, roomA, "done");

    const updated = await localEditChecklistItem(item.id, { roomIds: [roomA, roomB] });

    expect(updated?.room_ids).toEqual([roomA, roomB]);
    expect(updated?.room_statuses).toEqual([
      { room_id: roomA, status: "todo" },
      { room_id: roomB, status: "todo" },
    ]);
    expect(updated?.status).toBe("todo");
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localEditChecklistItem("no-such-id", { text: "x" })).toBeNull();
  });
});

describe("localDeleteChecklistItem", () => {
  it("removes the item and every one of its sub-items", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานแม่`, roomIds: [] });
    const sub = await localAddChecklistItem({ text: `${prefix} ลูก`, roomIds: [], parentId: parent.id });
    const survivor = await localAddChecklistItem({ text: `${prefix} งานอื่น`, roomIds: [] });

    const removed = await localDeleteChecklistItem(parent.id);
    expect(removed?.id).toBe(parent.id);

    const mine = await ownItems();
    const ids = mine.flatMap((i) => [i.id, ...i.sub_items.map((s) => s.id)]);
    expect(ids).not.toContain(parent.id);
    expect(ids).not.toContain(sub.id);
    expect(ids).toContain(survivor.id);
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localDeleteChecklistItem("no-such-id")).toBeNull();
  });
});
