import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// specs/048-server-action-coverage. Same shape as photos.test.ts: the real
// actions against the local backend, only the rights check mocked.
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "local", USE_MOCK_DATA: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireRole = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  createServiceClient: () => {
    throw new Error("no Supabase client should be built in local mode");
  },
}));

const { uploadDoc, deleteDoc, editDoc, moveDocuments } = await import("@/app/actions/documents");
const { LOCAL_FILES_DIR, localCreateDocumentCategory, localGetDocuments, localGetDocumentGroups } = await import(
  "@/lib/local/store"
);
const { MAX_FILE_SIZE_BYTES } = await import("@/lib/validation");

function pdf(name = "ใบรับรอง.pdf", type = "application/pdf") {
  return new File(["เอกสาร"], name, { type });
}

function oversized(name = "ใหญ่เกิน.pdf") {
  const file = pdf(name);
  Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });
  return file;
}

function stored(storagePath: string) {
  return existsSync(path.join(LOCAL_FILES_DIR, storagePath));
}

let run = 0;
async function seedCategory() {
  run += 1;
  const category = await localCreateDocumentCategory(`หมวดทดสอบเอกสาร ${Date.now()}-${run}`, "📁");
  if (!category) throw new Error("could not seed a category");
  return category;
}

async function seedDoc(categoryId: string, name = "เดิม.pdf", note: string | null = null) {
  const result = await uploadDoc(categoryId, note, [pdf(name)]);
  if (!result.ok) throw new Error("could not seed a document");
  const first = result.data.results[0];
  if (!first.success) throw new Error("seed upload was refused");
  return first.item;
}

function refusal(result: { ok: boolean } & Record<string, unknown>): string {
  if (result.ok) throw new Error("expected the action to be refused, but it succeeded");
  return String(result.error ?? "");
}

beforeEach(() => {
  requireRole.mockReset();
  requireRole.mockResolvedValue({ role: "editor" });
});

// ---------------------------------------------------------------------------
// US1 — the security boundary (FR-001 to FR-004)
// ---------------------------------------------------------------------------
describe("every document action is refused without edit rights", () => {
  const cases = (categoryId: string, documentId: string) =>
    [
      ["uploadDoc", () => uploadDoc(categoryId, null, [pdf()])],
      ["deleteDoc", () => deleteDoc(documentId)],
      ["editDoc", () => editDoc({ documentId, fileName: "ชื่อใหม่.pdf" })],
      ["moveDocuments", () => moveDocuments({ documentIds: [documentId], toCategoryId: categoryId, toGroupId: null })],
    ] as const;

  it("tells a viewer they lack the right, and changes nothing", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "ห้ามแตะ.pdf");
    const before = await localGetDocuments(category.id);
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    for (const [, call] of cases(category.id, document.id)) {
      expect(refusal(await call())).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    }

    expect(await localGetDocuments(category.id)).toEqual(before);
    expect(stored(document.storage_path)).toBe(true);
  });

  it("tells someone signed out to sign in, distinctly from a viewer", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "ยังอยู่.pdf");
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));

    for (const [, call] of cases(category.id, document.id)) {
      expect(refusal(await call())).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
    }
    expect(stored(document.storage_path)).toBe(true);
  });

  it("asks for editor rights, not admin", async () => {
    const category = await seedCategory();
    await uploadDoc(category.id, null, [pdf()]);
    expect(requireRole).toHaveBeenCalledWith("editor");
  });

  it("checks rights before the input", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    expect(refusal(await uploadDoc("", null, []))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    expect(refusal(await editDoc({ documentId: "ไม่ใช่ uuid" }))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
  });
});

