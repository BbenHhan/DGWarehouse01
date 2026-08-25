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

// End-to-end walkthroughs of the checklist user stories, run against the real
// local storage backend rather than a mock: each test follows one story from
// the moment an item is raised to the moment it drops out of view, asserting
// the state a user would actually see at each step.
//
// The unit tests in checklist-store.test.ts cover each function on its own;
// these cover the sequences the specs describe, where the interesting bugs
// live (a room ticked done that shouldn't clear its sibling room, a re-tag
// that silently keeps stale progress, and so on).
//
// Rooms are minted per test — see checklist-store.test.ts for why.
let testId: number;
let prefix: string;

beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
  prefix = `s${testId}`;
});

function rooms() {
  return {
    roomA: `scenario-room-a-${testId}`,
    roomB: `scenario-room-b-${testId}`,
  };
}

async function ownItems() {
  const all = await localGetChecklistItems();
  return all.filter((item) => item.text.startsWith(prefix));
}

async function boxTexts(roomId: string) {
  const items = await localGetRoomChecklistItems(roomId);
  return items.map((item) => item.text);
}

describe("Scenario: an inspector raises a task on the spot (specs/028-room-checklist)", () => {
  it("puts a two-room task in front of both rooms and on the sitewide list at once", async () => {
    const { roomA, roomB } = rooms();

    // The walkthrough: the inspector asks for exit signage in two rooms, and
    // it's typed straight into the room page's quick-add box.
    const item = await localAddChecklistItem({
      text: `${prefix} ติดป้ายทางออกฉุกเฉิน`,
      roomIds: [roomA, roomB],
      dueDate: "2026-09-30",
    });

    // Every team member sees it wherever they happen to be standing.
    expect(await boxTexts(roomA)).toContain(item.text);
    expect(await boxTexts(roomB)).toContain(item.text);
    expect((await ownItems()).map((i) => i.text)).toContain(item.text);
  });

  it("keeps a general task off every room's box while still listing it sitewide", async () => {
    const { roomA, roomB } = rooms();

    // Not everything an inspector raises belongs to a room.
    const item = await localAddChecklistItem({ text: `${prefix} รวบรวมเอกสารส่งกรม`, roomIds: [] });

    expect(await boxTexts(roomA)).not.toContain(item.text);
    expect(await boxTexts(roomB)).not.toContain(item.text);
    expect((await ownItems()).map((i) => i.text)).toContain(item.text);
  });
});

describe("Scenario: two rooms finish the same task at different times (specs/031-checklist-room-completion)", () => {
  it("clears each room's box independently and only calls the task done once both are", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ติดตั้งถังดับเพลิง`, roomIds: [roomA, roomB] });

    // Room A's team finishes first and ticks it off from their own page.
    await localSetChecklistItemRoomStatus(item.id, roomA, "done");

    // Room A's box is clear; room B's is untouched, and the task overall is
    // only partly done — the whole point of specs/031 over specs/030.
    expect(await boxTexts(roomA)).not.toContain(item.text);
    expect(await boxTexts(roomB)).toContain(item.text);
    expect((await ownItems()).find((i) => i.id === item.id)?.status).toBe("in_progress");

    // Room B follows a week later.
    await localSetChecklistItemRoomStatus(item.id, roomB, "done");

    expect(await boxTexts(roomB)).not.toContain(item.text);
    expect((await ownItems()).find((i) => i.id === item.id)?.status).toBe("done");
  });

  it("brings a task back into view if a room is reopened after being ticked", async () => {
    const { roomA } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ตรวจสายล่อฟ้า`, roomIds: [roomA] });

    await localSetChecklistItemRoomStatus(item.id, roomA, "done");
    expect(await boxTexts(roomA)).not.toContain(item.text);

    // Ticked off by mistake — set back to in progress and it must reappear.
    await localSetChecklistItemRoomStatus(item.id, roomA, "in_progress");
    expect(await boxTexts(roomA)).toContain(item.text);
  });
});

