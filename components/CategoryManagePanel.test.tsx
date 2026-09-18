/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

const createCategory = vi.fn();
const renameCategory = vi.fn();
vi.mock("@/app/actions/document-taxonomy", () => ({
  createCategory: (...a: unknown[]) => createCategory(...a),
  renameCategory: (...a: unknown[]) => renameCategory(...a),
  moveCategory: vi.fn(),
  deleteCategory: vi.fn(),
  deleteGroup: vi.fn(),
}));
const setCategoryDescription = vi.fn();
vi.mock("@/app/actions/group-requirements", () => ({
  addRequirement: vi.fn(),
  updateRequirement: vi.fn(),
  deleteRequirement: vi.fn(),
  moveRequirement: vi.fn(),
  setGroupDescription: vi.fn(),
  setCategoryDescription: (...a: unknown[]) => setCategoryDescription(...a),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

const { CategoryManagePanel } = await import("@/components/CategoryManagePanel");
const { ManageModeProvider, ManageModeToggle } = await import("@/components/ManageModeProvider");

const CATEGORIES: DocumentCategory[] = [
  { id: "c1", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1 },
  { id: "c2", slug: "safety", name_th: "หมวดที่ 4 ความปลอดภัย", emoji: "🦺", sort_order: 2 },
];
const GROUPS: DocumentGroup[] = [];

function renderPanel(canManage = true) {
  return render(
    <ManageModeProvider canManage={canManage}>
      <ManageModeToggle />
      <CategoryManagePanel
        categories={CATEGORIES}
        documentCounts={{ c1: 31, c2: 0 }}
        allGroups={GROUPS}
      />
    </ManageModeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  createCategory.mockResolvedValue({ ok: true, data: CATEGORIES[0] });
});

describe("finding the add-category control", () => {
  it("hides the whole panel until management mode is switched on", () => {
    renderPanel();
    expect(screen.queryByPlaceholderText(/เพิ่มหมวดใหญ่/)).not.toBeInTheDocument();
    expect(screen.queryByText("หมวดใหญ่")).not.toBeInTheDocument();
  });

  it("shows the panel, every category, and the add field once it is on", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    expect(screen.getByText("หมวดใหญ่")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหมวด หมวดที่ 1 โครงสร้างอาคาร")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เพิ่ม" })).toBeInTheDocument();
  });

  it("keeps the add button disabled until a name is typed", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    expect(screen.getByRole("button", { name: "เพิ่ม" })).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวดที่ 6 เอกสารอื่น");
    expect(screen.getByRole("button", { name: "เพิ่ม" })).toBeEnabled();
  });

  it("creates the category with the typed name and the chosen icon", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวดที่ 6 เอกสารอื่น");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    expect(createCategory).toHaveBeenCalledWith({
      nameTh: "หมวดที่ 6 เอกสารอื่น",
      emoji: expect.any(String),
    });
  });

  it("offers an icon to pick for a new category, instead of one default for all", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    await user.click(screen.getByLabelText("เลือกไอคอนของหมวดใหม่"));
    expect(await screen.findByLabelText("🦺")).toBeInTheDocument();
    expect(screen.getByLabelText("🧯")).toBeInTheDocument();
  });

  it("creates with whichever icon was picked", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    await user.click(screen.getByLabelText("เลือกไอคอนของหมวดใหม่"));
    await user.click(await screen.findByLabelText("🧯"));
    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวดดับเพลิง");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    expect(createCategory).toHaveBeenCalledWith({ nameTh: "หมวดดับเพลิง", emoji: "🧯" });
  });

  it("lets an existing category's icon be changed on the spot", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    await user.click(screen.getByLabelText("เปลี่ยนไอคอนของ หมวดที่ 1 โครงสร้างอาคาร"));
    await user.click(await screen.findByLabelText("🧱"));

    expect(renameCategory).toHaveBeenCalledWith({ id: "c1", emoji: "🧱" });
  });

  it("shows each category's file count, so a delete can be judged", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    expect(screen.getByText("31 ไฟล์")).toBeInTheDocument();
    expect(screen.getByText("0 ไฟล์")).toBeInTheDocument();
  });

  it("offers a viewer no way in at all", () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: /จัดการหมวด/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/เพิ่มหมวดใหญ่/)).not.toBeInTheDocument();
  });
});

// specs/045-automate-manual-checks — specs/040 quickstart Scenario 11, which
// asked for the dev server to be killed mid-edit. What it is really checking is
// that a refused write is said out loud and the name on screen goes back to the
// one that is actually stored (Constitution V, FR-022).
describe("a rename that the server refuses", () => {
  async function renameFirstCategory(user: ReturnType<typeof userEvent.setup>) {
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    const field = screen.getByLabelText(`ชื่อหมวด ${CATEGORIES[0].name_th}`);
    await user.clear(field);
    await user.type(field, "ชื่อใหม่ที่จะถูกปฏิเสธ");
    await user.tab();
    return field;
  }

  it("says why it failed instead of leaving the new name sitting there", async () => {
    const user = userEvent.setup();
    renameCategory.mockResolvedValue({ ok: false, error: "บันทึกไม่สำเร็จ" });

    const field = await renameFirstCategory(user);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("บันทึกไม่สำเร็จ"));
    // Back to the stored name — never left showing an edit that did not save.
    await waitFor(() => expect(field).toHaveValue(CATEGORIES[0].name_th));
  });

  it("keeps the new name when the write succeeds", async () => {
    const user = userEvent.setup();
    renameCategory.mockResolvedValue({ ok: true });

    const field = await renameFirstCategory(user);

    await waitFor(() => expect(renameCategory).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
    expect(field).toHaveValue("ชื่อใหม่ที่จะถูกปฏิเสธ");
  });
});

// specs/046-subgroup-requirement-checklist FR-008/FR-011.
describe("a category's description", () => {
  it("can be written in management mode and is saved for that category", async () => {
    const user = userEvent.setup();
    setCategoryDescription.mockResolvedValue({ ok: true, data: { id: "c1", description: "x" } });
    renderPanel();

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    const field = screen.getByLabelText(`คำอธิบายของ ${CATEGORIES[0].name_th}`);
    await user.type(field, "ชุดเอกสารยื่นขออนุญาต");
    await user.tab();

    await waitFor(() =>
      expect(setCategoryDescription).toHaveBeenCalledWith({ categoryId: "c1", description: "ชุดเอกสารยื่นขออนุญาต" })
    );
  });

  it("is not offered outside management mode", () => {
    renderPanel();
    expect(screen.queryByLabelText(`คำอธิบายของ ${CATEGORIES[0].name_th}`)).not.toBeInTheDocument();
  });
});
