/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// specs/041-complete-loading-states US3. Documents here run 5-30MB, so the
// preview area used to be a blank rectangle for many seconds with nothing to
// say a download was under way.
// Sub-groups are collapsed until opened, so reaching a document's preview
// means expanding its group first.
async function openDocument(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText(/ระบบดับเพลิง/));
  await user.click(await screen.findByText("doc-1.pdf"));
}

describe("document preview reports its download", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3, 4]), {
            status: 200,
            headers: { "Content-Length": "4", "Content-Type": "application/pdf" },
          })
      )
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows how much has arrived while the file is still coming", async () => {
    const user = userEvent.setup();
    // Never settles, so the preview stays in its loading state for the assertion.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    renderList([group(1, "ระบบดับเพลิง", 1)], [doc("doc-1", "grp-1")]);
    await openDocument(user);

    expect(await screen.findByText(/กำลังเปิดไฟล์/)).toBeInTheDocument();
  });

  // FR-007: nothing of the indicator may remain once the wait is over.
  it("leaves no placeholder behind once the file is ready", async () => {
    const user = userEvent.setup();

    renderList([group(1, "ระบบดับเพลิง", 1)], [doc("doc-1", "grp-1")]);
    await openDocument(user);

    await waitFor(() =>
      expect(screen.queryByText(/กำลังเปิดไฟล์/)).not.toBeInTheDocument()
    );
    expect(screen.getByLabelText("doc-1.pdf")).toBeInTheDocument();
  });

  // FR-014b / research §4: a failed fetch must not cost the preview its
  // existing behaviour — the object falls back to the direct URL.
  it("still renders the file when progress cannot be measured", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    renderList([group(1, "ระบบดับเพลิง", 1)], [doc("doc-1", "grp-1")]);
    await openDocument(user);

    const embed = await screen.findByLabelText("doc-1.pdf");
    expect(embed).toHaveAttribute("data", "https://example.test/file");
  });
});

// FR-008: an image that never arrives must say so, rather than leaving a
// placeholder in place indefinitely.
describe("image preview failure", () => {
  function imageDoc(): Document {
    return { ...doc("doc-1", "grp-1"), file_name: "doc-1.jpg", storage_path: "cat/doc-1.jpg" };
  }

  it("shows a Thai message when the image cannot be loaded", async () => {
    const user = userEvent.setup();
    renderList([group(1, "ระบบดับเพลิง", 1)], [imageDoc()]);

    await user.click(screen.getByText(/ระบบดับเพลิง/));
    await user.click(await screen.findByText("doc-1.jpg"));

    const image = await screen.findByAltText("doc-1.jpg");
    expect(screen.getByText("กำลังโหลดรูป")).toBeInTheDocument();

    fireEvent.error(image);

    expect(await screen.findByText(/โหลดรูปไม่สำเร็จ/)).toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดรูป")).not.toBeInTheDocument();
  });

  it("clears the placeholder once the image arrives", async () => {
    const user = userEvent.setup();
    renderList([group(1, "ระบบดับเพลิง", 1)], [imageDoc()]);

    await user.click(screen.getByText(/ระบบดับเพลิง/));
    await user.click(await screen.findByText("doc-1.jpg"));

    const image = await screen.findByAltText("doc-1.jpg");
    fireEvent.load(image);

    await waitFor(() => expect(screen.queryByText("กำลังโหลดรูป")).not.toBeInTheDocument());
  });
});

// specs/045-automate-manual-checks T014. This was quickstart Scenario 7, which
// nobody could run without a signed-in editor and a large video in storage. The
// thing worth protecting (FR-014d) is that the player is handed the direct URL
// and starts on its own: downloading the file first would report a tidier
// percentage and cost both early playback and seeking.
describe("video preview reports what has arrived without withholding playback", () => {
  function videoDoc(): Document {
    return { ...doc("doc-1", "grp-1"), file_name: "doc-1.mp4", storage_path: "cat/doc-1.mp4" };
  }

  async function openVideo(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByText(/ระบบดับเพลิง/));
    await user.click(await screen.findByText("doc-1.mp4"));
  }

  // jsdom gives every media element duration NaN and no buffered ranges, so the
  // player's own reporting has to be simulated.
  function pretendBuffered(video: HTMLVideoElement, fraction: number) {
    Object.defineProperty(video, "duration", { configurable: true, value: 100 });
    Object.defineProperty(video, "buffered", {
      configurable: true,
      value: { length: 1, start: () => 0, end: () => 100 * fraction },
    });
  }

  it("plays from the direct URL rather than downloading the file first", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { container } = renderList([group(1, "ระบบดับเพลิง", 1)], [videoDoc()]);
    await openVideo(user);

    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("src", "https://example.test/file");
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("shows the player as soon as the file's metadata arrives, not when it is complete", async () => {
    const user = userEvent.setup();
    const { container } = renderList([group(1, "ระบบดับเพลิง", 1)], [videoDoc()]);
    await openVideo(user);

    const video = container.querySelector("video")!;
    expect(video.className).toContain("hidden");

    pretendBuffered(video, 0.2);
    fireEvent.loadedMetadata(video);

    // 20% in and the player is already on screen and usable.
    expect(video.className).not.toContain("hidden");
  });

  it("says how much has arrived while the rest is still coming", async () => {
    const user = userEvent.setup();
    const { container } = renderList([group(1, "ระบบดับเพลิง", 1)], [videoDoc()]);
    await openVideo(user);

    const video = container.querySelector("video")!;
    pretendBuffered(video, 0.4);
    fireEvent.loadedMetadata(video);
    fireEvent.progress(video);

    expect(await screen.findByText(/กำลังโหลดวิดีโอ 40%/)).toBeInTheDocument();
    expect(screen.getByText(/เล่นได้เลยไม่ต้องรอจนครบ/)).toBeInTheDocument();
  });

  it("drops the message once the whole file has arrived", async () => {
    const user = userEvent.setup();
    const { container } = renderList([group(1, "ระบบดับเพลิง", 1)], [videoDoc()]);
    await openVideo(user);

    const video = container.querySelector("video")!;
    pretendBuffered(video, 0.4);
    fireEvent.loadedMetadata(video);
    fireEvent.progress(video);
    expect(await screen.findByText(/กำลังโหลดวิดีโอ/)).toBeInTheDocument();

    pretendBuffered(video, 1);
    fireEvent.progress(video);

    await waitFor(() => expect(screen.queryByText(/กำลังโหลดวิดีโอ/)).not.toBeInTheDocument());
  });
});
