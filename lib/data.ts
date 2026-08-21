import "server-only";

import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  mockGetDocumentCategories,
  mockGetDocuments,
  mockGetPhotos,
  mockGetRoomPhotoCounts,
  mockGetRooms,
  mockGetSiteStats,
  mockGetWorkTypes,
} from "@/lib/mock/source";
import {
  localGetDocuments,
  localGetPhotos,
  localGetRoomPhotoCounts,
  localGetSiteStats,
} from "@/lib/local/store";
import type { DateFilter } from "@/lib/date-filter";
import type { Document, DocumentCategory, Photo, Room, WorkType } from "@/lib/types";

// Rooms/work types/document categories are the same fixed lookup lists in
// both non-Supabase modes ("local" and "mock") — neither depends on disk
// state, so both share the mock module's static arrays instead of a
// duplicate copy living in lib/local/store.ts (Constitution VIII: one
// source of truth per list).
export async function getRooms(): Promise<Room[]> {
  if (DATA_SOURCE !== "supabase") return mockGetRooms();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("rooms").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getWorkTypes(): Promise<WorkType[]> {
  if (DATA_SOURCE !== "supabase") return mockGetWorkTypes();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("work_types").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

// Every photo for a room+work-type, most recent date first, optionally
// narrowed to a [from, to] range — replaces the old per-week fetch entirely
// (specs/018-per-photo-dates). `filter` mirrors lib/date-filter.ts's
// semantics: an unset from/to is unfiltered on that end; a reversed range
// (from > to) is treated as unfiltered here too, applied before the query is
// built so the two never disagree.
export async function getPhotos(
  roomId: string,
  workTypeId: string,
  filter?: DateFilter
): Promise<Photo[]> {
  const from = filter?.from && filter?.to && filter.from > filter.to ? undefined : filter?.from;
  const to = filter?.from && filter?.to && filter.from > filter.to ? undefined : filter?.to;

  if (DATA_SOURCE === "mock") return mockGetPhotos(roomId, workTypeId, { from, to });
  if (DATA_SOURCE === "local") return localGetPhotos(roomId, workTypeId, { from, to });

  await requireUser();
  const supabase = createServiceClient();
  let query = supabase
    .from("photos")
    .select("*")
    .eq("room_id", roomId)
    .eq("work_type_id", workTypeId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query.order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  if (DATA_SOURCE !== "supabase") return mockGetDocumentCategories();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getDocuments(categoryId: string): Promise<Document[]> {
  if (DATA_SOURCE === "mock") return mockGetDocuments(categoryId);
  if (DATA_SOURCE === "local") return localGetDocuments(categoryId);

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at");
  if (error) throw error;
  return data;
}

// Header stats chips (total photos/documents/distinct photographed days
// site-wide). `totalDays` replaces the old `totalWeeks` stat — the closest
// still-meaningful analog now that there's no week container to count
// (specs/018-per-photo-dates/research.md Decision 6).
export async function getSiteStats(): Promise<{
  totalPhotos: number;
  totalDocuments: number;
  totalDays: number;
}> {
  if (DATA_SOURCE === "mock") return mockGetSiteStats();
  if (DATA_SOURCE === "local") return localGetSiteStats();

  await requireUser();
  const supabase = createServiceClient();
  const [{ count: totalPhotos }, { count: totalDocuments }, { data: photos }] = await Promise.all([
    supabase.from("photos").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("photos").select("date"),
  ]);
  const totalDays = new Set((photos ?? []).map((photo) => photo.date)).size;
  return { totalPhotos: totalPhotos ?? 0, totalDocuments: totalDocuments ?? 0, totalDays };
}

// Total photo count per room, across every work type/date — sidebar badges.
export async function getRoomPhotoCounts(): Promise<Record<string, number>> {
  if (DATA_SOURCE === "mock") return mockGetRoomPhotoCounts();
  if (DATA_SOURCE === "local") return localGetRoomPhotoCounts();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("photos").select("room_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.room_id] = (counts[row.room_id] ?? 0) + 1;
  }
  return counts;
}
