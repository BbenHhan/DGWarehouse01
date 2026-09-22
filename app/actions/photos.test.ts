import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// specs/048-server-action-coverage. Runs the real actions against the interim
// local backend — only the rights check is mocked, and building a Supabase
// client throws, which is itself the check that local mode never reaches for one
// (Constitution II).
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "local", USE_MOCK_DATA: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireRole = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  createServiceClient: () => {
    throw new Error("no Supabase client should be built in local mode");
  },
}));

const { uploadPhoto, deletePhoto, editPhoto } = await import("@/app/actions/photos");
const { LOCAL_FILES_DIR, localGetPhotos } = await import("@/lib/local/store");
const { MAX_FILE_SIZE_BYTES } = await import("@/lib/validation");

const ROOM = "hong-raek";
const WORK_TYPE = "firewalls";
const DATE = "2026-09-22";

function image(name = "งานผนัง.jpg", type = "image/jpeg") {
  return new File(["ภาพ"], name, { type });
}

// Size is read from the File's metadata before any byte is stored, so a
// declared size is enough and a real 300MB file would only slow the suite.
function oversized(name = "ใหญ่เกิน.jpg") {
  const file = image(name);
  Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });
  return file;
}

function stored(storagePath: string) {
  return existsSync(path.join(LOCAL_FILES_DIR, storagePath));
}

async function photos() {
  return localGetPhotos(ROOM, WORK_TYPE);
}

async function seedPhoto(name = "เดิม.jpg") {
  const result = await uploadPhoto(ROOM, WORK_TYPE, DATE, [image(name)]);
  if (!result.ok) throw new Error("could not seed a photo");
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
describe("every photo action is refused without edit rights", () => {
  const cases = (photoId: string) =>
    [
      ["uploadPhoto", () => uploadPhoto(ROOM, WORK_TYPE, DATE, [image()])],
      ["deletePhoto", () => deletePhoto(photoId)],
      ["editPhoto", () => editPhoto({ photoId, fileName: "ชื่อใหม่.jpg" })],
    ] as const;

  it("tells a viewer they lack the right, and changes nothing", async () => {
    const photo = await seedPhoto("ห้ามแตะ.jpg");
    const before = await photos();
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    for (const [, call] of cases(photo.id)) {
      expect(refusal(await call())).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    }

    expect(await photos()).toEqual(before);
    expect(stored(photo.storage_path)).toBe(true);
  });

  it("tells someone signed out to sign in, distinctly from a viewer", async () => {
    const photo = await seedPhoto("ยังอยู่.jpg");
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));

    for (const [, call] of cases(photo.id)) {
      expect(refusal(await call())).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
    }
    expect(stored(photo.storage_path)).toBe(true);
  });

  it("asks for editor rights, not admin", async () => {
    await uploadPhoto(ROOM, WORK_TYPE, DATE, [image()]);
    expect(requireRole).toHaveBeenCalledWith("editor");
  });

  // FR-004: a refused caller must not learn whether their input was valid.
  it("checks rights before the input", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    expect(refusal(await uploadPhoto("", "", "ไม่ใช่วันที่", []))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    expect(refusal(await editPhoto({ photoId: "ไม่ใช่ uuid" }))).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
  });
});

