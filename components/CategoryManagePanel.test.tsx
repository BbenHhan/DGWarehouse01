/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

const createCategory = vi.fn();
vi.mock("@/app/actions/document-taxonomy", () => ({
  createCategory: (...a: unknown[]) => createCategory(...a),
  renameCategory: vi.fn(),
  moveCategory: vi.fn(),
  deleteCategory: vi.fn(),
  deleteGroup: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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

  it("creates the category with the typed name", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวดที่ 6 เอกสารอื่น");
    await user.click(screen.getByRole("button", { name: "เพิ่ม" }));

    expect(createCategory).toHaveBeenCalledWith({ nameTh: "หมวดที่ 6 เอกสารอื่น" });
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
