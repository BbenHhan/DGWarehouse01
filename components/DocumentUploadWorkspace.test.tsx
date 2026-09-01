/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

const uploadDoc = vi.fn();
vi.mock("@/app/actions/documents", () => ({ uploadDoc: (...a: unknown[]) => uploadDoc(...a) }));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

const { DocumentUploadWorkspace } = await import("@/components/DocumentUploadWorkspace");

const CATEGORIES: DocumentCategory[] = [
  { id: "cat-1", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1 },
  { id: "cat-4", slug: "safety", name_th: "หมวดที่ 4 ความปลอดภัย", emoji: "🦺", sort_order: 2 },
];

const GROUPS: DocumentGroup[] = [
  { id: "g-plan", category_id: "cat-1", name_th: "0. แปลนและแบบก่อสร้าง", sort_order: 1, document_count: 12 },
  { id: "g-floor", category_id: "cat-1", name_th: "1.1 งานพื้นอาคาร", sort_order: 2, document_count: 1 },
  { id: "g-alarm", category_id: "cat-4", name_th: "4.1 ระบบสัญญาณเตือนภัย", sort_order: 1, document_count: 0 },
  { id: "g-fire", category_id: "cat-4", name_th: "4.2 อุปกรณ์ดับเพลิง", sort_order: 2, document_count: 0 },
];

function file(name = "แปลนอาคาร.pdf") {
  return new File(["x"], name, { type: "application/pdf" });
}

function renderWorkspace() {
  return render(<DocumentUploadWorkspace categories={CATEGORIES} groups={GROUPS} />);
}

function dropIntoTray(files: File[]) {
  const zone = screen.getByTestId("workspace-drop-zone");
  const dataTransfer = { files, types: ["Files"] };
  fireEvent.dragOver(zone, { dataTransfer });
  fireEvent.drop(zone, { dataTransfer });
}

/** Mimics dragging a tray chip onto a bin: the chip writes its id, the bin reads it. */
function dragChipToBin(chipIndex: number, binId: string) {
  const store: Record<string, string> = {};
  const dataTransfer = {
    setData: (k: string, v: string) => { store[k] = v; },
    getData: (k: string) => store[k] ?? "",
    types: ["text/plain"],
    files: [] as File[],
  };
  fireEvent.dragStart(screen.getAllByTestId("tray-file")[chipIndex], { dataTransfer });
  fireEvent.drop(screen.getByTestId(`bin-${binId}`), { dataTransfer });
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no blob URL support; the tray creates one per file.
  if (!URL.createObjectURL) {
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: () => "blob:mock" });
  }
  if (!URL.revokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: () => {} });
  }
  uploadDoc.mockResolvedValue({ ok: true, data: { results: [{ fileName: "แปลนอาคาร.pdf", success: true }] } });
});

describe("filling the tray", () => {
  it("starts with an empty tray", () => {
    renderWorkspace();
    expect(screen.getByText("ยังไม่มีไฟล์ในถาด")).toBeInTheDocument();
  });

  it("puts dropped files in the tray without uploading them yet", () => {
    renderWorkspace();
    dropIntoTray([file("a.pdf"), file("b.pdf")]);

    expect(screen.getAllByTestId("tray-file")).toHaveLength(2);
    expect(uploadDoc).not.toHaveBeenCalled();
  });

  it("lets a file be taken back out of the tray", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    dropIntoTray([file("a.pdf")]);

    await user.click(screen.getByLabelText("เอา a.pdf ออกจากถาด"));
    expect(screen.queryAllByTestId("tray-file")).toHaveLength(0);
  });
});

