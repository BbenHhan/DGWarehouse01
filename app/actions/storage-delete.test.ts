import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseStub } from "@/lib/supabase-stub";

// specs/048-server-action-coverage, research Decision 3.
//
// Production runs the Supabase branch of delete, not the local one, and the
// rule worth protecting lives only there: the stored object goes first, then the
// row. A row deleted while its file remains leaves an object nobody can reach
// through the app; a file removed while the row remains leaves a listing
// pointing at nothing.
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "supabase", USE_MOCK_DATA: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireRole = vi.fn();
let stub = createSupabaseStub();
vi.mock("@/lib/supabase/server", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  createServiceClient: () => stub.client,
}));

const { deletePhoto } = await import("@/app/actions/photos");
const { deleteDoc } = await import("@/app/actions/documents");

const PHOTO = { id: "p1", storage_path: "hong-raek-firewalls/p1-งานผนัง.jpg" };
const DOCUMENT = { id: "d1", storage_path: "cat-6/d1-ใบรับรอง.pdf" };

beforeEach(() => {
  requireRole.mockReset();
  requireRole.mockResolvedValue({ role: "editor" });
});

describe("deleting a photo through Supabase", () => {
  it("removes the stored object, then the row", async () => {
    stub = createSupabaseStub({
      tables: { photos: [{ data: PHOTO, error: null }, { data: null, error: null }] },
      storage: { photos: { data: null, error: null } },
    });

    const result = await deletePhoto(PHOTO.id);

    expect(result).toEqual({ ok: true, data: { photoId: PHOTO.id } });
    const trail = stub.trail();
    expect(trail).toContain("photos.storage.remove");
    expect(trail).toContain("photos.delete");
    expect(trail.indexOf("photos.storage.remove")).toBeLessThan(trail.indexOf("photos.delete"));
    expect(stub.calls.find((c) => c.method === "storage.remove")?.args[0]).toEqual([PHOTO.storage_path]);
  });

  // Otherwise the listing would lose the row while the file stayed behind.
  it("leaves the row alone when the stored object cannot be removed", async () => {
    stub = createSupabaseStub({
      tables: { photos: { data: PHOTO, error: null } },
      storage: { photos: { data: null, error: { message: "storage unavailable" } } },
    });

    const result = await deletePhoto(PHOTO.id);

    expect(result).toEqual({ ok: false, error: "storage unavailable" });
    expect(stub.trail()).not.toContain("photos.delete");
  });

  it("says so when the photo does not exist, and removes nothing", async () => {
    stub = createSupabaseStub({
      tables: { photos: { data: null, error: { message: "no rows" } } },
    });

    const result = await deletePhoto(PHOTO.id);

    expect(result).toEqual({ ok: false, error: "ไม่พบรูปภาพนี้" });
    expect(stub.trail()).not.toContain("photos.storage.remove");
    expect(stub.trail()).not.toContain("photos.delete");
  });
});

describe("deleting a document through Supabase", () => {
  it("removes the stored object, then the row", async () => {
    stub = createSupabaseStub({
      tables: { documents: [{ data: DOCUMENT, error: null }, { data: null, error: null }] },
      storage: { documents: { data: null, error: null } },
    });

    const result = await deleteDoc(DOCUMENT.id);

    expect(result).toEqual({ ok: true, data: { documentId: DOCUMENT.id } });
    const trail = stub.trail();
    expect(trail.indexOf("documents.storage.remove")).toBeLessThan(trail.indexOf("documents.delete"));
    expect(stub.calls.find((c) => c.method === "storage.remove")?.args[0]).toEqual([DOCUMENT.storage_path]);
  });

  it("leaves the row alone when the stored object cannot be removed", async () => {
    stub = createSupabaseStub({
      tables: { documents: { data: DOCUMENT, error: null } },
      storage: { documents: { data: null, error: { message: "storage unavailable" } } },
    });

    const result = await deleteDoc(DOCUMENT.id);

    expect(result).toEqual({ ok: false, error: "storage unavailable" });
    expect(stub.trail()).not.toContain("documents.delete");
  });

  it("says so when the document does not exist, and removes nothing", async () => {
    stub = createSupabaseStub({ tables: { documents: { data: null, error: { message: "no rows" } } } });

    const result = await deleteDoc(DOCUMENT.id);

    expect(result).toEqual({ ok: false, error: "ไม่พบเอกสารนี้" });
    expect(stub.trail()).not.toContain("documents.storage.remove");
  });
});

describe("the rights gate applies to the Supabase branch too", () => {
  it("refuses a viewer before any query is made", async () => {
    stub = createSupabaseStub({ tables: { photos: { data: PHOTO, error: null } } });
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    expect(await deletePhoto(PHOTO.id)).toEqual({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
    expect(await deleteDoc(DOCUMENT.id)).toEqual({ ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
    expect(stub.calls).toEqual([]);
  });
});
