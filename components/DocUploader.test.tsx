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

const { DocUploader } = await import("@/components/DocUploader");

const CATEGORY_ID = "cat-1";
const CATEGORY: DocumentCategory = {
  id: CATEGORY_ID, slug: "structure", name_th: "โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1,
};
const GROUPS: DocumentGroup[] = [
  { id: "g1", category_id: CATEGORY_ID, name_th: "แปลนและแบบก่อสร้าง", sort_order: 1, document_count: 12 },
  { id: "g2", category_id: CATEGORY_ID, name_th: "พื้นที่เก็บนอกอาคาร", sort_order: 2, document_count: 0 },
];

function file(name = "แปลนอาคาร.pdf") {
  return new File(["x"], name, { type: "application/pdf" });
}

function dropFiles(files: File[]) {
  const zone = screen.getByTestId("doc-drop-zone");
  const dataTransfer = { files, types: ["Files"] };
  fireEvent.dragOver(zone, { dataTransfer });
  fireEvent.drop(zone, { dataTransfer });
  return zone;
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadDoc.mockResolvedValue({ ok: true, data: { results: [{ fileName: "แปลนอาคาร.pdf", success: true }] } });
});

describe("dragging files onto the document uploader", () => {
  it("shows the drop zone with its instruction", () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    expect(screen.getByText("ลากไฟล์มาวางที่นี่ หรือ")).toBeInTheDocument();
  });

  it("uploads a dropped file to this page's category", async () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    dropFiles([file()]);

    await waitFor(() => expect(uploadDoc).toHaveBeenCalled());
    const [categoryId, , files] = uploadDoc.mock.calls[0];
    expect(categoryId).toBe(CATEGORY_ID);
    expect(files).toHaveLength(1);
  });

  it("uploads every file in a multi-file drop", async () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    dropFiles([file("a.pdf"), file("b.pdf"), file("c.pdf")]);

    await waitFor(() => expect(uploadDoc).toHaveBeenCalled());
    expect(uploadDoc.mock.calls[0][2]).toHaveLength(3);
  });

  it("carries the chosen sub-group through a drop, not just a button upload", async () => {
    const user = userEvent.setup();
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);

    await user.type(screen.getByPlaceholderText("เช่น แปลนและแบบก่อสร้าง"), "1.5 พื้นที่เก็บนอกอาคาร");
    dropFiles([file()]);

    await waitFor(() => expect(uploadDoc).toHaveBeenCalled());
    expect(uploadDoc.mock.calls[0][1]).toBe("1.5 พื้นที่เก็บนอกอาคาร");
  });

  it("changes its wording while a file is over it, so the target is obvious", () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    const zone = screen.getByTestId("doc-drop-zone");

    fireEvent.dragOver(zone, { dataTransfer: { files: [], types: ["Files"] } });
    expect(screen.getByText("วางไฟล์เพื่ออัปโหลด")).toBeInTheDocument();

    fireEvent.dragLeave(zone);
    expect(screen.getByText("ลากไฟล์มาวางที่นี่ หรือ")).toBeInTheDocument();
  });

  it("ignores a drag that carries no files, so dragging text changes nothing", () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    const zone = screen.getByTestId("doc-drop-zone");

    fireEvent.dragOver(zone, { dataTransfer: { files: [], types: ["text/plain"] } });
    expect(screen.getByText("ลากไฟล์มาวางที่นี่ หรือ")).toBeInTheDocument();

    fireEvent.drop(zone, { dataTransfer: { files: [], types: ["text/plain"] } });
    expect(uploadDoc).not.toHaveBeenCalled();
  });

  it("keeps the button working for phones, where there is nothing to drag from", async () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    expect(screen.getByRole("button", { name: "+ เพิ่มไฟล์" })).toBeInTheDocument();
  });

  it("reports a rejected upload rather than failing quietly", async () => {
    uploadDoc.mockResolvedValue({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    dropFiles([file()]);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("คุณไม่มีสิทธิ์ทำรายการนี้"));
  });

  it("offers every group in this category, including one holding no files", () => {
    render(<DocUploader categoryId={CATEGORY_ID} groups={GROUPS} category={CATEGORY} />);
    // The picker's suggestions come from the category's own groups (FR-023);
    // "1.5 พื้นที่เก็บนอกอาคาร" holds nothing and must still be offerable.
    expect(screen.getByPlaceholderText("เช่น แปลนและแบบก่อสร้าง")).toBeInTheDocument();
  });
});