describe("dragging a file onto a sub-group bin", () => {
  it("uploads it to that group and takes it out of the tray", async () => {
    renderWorkspace();
    dropIntoTray([file()]);
    dragChipToBin(0, "g-plan");

    await waitFor(() => expect(uploadDoc).toHaveBeenCalled());
    const [categoryId, groupName, files] = uploadDoc.mock.calls[0];
    expect(categoryId).toBe("cat-1");
    expect(groupName).toBe("0. แปลนและแบบก่อสร้าง");
    expect(files).toHaveLength(1);

    await waitFor(() => expect(screen.queryAllByTestId("tray-file")).toHaveLength(0));
  });

  it("raises that bin's count so progress is visible without a reload", async () => {
    renderWorkspace();
    dropIntoTray([file()]);
    dragChipToBin(0, "g-plan");

    // 12 already there, plus the one just filed.
    await waitFor(() => expect(screen.getByText("13 ไฟล์")).toBeInTheDocument());
  });

  it("keeps a rejected file in the tray, carrying its reason", async () => {
    uploadDoc.mockResolvedValue({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
    renderWorkspace();
    dropIntoTray([file()]);
    dragChipToBin(0, "g-plan");

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("คุณไม่มีสิทธิ์ทำรายการนี้"));
    expect(screen.getAllByTestId("tray-file")).toHaveLength(1);
    expect(screen.getByText("คุณไม่มีสิทธิ์ทำรายการนี้")).toBeInTheDocument();
  });
});

describe("choosing which category's bins are shown", () => {
  it("shows only the active category's sub-groups", () => {
    renderWorkspace();

    expect(screen.getByTestId("bin-g-plan")).toBeInTheDocument();
    expect(screen.queryByTestId("bin-g-alarm")).not.toBeInTheDocument();
  });

  it("switches bins when another category tab is chosen", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /หมวดที่ 4/ }));

    expect(screen.getByTestId("bin-g-alarm")).toBeInTheDocument();
    expect(screen.queryByTestId("bin-g-plan")).not.toBeInTheDocument();
  });

  it("shows a bin that holds no documents — those are the ones being filled", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole("button", { name: /หมวดที่ 4/ }));

    expect(screen.getByText("4.1 ระบบสัญญาณเตือนภัย")).toBeInTheDocument();
    expect(screen.getAllByText("0 ไฟล์")).toHaveLength(2);
  });
});

describe("filtering the bins", () => {
  it("narrows a long list down to what was typed", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.type(screen.getByLabelText("กรองหมวดย่อย"), "1.1");

    expect(screen.getByTestId("bin-g-floor")).toBeInTheDocument();
    expect(screen.queryByTestId("bin-g-plan")).not.toBeInTheDocument();
  });

  it("says so when nothing matches, rather than showing an empty box", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.type(screen.getByLabelText("กรองหมวดย่อย"), "ไม่มีอยู่จริง");

    expect(screen.getByText("ไม่พบหมวดย่อยที่ตรงกับคำค้น")).toBeInTheDocument();
  });

  it("keeps bins in the order an editor set, not by how full they are", () => {
    renderWorkspace();
    const names = screen.getAllByTestId(/^bin-/).map((bin) => bin.textContent);

    // g-plan (12 files, sort_order 1) before g-floor (1 file, sort_order 2).
    expect(names[0]).toContain("0. แปลนและแบบก่อสร้าง");
    expect(names[1]).toContain("1.1 งานพื้นอาคาร");
  });
});

describe("looking inside a file before filing it", () => {
  it("offers each tray file an expander, since the name alone often is not enough", () => {
    renderWorkspace();
    dropIntoTray([file("scan_0142.pdf")]);

    expect(screen.getByLabelText("ดูเนื้อหา scan_0142.pdf")).toBeInTheDocument();
  });

  it("shows the file size next to the name", () => {
    renderWorkspace();
    dropIntoTray([new File(["x".repeat(2048)], "big.pdf", { type: "application/pdf" })]);

    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("renders a PDF in a frame when expanded", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    dropIntoTray([file("plan.pdf")]);

    await user.click(screen.getByLabelText("ดูเนื้อหา plan.pdf"));

    await waitFor(() => {
      expect(document.querySelector('iframe[title="plan.pdf"]')).not.toBeNull();
    });
  });

  it("renders an image when the file is one", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    dropIntoTray([new File(["x"], "photo.jpg", { type: "image/jpeg" })]);

    await user.click(screen.getByLabelText("ดูเนื้อหา photo.jpg"));

    await waitFor(() => {
      expect(screen.getByAltText("photo.jpg")).toBeInTheDocument();
    });
  });

  it("says plainly that a Word file cannot be previewed, rather than showing an empty panel", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    dropIntoTray([new File(["x"], "รายงาน.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })]);

    await user.click(screen.getByLabelText("ดูเนื้อหา รายงาน.docx"));

    expect(await screen.findByText("ไฟล์ชนิดนี้ดูตัวอย่างในหน้าเว็บไม่ได้")).toBeInTheDocument();
  });

  it("still drags to a bin with the row expanded", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    dropIntoTray([file()]);
    await user.click(screen.getByLabelText("ดูเนื้อหา แปลนอาคาร.pdf"));

    dragChipToBin(0, "g-plan");

    await waitFor(() => expect(uploadDoc).toHaveBeenCalled());
  });
});
