import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseZip } from "@/lib/zip-test-helpers";

// specs/047-category-zip-download US3 — the download link's boundary, which the
// draft shipped without any test at all. Runs against the local backend so the
// bytes returned are a real archive built from real stored files.
vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "local", USE_MOCK_DATA: false }));

const requireUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireUser: (...a: unknown[]) => requireUser(...a),
  createServiceClient: () => {
    throw new Error("no Supabase client should be built in local mode");
  },
}));

const { GET } = await import("@/app/api/documents/[categorySlug]/zip/route");
const { localCreateDocumentCategory, localCreateDocumentGroup, localSaveDocumentFile } = await import(
  "@/lib/local/store"
);

function call(categorySlug: string) {
  return GET(new Request("http://localhost/api/documents/x/zip"), {
    params: Promise.resolve({ categorySlug }),
  });
}

async function seed() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const category = await localCreateDocumentCategory(`หมวดดาวน์โหลด ${suffix}`, "📦");
  if (!category) throw new Error("could not seed a category");
  const withFiles = await localCreateDocumentGroup(category.id, "ใบรับรอง");
  const empty = await localCreateDocumentGroup(category.id, "ผลทดสอบ");
  if (!withFiles || !empty) throw new Error("could not seed groups");
  await localSaveDocumentFile(
    category.id,
    withFiles.id,
    new File(["ใบเซอประตูม้วน"], "ใบเซอ.pdf", { type: "application/pdf" })
  );
  return { category, withFiles, empty };
}

beforeEach(() => {
  requireUser.mockReset();
  requireUser.mockResolvedValue({ id: "u1" });
});

describe("who may download", () => {
  it("refuses someone not signed in, in Thai, with no archive", async () => {
    const { category } = await seed();
    requireUser.mockRejectedValue(new Error("UNAUTHENTICATED"));

    const response = await call(category.slug);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "กรุณาเข้าสู่ระบบก่อนดาวน์โหลด" });
    expect(response.headers.get("Content-Type")).not.toContain("zip");
  });

  // Constitution VII: every signed-in role may view all documents, and the
  // archive holds nothing the page does not already show.
  it("lets a signed-in viewer download", async () => {
    const { category } = await seed();
    requireUser.mockResolvedValue({ id: "u1", role: "viewer" });

    expect((await call(category.slug)).status).toBe(200);
  });
});

describe("an address that is not a category", () => {
  it("says so in Thai", async () => {
    const response = await call("ไม่มีหมวดนี้จริง");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "ไม่พบหมวดนี้" });
  });
});

describe("a successful download", () => {
  it("is sent as a file named after the category, with an ASCII fallback", async () => {
    const { category } = await seed();

    const response = await call(category.slug);
    const disposition = response.headers.get("Content-Disposition") ?? "";

    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(disposition).toContain(`filename="${category.slug}.zip"`);
    expect(disposition).toContain(
      `filename*=UTF-8''${encodeURIComponent(`หมวดที่ ${category.sort_order} ${category.name_th}.zip`)}`
    );
    // The fallback is what an old client reads; it must survive a Latin-1 header.
    const fallback = disposition.match(/filename="([^"]+)"/)?.[1] ?? "";
    expect(fallback).toMatch(/^[\x20-\x7E]+$/);
  });

  // Built from live rows; a cached copy would hand back yesterday's documents.
  it("is never cached", async () => {
    const { category } = await seed();
    expect((await call(category.slug)).headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns a real archive holding the category's folders and files", async () => {
    const { category, withFiles, empty } = await seed();

    const response = await call(category.slug);
    const entries = parseZip(Buffer.from(await response.arrayBuffer()));

    const root = `หมวดที่ ${category.sort_order} ${category.name_th}`;
    expect(entries.map((entry) => entry.name)).toEqual([
      `${root}/`,
      `${root}/${category.sort_order}.${withFiles.sort_order} ใบรับรอง/`,
      `${root}/${category.sort_order}.${withFiles.sort_order} ใบรับรอง/ใบเซอ.pdf`,
      `${root}/${category.sort_order}.${empty.sort_order} ผลทดสอบ/`,
    ]);
    expect(entries.every((entry) => entry.utf8Flag)).toBe(true);
    expect(entries[3].isDirectory).toBe(true);
    expect(new TextDecoder().decode(entries[2].contents)).toBe("ใบเซอประตูม้วน");
  });
});

// The fallback only has work to do when the slug is not ASCII. Slugs are
// generated ASCII today ("category-7"), so this stands one up directly: without
// the guard, building the response throws and the download becomes a 500.
describe("a category whose address is not ASCII", () => {
  it("still downloads, under a plain fallback name", async () => {
    vi.resetModules();
    vi.doMock("@/lib/data", () => ({
      getDocumentCategories: async () => [
        { id: "c1", slug: "หมวดไทย", name_th: "หมวดไทย", emoji: "📦", sort_order: 9 },
      ],
      getDocumentGroups: async () => [],
      getDocuments: async () => [],
    }));
    const { GET: guardedGet } = await import("@/app/api/documents/[categorySlug]/zip/route");

    const response = await guardedGet(new Request("http://localhost/x"), {
      params: Promise.resolve({ categorySlug: "หมวดไทย" }),
    });

    expect(response.status).toBe(200);
    const disposition = response.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain('filename="documents.zip"');
    expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent("หมวดที่ 9 หมวดไทย.zip")}`);
    vi.doUnmock("@/lib/data");
  });
});
