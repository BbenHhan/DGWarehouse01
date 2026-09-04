/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChecklistItem } from "@/lib/types";
import type { ChecklistStatus } from "@/lib/checklist-status";

// The component calls Server Actions directly. Those can't run in a test
// process (no request scope, no Supabase), so the whole module is mocked —
// what's under test here is the box's own rendering and optimistic behavior,
// not the actions, which lib/local/checklist-store.test.ts covers for real.
const addChecklistItem = vi.fn();
const setChecklistItemStatus = vi.fn();
const setChecklistItemRoomStatus = vi.fn();

vi.mock("@/app/actions/checklist", () => ({
  addChecklistItem: (...args: unknown[]) => addChecklistItem(...args),
  setChecklistItemStatus: (...args: unknown[]) => setChecklistItemStatus(...args),
  setChecklistItemRoomStatus: (...args: unknown[]) => setChecklistItemRoomStatus(...args),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

const { RoomChecklistBox } = await import("@/components/RoomChecklistBox");

const ROOM_ID = "room-uuid-1";
const ROOM_SLUG = "hong-raek";
const ROOM_NAME = "ห้องแรก";
const ROOM_EMOJI = "🏠";

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "item-1",
    text: "ติดป้ายทางออกฉุกเฉิน",
    detail: null,
    status: "todo" as ChecklistStatus,
    start_date: null,
    due_date: null,
    room_ids: [ROOM_ID],
    room_statuses: [{ room_id: ROOM_ID, status: "todo" }],
    parent_id: null,
    sub_items: [],
    created_at: "2026-08-21T10:00:00.000Z",
    updated_at: "2026-08-21T10:00:00.000Z",
    ...overrides,
  };
}

function renderBox(items: ChecklistItem[], canEdit = true) {
  return render(
    <RoomChecklistBox
      roomId={ROOM_ID}
      roomSlug={ROOM_SLUG}
      roomName={ROOM_NAME}
      roomEmoji={ROOM_EMOJI}
      items={items}
      canEdit={canEdit}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RoomChecklistBox rendering", () => {
  it("always shows the box heading", () => {
    renderBox([]);
    expect(screen.getByText("เช็คลิสต์ห้องนี้")).toBeInTheDocument();
  });

  it("shows an empty-state line when the room has nothing outstanding", () => {
    renderBox([]);
    expect(screen.getByText("ไม่มีรายการค้างอยู่")).toBeInTheDocument();
  });

  it("lists each outstanding item's text", () => {
    renderBox([makeItem(), makeItem({ id: "item-2", text: "ตรวจถังดับเพลิง" })]);

    expect(screen.getByText("ติดป้ายทางออกฉุกเฉิน")).toBeInTheDocument();
    expect(screen.getByText("ตรวจถังดับเพลิง")).toBeInTheDocument();
    expect(screen.queryByText("ไม่มีรายการค้างอยู่")).not.toBeInTheDocument();
  });

  it("shows a due date in Thai Buddhist-year form when one is set", () => {
    renderBox([makeItem({ due_date: "2026-09-30" })]);
    expect(screen.getByText("ครบกำหนด 30 ก.ย. 2569")).toBeInTheDocument();
  });

  it("shows no due-date line when the item has no due date", () => {
    renderBox([makeItem()]);
    expect(screen.queryByText(/ครบกำหนด/)).not.toBeInTheDocument();
  });

  it("gives every row a status control labelled with its own item text", () => {
    renderBox([makeItem()]);
    expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeInTheDocument();
  });

  it("renders sub-items nested under their parent, each with its own status control", () => {
    renderBox([
      makeItem({
        sub_items: [makeItem({ id: "sub-1", text: "ก่ออิฐ", parent_id: "item-1" })],
      }),
    ]);

    expect(screen.getByText("ก่ออิฐ")).toBeInTheDocument();
    expect(screen.getByLabelText("สถานะของ ก่ออิฐ")).toBeInTheDocument();
  });

  it("shows the current status on the control", () => {
    renderBox([makeItem({ status: "in_progress" })]);
    expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toHaveTextContent("กำลังทำ");
  });
});

describe("RoomChecklistBox edit permissions", () => {
  it("offers the quick-add form to an editor", () => {
    renderBox([]);
    expect(screen.getByPlaceholderText("เพิ่มรายการด่วน...")).toBeInTheDocument();
  });

  it("hides the quick-add form from a view-only user", () => {
    renderBox([], false);
    expect(screen.queryByPlaceholderText("เพิ่มรายการด่วน...")).not.toBeInTheDocument();
  });

  it("hides the add-sub form from a view-only user", () => {
    renderBox([makeItem()], false);
    expect(screen.queryByPlaceholderText("เพิ่ม sub...")).not.toBeInTheDocument();
  });

  it("disables the status control for a view-only user", () => {
    renderBox([makeItem()], false);
    expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeDisabled();
  });

  it("leaves the status control usable for an editor", () => {
    renderBox([makeItem()]);
    expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeEnabled();
  });
});

describe("RoomChecklistBox quick-add", () => {
  it("keeps the add button disabled until something is typed", async () => {
    const user = userEvent.setup();
    renderBox([]);

    const button = screen.getByRole("button", { name: "เพิ่ม" });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText("เพิ่มรายการด่วน..."), "ตรวจไฟฉุกเฉิน");
    expect(button).toBeEnabled();
  });

  it("tags a quick-added item to the room the box belongs to", async () => {
    const user = userEvent.setup();
    addChecklistItem.mockResolvedValue({ ok: true, data: makeItem({ id: "new-1", text: "ตรวจไฟฉุกเฉิน" }) });

    renderBox([]);
    await user.type(screen.getByPlaceholderText("เพิ่มรายการด่วน..."), "ตรวจไฟฉุกเฉิน");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => {
      expect(addChecklistItem).toHaveBeenCalledWith(
        expect.objectContaining({ text: "ตรวจไฟฉุกเฉิน", roomIds: [ROOM_ID] })
      );
    });
  });

  it("empties the input once the add succeeds, ready for the next item", async () => {
    const user = userEvent.setup();
    addChecklistItem.mockResolvedValue({ ok: true, data: makeItem({ id: "new-1", text: "ตรวจไฟฉุกเฉิน" }) });

    renderBox([]);
    const input = screen.getByPlaceholderText("เพิ่มรายการด่วน...");
    await user.type(input, "ตรวจไฟฉุกเฉิน");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("keeps what was typed when the add is rejected, so nothing is lost", async () => {
    const user = userEvent.setup();
    addChecklistItem.mockResolvedValue({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });

    renderBox([]);
    const input = screen.getByPlaceholderText("เพิ่มรายการด่วน...");
    await user.type(input, "ตรวจไฟฉุกเฉิน");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(input).toHaveValue("ตรวจไฟฉุกเฉิน");
  });

  it("trims whitespace off the text before sending it", async () => {
    const user = userEvent.setup();
    addChecklistItem.mockResolvedValue({ ok: true, data: makeItem({ id: "new-2", text: "ทาสี" }) });

    renderBox([]);
    await user.type(screen.getByPlaceholderText("เพิ่มรายการด่วน..."), "   ทาสี   ");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => {
      expect(addChecklistItem).toHaveBeenCalledWith(expect.objectContaining({ text: "ทาสี" }));
    });
  });

  it("surfaces a rejected add as a toast instead of failing silently", async () => {
    const user = userEvent.setup();
    addChecklistItem.mockResolvedValue({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });

    renderBox([]);
    await user.type(screen.getByPlaceholderText("เพิ่มรายการด่วน..."), "ตรวจไฟฉุกเฉิน");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("คุณไม่มีสิทธิ์ทำรายการนี้");
    });
  });
});

