/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Document, DocumentCategory, DocumentGroup } from "@/lib/types";

vi.mock("@/app/actions/documents", () => ({ deleteDoc: vi.fn(), editDoc: vi.fn() }));
vi.mock("@/app/actions/document-taxonomy", () => ({
  createGroup: vi.fn(),
  moveGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/storage", () => ({ publicFileUrl: () => "https://example.test/file" }));

const { DocList } = await import("@/components/DocList");
const { ManageModeProvider, ManageModeToggle } = await import("@/components/ManageModeProvider");

const CATEGORY_ID = "cat-safety";
const CATEGORIES: DocumentCategory[] = [
  { id: CATEGORY_ID, slug: "safety", name_th: "หมวดที่ 4 ความปลอดภัย", emoji: "🦺", sort_order: 4 },
];

function group(n: number, name: string, count = 0): DocumentGroup {
  return { id: `grp-${n}`, category_id: CATEGORY_ID, name_th: name, sort_order: n, document_count: count };
}

function doc(id: string, groupId: string | null): Document {
  return {
    id,
    category_id: CATEGORY_ID,
    storage_path: `${CATEGORY_ID}/${id}.pdf`,
    file_name: `${id}.pdf`,
    group_id: groupId,
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  };
}

function renderList(groups: DocumentGroup[], documents: Document[] = []) {
  return render(
    <DocList
      documents={documents}
      documentGroups={groups}
      allGroups={groups}
      categories={CATEGORIES}
      categoryId={CATEGORY_ID}
      categoryMoveOptions={[]}
      canEdit
    />
  );
}

describe("every sub-group reaches the page, files or not", () => {
  it("renders a group that holds no documents at all", () => {
    renderList([group(1, "ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ")]);

    // The number is derived from position now, so the row reads "4.1 …" for the
    // first group of the category sitting fourth.
    expect(screen.getByText(/ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ/)).toBeInTheDocument();
    expect(screen.getByText(/4\.1/)).toBeInTheDocument();
  });

  it("shows all 25 safety topics, none of which has a file yet", () => {
    // The real หมวดที่ 4 as loaded into the live project — every one empty.
    // Before specs/040 a group could not exist without a document, so this
    // whole category rendered as nothing at all.
    const names = [
      "ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ",
      "อุปกรณ์ดับเพลิงและผังตำแหน่งถังดับเพลิง",
      "ระบบน้ำดับเพลิง (สปริงเกลอร์ หัวรับน้ำ สายส่ง)",
      "บัญชีสารเคมีและการจำแนกประเภท",
      "ตารางการจัดเก็บร่วมและผังการจัดเก็บ",
      "ข้อมูลความปลอดภัย (SDS/MSDS)",
      "การตรวจรับและตรวจสภาพหีบห่อ",
      "อุปกรณ์ป้องกันอันตรายส่วนบุคคล (PPE)",
      "สุขศาสตร์และผลตรวจสุขภาพพนักงาน",
      "4.10 การปฐมพยาบาลเบื้องต้น",
      "ป้ายและเครื่องหมายความปลอดภัย",
      "เส้นทางจราจรและพื้นที่รับส่งสินค้า",
      "รถยกและการเคลื่อนย้าย",
      "พื้นที่แบ่งถ่ายสารเคมี",
      "แผนฉุกเฉินและการซ้อมแผน",
      "ข้อมูลสำหรับหน่วยกู้ภัยฉุกเฉิน",
      "แผนบำรุงรักษาอุปกรณ์ความปลอดภัย",
      "คำแนะนำวิธีปฏิบัติงาน (SOP)",
      "บันทึกการฝึกอบรม",
      "ใบอนุญาตทำงานเสี่ยง",
      "รายงานการสำรวจตรวจตราประจำวัน",
      "ข้อกำหนดพิเศษ: วัตถุระเบิด (ประเภท 1)",
      "ข้อกำหนดพิเศษ: ก๊าซ (ประเภท 2)",
      "ข้อกำหนดพิเศษ: สารไวไฟ (ประเภท 3A, 5.2)",
      "ข้อกำหนดพิเศษ: สารออกซิไดซ์ (ประเภท 5.1)",
    ];
    renderList(names.map((name, i) => group(i + 1, name)));

    for (const name of names) {
      expect(screen.getByText(new RegExp(name.replace(/[.()]/g, "\\$&")))).toBeInTheDocument();
    }
  });

  it("keeps the order the editor set, not the order documents arrived in", () => {
    renderList([group(1, "หนึ่ง"), group(2, "สอง"), group(3, "สาม")]);

    const rendered = screen
      .getAllByText(/(หนึ่ง|สอง|สาม)/)
      .map((node) => node.textContent?.replace(/[\d.\s]+/g, ""));
    expect(rendered).toEqual(["หนึ่ง", "สอง", "สาม"]);
  });

  it("labels an empty group as holding zero files", () => {
    renderList([group(1, "ยังไม่มีไฟล์")]);

    expect(screen.getByText("0 ไฟล์")).toBeInTheDocument();
  });

  it("still shows documents that belong to no group, above the groups", () => {
    renderList([group(1, "มีกลุ่ม")], [doc("ungrouped", null)]);

    expect(screen.getByText("ungrouped.pdf")).toBeInTheDocument();
    expect(screen.getByText(/มีกลุ่ม/)).toBeInTheDocument();
  });

  it("counts each group's own documents", () => {
    renderList(
      [group(1, "กลุ่ม ก"), group(2, "กลุ่ม ข")],
      [doc("a1", "grp-1"), doc("a2", "grp-1"), doc("b1", "grp-2")]
    );

    expect(screen.getByText("2 ไฟล์")).toBeInTheDocument();
    expect(screen.getByText("1 ไฟล์")).toBeInTheDocument();
  });
});

describe("a category that is completely empty", () => {
  it("still offers the add-sub-group form once management mode is on", async () => {
    const user = userEvent.setup();
    render(
      <ManageModeProvider canManage>
        <ManageModeToggle />
        <DocList
          documents={[]}
          documentGroups={[]}
          allGroups={[]}
          categories={CATEGORIES}
          categoryId={CATEGORY_ID}
          categoryMoveOptions={[]}
          canEdit
        />
      </ManageModeProvider>
    );

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    // A category has no documents and no groups the moment it is created —
    // if the empty state short-circuits, it can never be given a first topic.
    expect(screen.getByPlaceholderText(/เพิ่มหมวดย่อย/)).toBeInTheDocument();
  });

  it("puts the add field above the topics, not below all of them", async () => {
    const user = userEvent.setup();
    render(
      <ManageModeProvider canManage>
        <ManageModeToggle />
        <DocList
          documents={[]}
          documentGroups={[group(1, "หนึ่ง"), group(2, "สอง"), group(3, "สาม")]}
          allGroups={[]}
          categories={CATEGORIES}
          categoryId={CATEGORY_ID}
          categoryMoveOptions={[]}
          canEdit
        />
      </ManageModeProvider>
    );
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    // Reaching it must not mean scrolling past every existing topic.
    const field = screen.getByPlaceholderText(/เพิ่มหมวดย่อย/);
    // In management mode a group's name is an editable input, so it is found by
    // its label rather than by its text.
    const firstGroup = screen.getByLabelText("ชื่อหมวดย่อย หนึ่ง");
    expect(field.compareDocumentPosition(firstGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("heads the management section so it reads as one thing", async () => {
    const user = userEvent.setup();
    render(
      <ManageModeProvider canManage>
        <ManageModeToggle />
        <DocList
          documents={[]}
          documentGroups={[]}
          allGroups={[]}
          categories={CATEGORIES}
          categoryId={CATEGORY_ID}
          categoryMoveOptions={[]}
          canEdit
        />
      </ManageModeProvider>
    );
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));

    expect(screen.getByText("หมวดย่อยของหมวดนี้")).toBeInTheDocument();
  });

  it("drops the browse empty state while managing, since the form says it all", async () => {
    const user = userEvent.setup();
    render(
      <ManageModeProvider canManage>
        <ManageModeToggle />
        <DocList
          documents={[]}
          documentGroups={[]}
          allGroups={[]}
          categories={CATEGORIES}
          categoryId={CATEGORY_ID}
          categoryMoveOptions={[]}
          canEdit
        />
      </ManageModeProvider>
    );

    expect(screen.getByText("ยังไม่มีเอกสารในหมวดนี้")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    expect(screen.queryByText("ยังไม่มีเอกสารในหมวดนี้")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/เพิ่มหมวดย่อย/)).toBeInTheDocument();
  });

  it("keeps the plain empty state for someone not managing", () => {
    renderList([], []);
    expect(screen.getByText("ยังไม่มีเอกสารในหมวดนี้")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/เพิ่มหมวดย่อย/)).not.toBeInTheDocument();
  });
});