describe("Scenario: breaking a task into steps (specs/029-checklist-subitems)", () => {
  it("tracks the parent from its steps and clears the box only when all are done", async () => {
    const { roomA } = rooms();
    const parent = await localAddChecklistItem({ text: `${prefix} งานผนังกันไฟ`, roomIds: [roomA] });
    const subOne = await localAddChecklistItem({ text: `${prefix} ก่ออิฐ`, roomIds: [], parentId: parent.id });
    const subTwo = await localAddChecklistItem({ text: `${prefix} ฉาบปูน`, roomIds: [], parentId: parent.id });

    // Both steps are open, so the room still shows the parent with both under it.
    const initial = (await localGetRoomChecklistItems(roomA)).find((i) => i.id === parent.id);
    expect(initial?.sub_items.map((s) => s.text)).toEqual(
      expect.arrayContaining([subOne.text, subTwo.text])
    );

    // First step done: it leaves the nested list, the parent stays put.
    await localSetChecklistItemStatus(subOne.id, "done");
    const midway = (await localGetRoomChecklistItems(roomA)).find((i) => i.id === parent.id);
    expect(midway?.sub_items.map((s) => s.text)).toEqual([subTwo.text]);
    expect((await ownItems()).find((i) => i.id === parent.id)?.status).toBe("in_progress");

    // Second step done: the parent rolls up to done on its own.
    await localSetChecklistItemStatus(subTwo.id, "done");
    expect((await ownItems()).find((i) => i.id === parent.id)?.status).toBe("done");
  });

  it("closes out every step when the whole task is marked done from the top", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานหลังคา`, roomIds: [] });
    await localAddChecklistItem({ text: `${prefix} วางโครง`, roomIds: [], parentId: parent.id });
    await localAddChecklistItem({ text: `${prefix} มุงกระเบื้อง`, roomIds: [], parentId: parent.id });

    await localSetChecklistItemStatus(parent.id, "done");

    const stored = (await ownItems()).find((i) => i.id === parent.id);
    expect(stored?.status).toBe("done");
    expect(stored?.sub_items.every((s) => s.status === "done")).toBe(true);
  });

  it("removes the steps along with the task when the task is deleted", async () => {
    const parent = await localAddChecklistItem({ text: `${prefix} งานที่ยกเลิก`, roomIds: [] });
    const sub = await localAddChecklistItem({ text: `${prefix} ขั้นตอนย่อย`, roomIds: [], parentId: parent.id });

    await localDeleteChecklistItem(parent.id);

    const remaining = (await ownItems()).flatMap((i) => [i.id, ...i.sub_items.map((s) => s.id)]);
    expect(remaining).not.toContain(parent.id);
    expect(remaining).not.toContain(sub.id);
  });
});

describe("Scenario: a task's scope changes mid-flight (specs/032-checklist-detail-status-colors)", () => {
  it("restarts progress when a new room joins a partly-finished task", async () => {
    const { roomA, roomB } = rooms();
    const item = await localAddChecklistItem({ text: `${prefix} ตรวจพื้น`, roomIds: [roomA] });
    await localSetChecklistItemRoomStatus(item.id, roomA, "done");
    expect(await boxTexts(roomA)).not.toContain(item.text);

    // Re-tagging replaces the room set wholesale, so room A's earlier tick
    // doesn't silently carry over onto the new, wider scope.
    await localEditChecklistItem(item.id, { roomIds: [roomA, roomB] });

    expect(await boxTexts(roomA)).toContain(item.text);
    expect(await boxTexts(roomB)).toContain(item.text);
    expect((await ownItems()).find((i) => i.id === item.id)?.status).toBe("todo");
  });

  it("carries the detail and due date through an edit that only changes the text", async () => {
    const item = await localAddChecklistItem({
      text: `${prefix} ตรวจระบบไฟ`,
      roomIds: [],
      detail: "ตามข้อกำหนดกรมโรงงาน",
      dueDate: "2026-12-01",
    });

    await localEditChecklistItem(item.id, { text: `${prefix} ตรวจระบบไฟและสายล่อฟ้า` });

    const stored = (await ownItems()).find((i) => i.id === item.id);
    expect(stored?.text).toBe(`${prefix} ตรวจระบบไฟและสายล่อฟ้า`);
    expect(stored?.detail).toBe("ตามข้อกำหนดกรมโรงงาน");
    expect(stored?.due_date).toBe("2026-12-01");
  });
});
