/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

const deleteGroup = vi.fn();
const deleteCategory = vi.fn();

vi.mock("@/app/actions/document-taxonomy", () => ({
  deleteGroup: (...args: unknown[]) => deleteGroup(...args),
  deleteCategory: (...args: unknown[]) => deleteCategory(...args),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const { DeleteTaxonomyDialog } = await import("@/components/DeleteTaxonomyDialog");

const CATEGORIES: DocumentCategory[] = [
  { id: "cat-1", slug: "structure", name_th: "หมวดที่ 1", emoji: "🏗️", sort_order: 1 },
  { id: "cat-2", slug: "electrical", name_th: "หมวดที่ 2", emoji: "⚡", sort_order: 2 },
];
const GROUPS: DocumentGroup[] = [
  { id: "grp-1", category_id: "cat-1", name_th: "กลุ่มใน 1", sort_order: 1, document_count: 3 },
  { id: "grp-2", category_id: "cat-2", name_th: "กลุ่มใน 2", sort_order: 1, document_count: 0 },
];

function renderDialog(
  target: Parameters<typeof DeleteTaxonomyDialog>[0]["target"],
  documentCount: number
) {
  return render(
    <DeleteTaxonomyDialog
      target={target}
      documentCount={documentCount}
      categories={CATEGORIES}
      allGroups={GROUPS}
    />
  );
}

// Base UI opens a Select's listbox through a portal on the next animation
// frame. jsdom drives rAF off timers, so under a loaded parallel test run the
// popup can take longer than findBy's default second to appear — which made
// this file pass alone and fail intermittently in the full suite. Waiting
// explicitly, and only ever clicking the trigger once, keeps it deterministic
// without the retry-clicking that would toggle the popup shut again.
const POPUP = { timeout: 5000 };

async function openSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("combobox"));
  await screen.findAllByRole("option", undefined, POPUP);
}

const GROUP_TARGET = { kind: "group", id: "grp-1", name: "กลุ่มใน 1", categoryId: "cat-1" } as const;
const CATEGORY_TARGET = { kind: "category", id: "cat-1", name: "หมวดที่ 1" } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleting something empty", () => {
  it("asks once and sends the none disposition", async () => {
    const user = userEvent.setup();
    deleteGroup.mockResolvedValue({ ok: true, data: { id: "grp-1" } });

    renderDialog(GROUP_TARGET, 0);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await user.click(await screen.findByRole("button", { name: "ลบ" }));

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith({ id: "grp-1", documents: { kind: "none" } });
    });
  });

  it("never shows the destructive second step when there is nothing to destroy", async () => {
    const user = userEvent.setup();
    renderDialog(GROUP_TARGET, 0);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));

    expect(await screen.findByText(/ไม่มีไฟล์อยู่ข้างใน/)).toBeInTheDocument();
    expect(screen.queryByText(/จะถูกลบถาวร/)).not.toBeInTheDocument();
  });
});

describe("deleting something that holds documents", () => {
  it("states the count and offers moving before deleting", async () => {
    const user = userEvent.setup();
    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));

    expect(await screen.findByText(/มีไฟล์อยู่ 3 ไฟล์/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ลบไฟล์ทั้งหมดด้วย" })).toBeInTheDocument();
  });

  it("requires a destination before the move button becomes usable", async () => {
    const user = userEvent.setup();
    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));

    expect(await screen.findByRole("button", { name: /ย้าย 3 ไฟล์แล้วลบ/ })).toBeDisabled();
  });

  it("sends the move disposition with the chosen destination", async () => {
    const user = userEvent.setup();
    deleteGroup.mockResolvedValue({ ok: true, data: { id: "grp-1" } });

    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await openSelect(user);
    await user.click(await screen.findByRole("option", { name: /หมวดที่ 2/ }, POPUP));
    await user.click(screen.getByRole("button", { name: /ย้าย 3 ไฟล์แล้วลบ/ }));

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith({
        id: "grp-1",
        documents: { kind: "move", toCategoryId: "cat-2", toGroupId: null },
      });
    });
  });

  it("puts a second confirmation naming the count in front of destroying files", async () => {
    const user = userEvent.setup();
    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await user.click(await screen.findByRole("button", { name: "ลบไฟล์ทั้งหมดด้วย" }));

    expect(await screen.findByText(/ไฟล์ 3 ไฟล์จะถูกลบถาวร/)).toBeInTheDocument();
    // Reaching the second step must not have called anything yet.
    expect(deleteGroup).not.toHaveBeenCalled();
  });

  it("sends the count the user was actually shown", async () => {
    const user = userEvent.setup();
    deleteGroup.mockResolvedValue({ ok: true, data: { id: "grp-1" } });

    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await user.click(await screen.findByRole("button", { name: "ลบไฟล์ทั้งหมดด้วย" }));
    await user.click(await screen.findByRole("button", { name: "ลบ 3 ไฟล์" }));

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith({
        id: "grp-1",
        documents: { kind: "delete", confirmedCount: 3 },
      });
    });
  });

  it("backing out of the second step deletes nothing", async () => {
    const user = userEvent.setup();
    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await user.click(await screen.findByRole("button", { name: "ลบไฟล์ทั้งหมดด้วย" }));
    await user.click(await screen.findByRole("button", { name: "ย้อนกลับ" }));

    expect(await screen.findByText(/มีไฟล์อยู่ 3 ไฟล์/)).toBeInTheDocument();
    expect(deleteGroup).not.toHaveBeenCalled();
    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it("surfaces a server refusal instead of pretending it worked", async () => {
    const user = userEvent.setup();
    deleteGroup.mockResolvedValue({ ok: false, error: "จำนวนไฟล์เปลี่ยนไประหว่างยืนยัน" });

    renderDialog(GROUP_TARGET, 3);
    await user.click(screen.getByLabelText("ลบ กลุ่มใน 1"));
    await user.click(await screen.findByRole("button", { name: "ลบไฟล์ทั้งหมดด้วย" }));
    await user.click(await screen.findByRole("button", { name: "ลบ 3 ไฟล์" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("จำนวนไฟล์เปลี่ยนไประหว่างยืนยัน");
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe("destinations inside the thing being deleted", () => {
  it("never offers the category being deleted as its own destination", async () => {
    const user = userEvent.setup();
    renderDialog(CATEGORY_TARGET, 5);
    await user.click(screen.getByLabelText("ลบ หมวดที่ 1"));
    await openSelect(user);

    expect(screen.queryByRole("option", { name: /หมวดที่ 1/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /หมวดที่ 2/ })).toBeInTheDocument();
  });
});