// ---------------------------------------------------------------------------
// US2 — a delete takes the stored file with it (FR-005, FR-007)
// ---------------------------------------------------------------------------
describe("deleting a photo", () => {
  it("removes the record and the stored file together", async () => {
    const photo = await seedPhoto("จะโดนลบ.jpg");
    expect(stored(photo.storage_path)).toBe(true);

    const result = await deletePhoto(photo.id);

    expect(result).toEqual({ ok: true, data: { photoId: photo.id } });
    expect((await photos()).some((p) => p.id === photo.id)).toBe(false);
    // The row alone would leave a file nobody can reach or ever delete.
    expect(stored(photo.storage_path)).toBe(false);
  });

  it("refuses an id that does not exist, and touches nothing", async () => {
    const photo = await seedPhoto("เพื่อนบ้าน.jpg");

    expect(refusal(await deletePhoto(crypto.randomUUID()))).toBe("ไม่พบรูปภาพนี้");

    expect((await photos()).some((p) => p.id === photo.id)).toBe(true);
    expect(stored(photo.storage_path)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// US3 — uploads are filtered before anything is stored (FR-008, FR-009)
// ---------------------------------------------------------------------------
describe("uploading photos", () => {
  it("stores a valid file and reports it", async () => {
    const result = await uploadPhoto(ROOM, WORK_TYPE, DATE, [image("ดี.jpg")]);

    expect(result.ok).toBe(true);
    const entry = result.ok ? result.data.results[0] : null;
    expect(entry?.success).toBe(true);
    if (entry?.success) expect(stored(entry.item.storage_path)).toBe(true);
  });

  it("refuses a file over the size limit, naming it, and stores nothing", async () => {
    const before = (await photos()).length;

    const result = await uploadPhoto(ROOM, WORK_TYPE, DATE, [oversized()]);

    expect(result.ok).toBe(true);
    const entry = result.ok ? result.data.results[0] : null;
    expect(entry?.success).toBe(false);
    if (entry && !entry.success) {
      expect(entry.error).toContain("ใหญ่เกิน.jpg");
      expect(entry.error).toContain("ไฟล์ใหญ่เกินไป");
    }
    expect((await photos()).length).toBe(before);
  });

  it("refuses a type that is not on the allowlist", async () => {
    const result = await uploadPhoto(ROOM, WORK_TYPE, DATE, [image("สคริปต์.exe", "application/x-msdownload")]);

    const entry = result.ok ? result.data.results[0] : null;
    expect(entry?.success).toBe(false);
    if (entry && !entry.success) expect(entry.error).toContain("ไม่รองรับชนิดไฟล์นี้");
  });

  // One bad file in a folder drop must not cost the person the other nineteen.
  it("stores the good files and reports the bad ones from the same batch", async () => {
    const result = await uploadPhoto(ROOM, WORK_TYPE, DATE, [
      image("หนึ่ง.jpg"),
      oversized("สอง-ใหญ่.jpg"),
      image("สาม.pdf", "application/pdf"),
      image("สี่.exe", "application/x-msdownload"),
    ]);

    expect(result.ok).toBe(true);
    const results = result.ok ? result.data.results : [];
    expect(results.map((r) => [r.fileName, r.success])).toEqual([
      ["หนึ่ง.jpg", true],
      ["สอง-ใหญ่.jpg", false],
      ["สาม.pdf", true],
      ["สี่.exe", false],
    ]);
  });

  it("refuses an upload with no files at all", async () => {
    expect(refusal(await uploadPhoto(ROOM, WORK_TYPE, DATE, []))).toBe("เลือกอย่างน้อย 1 ไฟล์");
  });
});

// ---------------------------------------------------------------------------
// US2 — editing changes only what was asked for
// ---------------------------------------------------------------------------
describe("editing a photo", () => {
  it("changes only the fields passed, leaving the stored file alone", async () => {
    const photo = await seedPhoto("ก่อนแก้.jpg");

    const result = await editPhoto({ photoId: photo.id, fileName: "หลังแก้.jpg" });

    expect(result.ok).toBe(true);
    const updated = (await photos()).find((p) => p.id === photo.id);
    expect(updated?.file_name).toBe("หลังแก้.jpg");
    expect(updated?.date).toBe(photo.date);
    expect(updated?.room_id).toBe(photo.room_id);
    expect(updated?.storage_path).toBe(photo.storage_path);
    expect(stored(photo.storage_path)).toBe(true);
  });

  it("moves a photo to another room and work type when asked", async () => {
    const photo = await seedPhoto("ย้ายห้อง.jpg");

    const result = await editPhoto({ photoId: photo.id, roomId: "hong-klang", workTypeId: "roofing" });

    expect(result.ok).toBe(true);
    expect((await photos()).some((p) => p.id === photo.id)).toBe(false);
    const moved = await localGetPhotos("hong-klang", "roofing");
    expect(moved.find((p) => p.id === photo.id)?.storage_path).toBe(photo.storage_path);
  });

  it("refuses an edit that changes nothing", async () => {
    const photo = await seedPhoto("ไม่แก้อะไร.jpg");
    expect(refusal(await editPhoto({ photoId: photo.id }))).toBe("ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข");
  });
});
