import { describe, expect, it, vi } from "vitest";
import type { Document, DocumentCategory, DocumentGroup } from "@/lib/types";

// Same approach as the taxonomy action tests: point the module at the local
// store so the file actually gets written and read back, rather than stubbing
// the storage boundary that the interesting failures live on.
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "local", USE_MOCK_DATA: false }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => {
    throw new Error("no Supabase client should be built in local mode");
  },
}));

const { archiveFileName, categoryArchiveEntries } = await import("@/lib/document-archive");
const { localCreateDocumentCategory, localCreateDocumentGroup, localSaveDocumentFile } =
  await import("@/lib/local/store");

const decoder = new TextDecoder();

async function collect(
  category: DocumentCategory,
  groups: DocumentGroup[],
  documents: Document[]
) {
  const out: { path: string; text: string | null }[] = [];
  for await (const entry of categoryArchiveEntries(category, groups, documents)) {
    out.push({ path: entry.path, text: entry.data ? decoder.decode(entry.data) : null });
  }
  return out;
}

async function seed() {
  const category = await localCreateDocumentCategory(`คลัง ${Math.random().toString(36).slice(2, 8)}`, "📦");
  if (!category) throw new Error("could not seed a category");

  const withFiles = await localCreateDocumentGroup(category.id, "ใบรับรอง");
  const empty = await localCreateDocumentGroup(category.id, "ผลทดสอบ");
  if (!withFiles || !empty) throw new Error("could not seed groups");

  return { category, withFiles, empty };
}

