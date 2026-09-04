/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChecklistItem, Room } from "@/lib/types";
import type { ChecklistStatus } from "@/lib/checklist-status";

const setChecklistItemStatus = vi.fn();
const setChecklistItemRoomStatus = vi.fn();
vi.mock("@/app/actions/checklist", () => ({
  addChecklistItem: vi.fn(),
  editChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  setChecklistItemStatus: (...a: unknown[]) => setChecklistItemStatus(...a),
  setChecklistItemRoomStatus: (...a: unknown[]) => setChecklistItemRoomStatus(...a),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { ChecklistList } = await import("@/components/ChecklistList");

const ROOMS: Room[] = [
  { id: "room-1", slug: "hong-raek", name_th: "ห้องแรก", emoji: "🏠", sort_order: 1 },
  { id: "room-2", slug: "hong-song", name_th: "ห้องสอง", emoji: "🏭", sort_order: 2 },
];

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  const roomIds = overrides.room_ids ?? [];
  return {
    id: "item-1",
    text: "ติดป้ายทางออกฉุกเฉิน",
    detail: null,
    status: "todo" as ChecklistStatus,
    start_date: null,
    due_date: null,
    room_ids: roomIds,
    room_statuses: roomIds.map((id) => ({ room_id: id, status: "todo" as ChecklistStatus })),
    parent_id: null,
    sub_items: [],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderList(items: ChecklistItem[]) {
  return render(<ChecklistList items={items} rooms={ROOMS} canEdit />);
}

function rowFor(text: string) {
  const row = screen.getByText(text).closest("div.rounded-xl");
  if (!row) throw new Error(`no row for ${text}`);
  return row as HTMLElement;
}

beforeEach(() => vi.clearAllMocks());

// spec 042: an item tagged to one room used to show its room only as a colour
// tint on the status control, while a multi-room item named every room. Colour
// alone does not say which room (FR-006).
describe("a checklist item names every room it is tagged to", () => {
  it("names the room of an item tagged to exactly one", () => {
    renderList([makeItem({ room_ids: ["room-1"] })]);
    expect(within(rowFor("ติดป้ายทางออกฉุกเฉิน")).getByText("ห้องแรก")).toBeInTheDocument();
  });

  it("still names every room of an item tagged to several", () => {
    renderList([makeItem({ room_ids: ["room-1", "room-2"] })]);
    const row = within(rowFor("ติดป้ายทางออกฉุกเฉิน"));
    expect(row.getByText("ห้องแรก")).toBeInTheDocument();
    expect(row.getByText("ห้องสอง")).toBeInTheDocument();
  });

  // FR-008 / SC-005: the badge must not be an accidental signal about how many
  // rooms an item has.
  it("gives a one-room item the same overall-status badge a multi-room item has", () => {
    renderList([
      makeItem({ id: "one", text: "รายการห้องเดียว", room_ids: ["room-1"] }),
      makeItem({ id: "many", text: "รายการหลายห้อง", room_ids: ["room-1", "room-2"] }),
    ]);

    for (const text of ["รายการห้องเดียว", "รายการหลายห้อง"]) {
      expect(within(rowFor(text)).getAllByText("ยังไม่เริ่ม").length).toBeGreaterThan(0);
    }
  });

  // FR-004: an item with no rooms has none to name and keeps its bare control.
  it("leaves an item with no rooms alone", () => {
    renderList([makeItem({ room_ids: [] })]);
    const row = within(rowFor("ติดป้ายทางออกฉุกเฉิน"));
    expect(row.queryByText("ห้องแรก")).not.toBeInTheDocument();
    expect(row.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeInTheDocument();
  });
});

// FR-003: the refactor collapsed two renderings into one, and the risk it
// carries is writing a status to the wrong room.
describe("naming the room does not change where a status is written", () => {
  it("writes a one-room item's status to that room", async () => {
    const user = userEvent.setup();
    setChecklistItemRoomStatus.mockResolvedValue({ ok: true });

    renderList([makeItem({ room_ids: ["room-1"] })]);

    await user.click(screen.getByLabelText("สถานะของ ห้องแรก"));
    await user.click(await screen.findByRole("option", { name: "กำลังทำ" }));

    await waitFor(() =>
      expect(setChecklistItemRoomStatus).toHaveBeenCalledWith("item-1", "room-1", "in_progress")
    );
    expect(setChecklistItemStatus).not.toHaveBeenCalled();
  });

  it("writes a no-room item's status to the item itself", async () => {
    const user = userEvent.setup();
    setChecklistItemStatus.mockResolvedValue({ ok: true });

    renderList([makeItem({ room_ids: [] })]);

    await user.click(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน"));
    await user.click(await screen.findByRole("option", { name: "เสร็จแล้ว" }));

    await waitFor(() =>
      expect(setChecklistItemStatus).toHaveBeenCalledWith("item-1", "done")
    );
    expect(setChecklistItemRoomStatus).not.toHaveBeenCalled();
  });
});