describe("RoomChecklistBox optimistic status changes", () => {
  it("drops a row out of the box the moment it's marked done, before the server replies", async () => {
    const user = userEvent.setup();
    // Held open so the assertion lands while the request is still in flight —
    // that pending window is the whole point of the optimistic update.
    let settle: (result: { ok: true }) => void = () => {};
    setChecklistItemRoomStatus.mockImplementation(
      () => new Promise((resolve) => { settle = resolve as typeof settle; })
    );

    renderBox([makeItem()]);
    await user.click(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน"));
    await user.click(await screen.findByRole("option", { name: "เสร็จแล้ว" }));

    await waitFor(() => {
      expect(screen.queryByText("ติดป้ายทางออกฉุกเฉิน")).not.toBeInTheDocument();
    });
    expect(screen.getByText("ไม่มีรายการค้างอยู่")).toBeInTheDocument();

    settle({ ok: true });
  });

  it("writes only this room's own tag, never the item's overall status", async () => {
    const user = userEvent.setup();
    setChecklistItemRoomStatus.mockResolvedValue({ ok: true });

    renderBox([makeItem()]);
    await user.click(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน"));
    await user.click(await screen.findByRole("option", { name: "กำลังทำ" }));

    await waitFor(() => {
      expect(setChecklistItemRoomStatus).toHaveBeenCalledWith("item-1", ROOM_ID, "in_progress");
    });
    expect(setChecklistItemStatus).not.toHaveBeenCalled();
  });

  it("falls back to the item-level status for an untagged sub-item", async () => {
    const user = userEvent.setup();
    setChecklistItemStatus.mockResolvedValue({ ok: true });

    renderBox([
      makeItem({
        sub_items: [
          makeItem({ id: "sub-1", text: "ก่ออิฐ", parent_id: "item-1", room_ids: [], room_statuses: [] }),
        ],
      }),
    ]);
    await user.click(screen.getByLabelText("สถานะของ ก่ออิฐ"));
    await user.click(await screen.findByRole("option", { name: "กำลังทำ" }));

    await waitFor(() => {
      expect(setChecklistItemStatus).toHaveBeenCalledWith("sub-1", "in_progress");
    });
  });
});

// specs/041-complete-loading-states FR-004: the box used to share one
// transition across every row, so writing any row's status disabled all of
// them. That is worse than showing nothing — it says something is happening
// to rows that nothing is happening to.
describe("RoomChecklistBox busy scoping", () => {
  it("marks only the row being written", async () => {
    const user = userEvent.setup();
    let finishWrite: (result: { ok: true }) => void = () => {};
    setChecklistItemRoomStatus.mockReturnValue(
      new Promise<{ ok: true }>((resolve) => {
        finishWrite = resolve;
      })
    );

    renderBox([makeItem(), makeItem({ id: "item-2", text: "ตรวจถังดับเพลิง" })]);

    await user.click(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน"));
    await user.click(await screen.findByRole("option", { name: "กำลังทำ" }));

    await waitFor(() =>
      expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeDisabled()
    );
    expect(screen.getByLabelText("สถานะของ ตรวจถังดับเพลิง")).toBeEnabled();

    finishWrite({ ok: true });
    await waitFor(() =>
      expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeEnabled()
    );
  });

  it("leaves the quick-add form usable while a status is being written", async () => {
    const user = userEvent.setup();
    setChecklistItemRoomStatus.mockReturnValue(new Promise(() => {}));

    renderBox([makeItem()]);

    await user.click(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน"));
    await user.click(await screen.findByRole("option", { name: "กำลังทำ" }));

    await waitFor(() =>
      expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeDisabled()
    );
    expect(screen.getByPlaceholderText("เพิ่มรายการด่วน...")).toBeEnabled();
  });
});

// spec 042 FR-009: the account holder asked for the room to be named here too,
// so a row never leans on the page heading to say what it is about.
describe("RoomChecklistBox names its room", () => {
  it("names the room on a top-level row", () => {
    renderBox([makeItem()]);
    expect(screen.getAllByText(ROOM_NAME).length).toBeGreaterThan(0);
  });

  it("names the room on a sub-item row too", () => {
    renderBox([
      makeItem({
        sub_items: [
          {
            ...makeItem({ id: "sub-1", text: "ตรวจไฟฉุกเฉิน" }),
            parent_id: "item-1",
          },
        ],
      }),
    ]);

    // One for the parent row, one for the sub-item row.
    expect(screen.getAllByText(ROOM_NAME)).toHaveLength(2);
  });

  it("names the room on every row when there are several", () => {
    renderBox([makeItem(), makeItem({ id: "item-2", text: "ตรวจถังดับเพลิง" })]);
    expect(screen.getAllByText(ROOM_NAME)).toHaveLength(2);
  });
});

// specs/043: an entry can now reach this page through a sub-item rather than a
// tag of its own. It has no per-room record here, so a control would write
// nowhere — its status is shown instead.
describe("RoomChecklistBox: an entry reached through its sub-items", () => {
  function untaggedParent() {
    return makeItem({
      text: "ตรวจระบบดับเพลิงทั้งโกดัง",
      room_ids: [],
      room_statuses: [],
      status: "in_progress" as ChecklistStatus,
      sub_items: [
        { ...makeItem({ id: "sub-1", text: "ตรวจถังดับเพลิง" }), parent_id: "item-1" },
      ],
    });
  }

  it("shows its status", () => {
    renderBox([untaggedParent()]);
    expect(screen.getByText("กำลังทำ")).toBeInTheDocument();
  });

  it("offers no status control for it, since there is none to write here", () => {
    renderBox([untaggedParent()]);
    expect(
      screen.queryByLabelText("สถานะของ ตรวจระบบดับเพลิงทั้งโกดัง")
    ).not.toBeInTheDocument();
  });

  it("still offers the control for an entry tagged to this room", () => {
    renderBox([makeItem()]);
    expect(screen.getByLabelText("สถานะของ ติดป้ายทางออกฉุกเฉิน")).toBeInTheDocument();
  });

  it("still offers a control for the sub-item beneath it", () => {
    renderBox([untaggedParent()]);
    expect(screen.getByLabelText("สถานะของ ตรวจถังดับเพลิง")).toBeInTheDocument();
  });
});