// ---------------------------------------------------------------------------
// US2 — a delete takes the stored file with it (FR-005, FR-007)
// ---------------------------------------------------------------------------
describe("deleting a document", () => {
  it("removes the record and the stored file together", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "จะโดนลบ.pdf");

    const result = await deleteDoc(document.id);

    expect(result).toEqual({ ok: true, data: { documentId: document.id } });
    expect((await localGetDocuments(category.id)).some((d) => d.id === document.id)).toBe(false);
    expect(stored(document.storage_path)).toBe(false);
  });

  it("refuses an id that does not exist, and touches nothing", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "เพื่อนบ้าน.pdf");

    expect(refusal(await deleteDoc(crypto.randomUUID()))).toBe("ไม่พบเอกสารนี้");

    expect((await localGetDocuments(category.id)).some((d) => d.id === document.id)).toBe(true);
    expect(stored(document.storage_path)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// US2 — a move is metadata only (FR-006)
// ---------------------------------------------------------------------------
describe("moving documents in bulk", () => {
  it("relocates every document without touching where its file is stored", async () => {
    const from = await seedCategory();
    const to = await seedCategory();
    const first = await seedDoc(from.id, "หนึ่ง.pdf");
    const second = await seedDoc(from.id, "สอง.pdf");

    const result = await moveDocuments({
      documentIds: [first.id, second.id],
      toCategoryId: to.id,
      toGroupId: null,
    });

    expect(result).toEqual({ ok: true, data: { moved: 2 } });
    expect(await localGetDocuments(from.id)).toEqual([]);

    const moved = await localGetDocuments(to.id);
    expect(moved.map((d) => d.file_name).sort()).toEqual(["สอง.pdf", "หนึ่ง.pdf"]);
    // Rewriting storage_path would orphan the file and break every link to it.
    for (const original of [first, second]) {
      const now = moved.find((d) => d.id === original.id);
      expect(now?.storage_path).toBe(original.storage_path);
      expect(stored(original.storage_path)).toBe(true);
    }
  });

  it("treats an empty list as a no-op", async () => {
    const category = await seedCategory();
    expect(await moveDocuments({ documentIds: [], toCategoryId: category.id, toGroupId: null })).toEqual({
      ok: true,
      data: { moved: 0 },
    });
  });
});

// ---------------------------------------------------------------------------
// US3 — uploads are filtered before anything is stored (FR-008, FR-009)
// ---------------------------------------------------------------------------
describe("uploading documents", () => {
  it("stores a valid file and reports it", async () => {
    const category = await seedCategory();

    const result = await uploadDoc(category.id, null, [pdf("ดี.pdf")]);

    const entry = result.ok ? result.data.results[0] : null;
    expect(entry?.success).toBe(true);
    if (entry?.success) expect(stored(entry.item.storage_path)).toBe(true);
  });

  it("refuses a file over the size limit and one of a disallowed type, storing neither", async () => {
    const category = await seedCategory();

    const result = await uploadDoc(category.id, null, [
      oversized(),
      pdf("สคริปต์.exe", "application/x-msdownload"),
    ]);

    const results = result.ok ? result.data.results : [];
    expect(results.every((r) => !r.success)).toBe(true);
    expect(String(results[0] && !results[0].success ? results[0].error : "")).toContain("ไฟล์ใหญ่เกินไป");
    expect(String(results[1] && !results[1].success ? results[1].error : "")).toContain("ไม่รองรับชนิดไฟล์นี้");
    expect(await localGetDocuments(category.id)).toEqual([]);
  });

  it("stores the good files and reports the bad ones from the same batch", async () => {
    const category = await seedCategory();

    const result = await uploadDoc(category.id, null, [pdf("หนึ่ง.pdf"), oversized("สอง-ใหญ่.pdf")]);

    const results = result.ok ? result.data.results : [];
    expect(results.map((r) => [r.fileName, r.success])).toEqual([
      ["หนึ่ง.pdf", true],
      ["สอง-ใหญ่.pdf", false],
    ]);
    expect((await localGetDocuments(category.id)).map((d) => d.file_name)).toEqual(["หนึ่ง.pdf"]);
  });

  // FR-024 of specs/040: a typed name attaches to that category's group, making
  // one at upload time if it does not exist yet.
  it("files an upload under a sub-group typed by name, creating it if needed", async () => {
    const category = await seedCategory();

    const document = await seedDoc(category.id, "มีกลุ่ม.pdf", "ใบรับรองและสเปก");

    const groups = await localGetDocumentGroups(category.id);
    const group = groups.find((g) => g.name_th === "ใบรับรองและสเปก");
    expect(group).toBeDefined();
    expect(document.group_id).toBe(group?.id);
  });
});

// ---------------------------------------------------------------------------
// US2 — editing changes only what was asked for
// ---------------------------------------------------------------------------
describe("editing a document", () => {
  it("changes only the fields passed, leaving the stored file alone", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "ก่อนแก้.pdf");

    const result = await editDoc({ documentId: document.id, fileName: "หลังแก้.pdf" });

    expect(result.ok).toBe(true);
    const updated = (await localGetDocuments(category.id)).find((d) => d.id === document.id);
    expect(updated?.file_name).toBe("หลังแก้.pdf");
    expect(updated?.category_id).toBe(document.category_id);
    expect(updated?.storage_path).toBe(document.storage_path);
    expect(stored(document.storage_path)).toBe(true);
  });

  it("refuses an edit that changes nothing", async () => {
    const category = await seedCategory();
    const document = await seedDoc(category.id, "ไม่แก้อะไร.pdf");
    expect(refusal(await editDoc({ documentId: document.id }))).toBe("ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข");
  });
});