describe("categoryArchiveEntries", () => {
  it("puts each document under its group's numbered folder", async () => {
    const { category, withFiles, empty } = await seed();
    const document = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["ใบเซอประตู"], "ใบเซอ.pdf", { type: "application/pdf" })
    );

    const entries = await collect(category, [withFiles, empty], [document]);
    const root = `หมวดที่ ${category.sort_order} ${category.name_th}`;

    expect(entries[0].path).toBe(`${root}/`);
    const file = entries.find((entry) => entry.path.endsWith("ใบเซอ.pdf"));
    expect(file?.path).toBe(`${root}/${category.sort_order}.${withFiles.sort_order} ใบรับรอง/ใบเซอ.pdf`);
    expect(file?.text).toBe("ใบเซอประตู");
  });

  it("still emits a folder for a group holding nothing", async () => {
    const { category, withFiles, empty } = await seed();

    const entries = await collect(category, [withFiles, empty], []);

    expect(entries.map((entry) => entry.path)).toContain(
      `หมวดที่ ${category.sort_order} ${category.name_th}/${category.sort_order}.${empty.sort_order} ผลทดสอบ/`
    );
  });

  it("keeps both documents when two rows share a file name", async () => {
    const { category, withFiles } = await seed();
    const first = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["หนึ่ง"], "ซ้ำ.pdf", { type: "application/pdf" })
    );
    const second = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["สอง"], "ซ้ำ.pdf", { type: "application/pdf" })
    );

    const entries = await collect(category, [withFiles], [first, second]);
    const files = entries.filter((entry) => entry.text !== null);

    expect(files).toHaveLength(2);
    expect(new Set(files.map((entry) => entry.path)).size).toBe(2);
    expect(files.map((entry) => entry.text).sort()).toEqual(["สอง", "หนึ่ง"]);
  });

  // specs/047 FR-007. The draft numbered a duplicate by how many names were
  // already taken, which can land on a name that exists — and a ZIP with two
  // identical paths extracts as one file, losing a document silently.
  it("keeps all three when the renamed duplicate would take a name already in use", async () => {
    const { category, withFiles } = await seed();
    const first = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["หนึ่ง"], "ก.pdf", { type: "application/pdf" })
    );
    const second = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["สอง"], "ก.pdf", { type: "application/pdf" })
    );
    const numbered = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["สาม"], "ก (3).pdf", { type: "application/pdf" })
    );

    // Counting taken names renames the second "ก.pdf" to "ก (3).pdf" — the name
    // the third document already carries.
    const entries = await collect(category, [withFiles], [first, numbered, second]);
    const files = entries.filter((entry) => entry.text !== null);

    expect(new Set(files.map((entry) => entry.path)).size).toBe(3);
    expect(files.map((entry) => entry.text).sort()).toEqual(["สอง", "สาม", "หนึ่ง"]);
  });

  it("keeps all three whatever order they come in", async () => {
    const { category, withFiles } = await seed();
    const numbered = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["สาม"], "ก (3).pdf", { type: "application/pdf" })
    );
    const first = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["หนึ่ง"], "ก.pdf", { type: "application/pdf" })
    );
    const second = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["สอง"], "ก.pdf", { type: "application/pdf" })
    );

    const entries = await collect(category, [withFiles], [numbered, first, second]);
    const files = entries.filter((entry) => entry.text !== null);

    expect(new Set(files.map((entry) => entry.path)).size).toBe(3);
    expect(files.map((entry) => entry.text).sort()).toEqual(["สอง", "สาม", "หนึ่ง"]);
  });

  it("skips a row whose file is gone instead of aborting the archive", async () => {
    const { category, withFiles } = await seed();
    const present = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["อยู่"], "มี.pdf", { type: "application/pdf" })
    );
    const missing: Document = { ...present, id: "missing", file_name: "หาย.pdf", storage_path: "nope/gone.pdf" };

    const entries = await collect(category, [withFiles], [missing, present]);

    expect(entries.some((entry) => entry.path.endsWith("หาย.pdf"))).toBe(false);
    expect(entries.some((entry) => entry.path.endsWith("มี.pdf"))).toBe(true);
  });

  it("gives a document with no group a folder of its own", async () => {
    const { category, withFiles } = await seed();
    const document = await localSaveDocumentFile(
      category.id,
      withFiles.id,
      new File(["ลอย"], "ไม่มีกลุ่ม.pdf", { type: "application/pdf" })
    );

    const entries = await collect(category, [withFiles], [{ ...document, group_id: null }]);

    expect(entries.map((entry) => entry.path)).toContain(
      `หมวดที่ ${category.sort_order} ${category.name_th}/ไม่ได้ระบุหมวดย่อย/ไม่มีกลุ่ม.pdf`
    );
  });

  it("keeps descriptions out of the archive entirely", async () => {
    const { category, withFiles } = await seed();
    const described = { ...withFiles, description: "ใบรับรองผลิตภัณฑ์และสเปคชีทของวัสดุที่ติดตั้งจริง" };

    const entries = await collect(
      { ...category, description: "ชุดเอกสารสำหรับยื่นขออนุญาต" },
      [described],
      []
    );

    expect(entries.every((entry) => !entry.path.includes("ใบรับรองผลิตภัณฑ์"))).toBe(true);
    expect(entries.every((entry) => !entry.path.includes("ชุดเอกสารสำหรับยื่น"))).toBe(true);
    expect(entries.map((entry) => entry.path)).toEqual([
      `หมวดที่ ${category.sort_order} ${category.name_th}/`,
      `หมวดที่ ${category.sort_order} ${category.name_th}/${category.sort_order}.${withFiles.sort_order} ใบรับรอง/`,
    ]);
  });

  it("never lets a name introduce an extra folder level", async () => {
    const { category } = await seed();
    const group: DocumentGroup = {
      id: "g",
      category_id: category.id,
      name_th: "ใบรับรอง / สเปก",
      sort_order: 9,
      document_count: 0,
    };

    const entries = await collect(category, [group], []);

    expect(entries[1].path).toBe(
      `หมวดที่ ${category.sort_order} ${category.name_th}/${category.sort_order}.9 ใบรับรอง - สเปก/`
    );
  });
});

describe("archiveFileName", () => {
  it("names the download after the category", () => {
    expect(archiveFileName({ sort_order: 6, name_th: "ยื่นขออนุญาต" })).toBe(
      "หมวดที่ 6 ยื่นขออนุญาต.zip"
    );
  });
});
