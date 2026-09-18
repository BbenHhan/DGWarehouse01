import { NextResponse } from "next/server";
import { getDocumentCategories, getDocumentGroups, getDocuments } from "@/lib/data";
import { archiveFileName, categoryArchiveEntries } from "@/lib/document-archive";
import { requireUser } from "@/lib/supabase/server";
import { zipStream } from "@/lib/zip";

// A route handler rather than a Server Action: this is a read that has to
// arrive as a file the browser saves, and Constitution II reserves Server
// Actions for mutations. It sits beside the other two read-only file routes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Header values must be Latin-1: a Thai character in the fallback name throws
// while the response is being constructed, turning a download into a 500. Slugs
// are ASCII today ("checklist-permit", "category-7"), so this is a guard rather
// than a fix for something seen in production (specs/047 research Decision 4).
function asciiFallbackName(slug: string): string {
  const safe = slug.replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "").trim();
  return `${safe.length > 0 ? safe : "documents"}.zip`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categorySlug: string }> }
) {
  const { categorySlug } = await params;

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดาวน์โหลด" }, { status: 401 });
  }

  const categories = await getDocumentCategories();
  const category = categories.find((candidate) => candidate.slug === categorySlug);
  if (!category) {
    return NextResponse.json({ error: "ไม่พบหมวดนี้" }, { status: 404 });
  }

  const [groups, documents] = await Promise.all([
    getDocumentGroups(category.id),
    getDocuments(category.id),
  ]);

  const fileName = archiveFileName(category);
  const body = zipStream(categoryArchiveEntries(category, groups, documents));

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      // Both forms: the ASCII fallback keeps an old client from choking, and
      // filename* is what actually carries the Thai name (RFC 5987).
      "Content-Disposition":
        `attachment; filename="${asciiFallbackName(category.slug)}"; ` +
        `filename*=UTF-8''${encodeURIComponent(fileName)}`,
      // The archive is built per request from live rows; a cached copy would
      // hand someone yesterday's documents.
      "Cache-Control": "no-store",
    },
  });
}
