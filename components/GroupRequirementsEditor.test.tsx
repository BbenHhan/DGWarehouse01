/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupRequirement } from "@/lib/types";

// specs/046-subgroup-requirement-checklist US2 — the editor's promises about
// what is on screen while a write is in flight and after it fails.

const addRequirement = vi.fn();
const updateRequirement = vi.fn();
const deleteRequirement = vi.fn();
const moveRequirement = vi.fn();
const setGroupDescription = vi.fn();
vi.mock("@/app/actions/group-requirements", () => ({
  addRequirement: (...a: unknown[]) => addRequirement(...a),
  updateRequirement: (...a: unknown[]) => updateRequirement(...a),
  deleteRequirement: (...a: unknown[]) => deleteRequirement(...a),
  moveRequirement: (...a: unknown[]) => moveRequirement(...a),
  setGroupDescription: (...a: unknown[]) => setGroupDescription(...a),
  setCategoryDescription: vi.fn(),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

const { GroupRequirementsEditor } = await import("@/components/GroupRequirementsEditor");
const { ManageModeProvider } = await import("@/components/ManageModeProvider");

const ITEMS: GroupRequirement[] = [
  { id: "r1", group_id: "g1", name_th: "ใบรับรอง Emergency Shower", status: "missing", note: null, sort_order: 1 },
  { id: "r2", group_id: "g1", name_th: "สเปกพัดลม", status: "have", note: "BPS-60", sort_order: 2 },
];

function renderEditor(description: string | null = null) {
  return render(
    <ManageModeProvider canManage>
      <GroupRequirementsEditor groupId="g1" groupName="ใบรับรองและสเปก" description={description} items={ITEMS} />
    </ManageModeProvider>
  );
}

function statusButton(itemName: string, label: string) {
  const group = screen.getByRole("group", { name: `สถานะของ ${itemName}` });
  return within(group).getByRole("button", { name: label });
}

// A save that is still in flight when a test ends must be finished before the
// next one starts. React 19 entangles overlapping async transitions: optimistic
// state is only released once every one of them settles, so a promise left
// hanging here would silently stop the next test's rollback from happening.
const unfinished: Array<() => void> = [];
function inFlight() {
  let finish!: (value: { ok: true; data: object }) => void;
  const promise = new Promise((resolve) => (finish = resolve));
  unfinished.push(() => finish({ ok: true, data: {} }));
  return promise;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  while (unfinished.length) unfinished.pop()!();
  await Promise.resolve();
});

describe("changing a status", () => {
  it("marks the chosen status pressed, and only that one", () => {
    renderEditor();
    expect(statusButton("ใบรับรอง Emergency Shower", "ยังขาด")).toHaveAttribute("aria-pressed", "true");
    expect(statusButton("ใบรับรอง Emergency Shower", "มีแล้ว")).toHaveAttribute("aria-pressed", "false");
    expect(statusButton("ใบรับรอง Emergency Shower", "รอ")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the new status before the server answers", async () => {
    const user = userEvent.setup();
    updateRequirement.mockImplementation(inFlight);
    renderEditor();

    await user.click(statusButton("ใบรับรอง Emergency Shower", "มีแล้ว"));

    expect(updateRequirement).toHaveBeenCalledWith({ id: "r1", status: "have" });
    expect(statusButton("ใบรับรอง Emergency Shower", "มีแล้ว")).toHaveAttribute("aria-pressed", "true");
  });

  // FR-014, SC-005: never left showing a state that was not stored.
  it("goes back to the stored status and says why when saving fails", async () => {
    const user = userEvent.setup();
    updateRequirement.mockResolvedValue({ ok: false, error: "บันทึกไม่สำเร็จ" });
    renderEditor();

    await user.click(statusButton("ใบรับรอง Emergency Shower", "รอ"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("บันทึกไม่สำเร็จ"));
    await waitFor(() =>
      expect(statusButton("ใบรับรอง Emergency Shower", "ยังขาด")).toHaveAttribute("aria-pressed", "true")
    );
  });

  it("does not write when the status tapped is already the current one", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(statusButton("สเปกพัดลม", "มีแล้ว"));
    expect(updateRequirement).not.toHaveBeenCalled();
  });
});

describe("deleting an item", () => {
  it("removes it from view at once", async () => {
    const user = userEvent.setup();
    deleteRequirement.mockImplementation(inFlight);
    renderEditor();

    await user.click(screen.getByRole("button", { name: "ลบรายการ สเปกพัดลม" }));

    expect(deleteRequirement).toHaveBeenCalledWith({ id: "r2" });
    expect(screen.queryByRole("group", { name: "สถานะของ สเปกพัดลม" })).not.toBeInTheDocument();
  });

  it("brings it back and reports the failure when the delete is refused", async () => {
    const user = userEvent.setup();
    deleteRequirement.mockResolvedValue({ ok: false, error: "ลบรายการไม่สำเร็จ" });
    renderEditor();

    await user.click(screen.getByRole("button", { name: "ลบรายการ สเปกพัดลม" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("ลบรายการไม่สำเร็จ"));
    expect(await screen.findByRole("group", { name: "สถานะของ สเปกพัดลม" })).toBeInTheDocument();
  });
});

describe("adding an item", () => {
  it("keeps the add button disabled until something is typed", async () => {
    const user = userEvent.setup();
    renderEditor();
    const button = screen.getByRole("button", { name: "เพิ่ม" });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("เพิ่มรายการที่ต้องมีใน ใบรับรองและสเปก"), "   ");
    expect(button).toBeDisabled();
  });

  it("sends the trimmed name to this sub-group and clears the field on success", async () => {
    const user = userEvent.setup();
    addRequirement.mockResolvedValue({ ok: true, data: {} });
    renderEditor();

    const field = screen.getByLabelText("เพิ่มรายการที่ต้องมีใน ใบรับรองและสเปก");
    await user.type(field, "  ผลดันเทสสปริงเกลอร์ ");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    expect(addRequirement).toHaveBeenCalledWith({ groupId: "g1", nameTh: "ผลดันเทสสปริงเกลอร์" });
    await waitFor(() => expect(field).toHaveValue(""));
  });

  it("keeps what was typed when the add is refused", async () => {
    const user = userEvent.setup();
    addRequirement.mockResolvedValue({ ok: false, error: "กรุณาระบุชื่อรายการ" });
    renderEditor();

    const field = screen.getByLabelText("เพิ่มรายการที่ต้องมีใน ใบรับรองและสเปก");
    await user.type(field, "รายการใหม่");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("กรุณาระบุชื่อรายการ"));
    expect(field).toHaveValue("รายการใหม่");
  });
});

describe("editing text", () => {
  it("saves a changed note for that item", async () => {
    const user = userEvent.setup();
    updateRequirement.mockResolvedValue({ ok: true, data: {} });
    renderEditor();

    const note = screen.getByLabelText("หมายเหตุของ ใบรับรอง Emergency Shower");
    await user.type(note, "รอผู้รับเหมาส่ง");
    fireEvent.blur(note);

    expect(updateRequirement).toHaveBeenCalledWith({ id: "r1", note: "รอผู้รับเหมาส่ง" });
  });

  // FR-012: clearing a description is a real edit, stored as none.
  it("sends none when a description is cleared to spaces", async () => {
    const user = userEvent.setup();
    setGroupDescription.mockResolvedValue({ ok: true, data: {} });
    renderEditor("ใบรับรองของวัสดุ");

    const field = screen.getByLabelText("คำอธิบายของ ใบรับรองและสเปก");
    await user.clear(field);
    await user.type(field, "   ");
    fireEvent.blur(field);

    expect(setGroupDescription).toHaveBeenCalledWith({ groupId: "g1", description: null });
  });

  it("does not write when the text did not change", () => {
    renderEditor("ใบรับรองของวัสดุ");
    fireEvent.blur(screen.getByLabelText("คำอธิบายของ ใบรับรองและสเปก"));
    expect(setGroupDescription).not.toHaveBeenCalled();
  });
});
