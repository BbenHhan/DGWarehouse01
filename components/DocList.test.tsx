/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen } from "@testing-library/react";
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
    renderList([group(1, "4.1 ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ")]);

    expect(screen.getByText("4.1 ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ")).toBeInTheDocument();
  });

  it("shows all 25 safety topics, none of which has a file yet", () => {
    // The real หมวดที่ 4 as loaded into the live project — every one empty.
    // Before specs/040 a group could not exist without a document, so this
    // whole category rendered as nothing at all.
    const names = [
      "4.1 ระบบสัญญาณเตือนภัยและอุปกรณ์ตรวจจับ",
      "4.2 อุปกรณ์ดับเพลิงและผังตำแหน่งถังดับเพลิง",
      "4.3 ระบบน้ำดับเพลิง (สปริงเกลอร์ หัวรับน้ำ สายส่ง)",
      "4.4 บัญชีสารเคมีและการจำแนกประเภท",
      "4.5 ตารางการจัดเก็บร่วมและผังการจัดเก็บ",
      "4.6 ข้อมูลความปลอดภัย (SDS/MSDS)",
      "4.7 การตรวจรับและตรวจสภาพหีบห่อ",
      "4.8 อุปกรณ์ป้องกันอันตรายส่วนบุคคล (PPE)",
      "4.9 สุขศาสตร์และผลตรวจสุขภาพพนักงาน",
      "4.10 การปฐมพยาบาลเบื้องต้น",
      "4.11 ป้ายและเครื่องหมายความปลอดภัย",
      "4.12 เส้นทางจราจรและพื้นที่รับส่งสินค้า",
      "4.13 รถยกและการเคลื่อนย้าย",
      "4.14 พื้นที่แบ่งถ่ายสารเคมี",
      "4.15 แผนฉุกเฉินและการซ้อมแผน",
      "4.16 ข้อมูลสำหรับหน่วยกู้ภัยฉุกเฉิน",
      "4.17 แผนบำรุงรักษาอุปกรณ์ความปลอดภัย",
      "4.18 คำแนะนำวิธีปฏิบัติงาน (SOP)",
      "4.19 บันทึกการฝึกอบรม",
      "4.20 ใบอนุญาตทำงานเสี่ยง",
      "4.21 รายงานการสำรวจตรวจตราประจำวัน",
      "4.22 ข้อกำหนดพิเศษ: วัตถุระเบิด (ประเภท 1)",
      "4.23 ข้อกำหนดพิเศษ: ก๊าซ (ประเภท 2)",
      "4.24 ข้อกำหนดพิเศษ: สารไวไฟ (ประเภท 3A, 5.2)",
      "4.25 ข้อกำหนดพิเศษ: สารออกซิไดซ์ (ประเภท 5.1)",
    ];
    renderList(names.map((name, i) => group(i + 1, name)));

    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("keeps the order the editor set, not the order documents arrived in", () => {
    renderList([group(1, "หนึ่ง"), group(2, "สอง"), group(3, "สาม")]);

    const rendered = screen
      .getAllByText(/^(หนึ่ง|สอง|สาม)$/)
      .map((node) => node.textContent);
    expect(rendered).toEqual(["หนึ่ง", "สอง", "สาม"]);
  });

  it("labels an empty group as holding zero files", () => {
    renderList([group(1, "ยังไม่มีไฟล์")]);

    expect(screen.getByText("0 ไฟล์")).toBeInTheDocument();
  });

  it("still shows documents that belong to no group, above the groups", () => {
    renderList([group(1, "มีกลุ่ม")], [doc("ungrouped", null)]);

    expect(screen.getByText("ungrouped.pdf")).toBeInTheDocument();
    expect(screen.getByText("มีกลุ่ม")).toBeInTheDocument();
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
