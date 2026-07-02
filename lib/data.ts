import "server-only";

import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { USE_MOCK_DATA } from "@/lib/data-config";
import {
  mockGetAllWeeks,
  mockGetDocumentCategories,
  mockGetDocuments,
  mockGetPhotos,
  mockGetRoomPhotoCounts,
  mockGetRooms,
  mockGetSiteStats,
  mockGetWeeks,
  mockGetWorkTypes,
} from "@/lib/mock/source";
import type { Document, DocumentCategory, Photo, Room, Week, WorkType } from "@/lib/types";

export async function getRooms(): Promise<Room[]> {
  if (USE_MOCK_DATA) return mockGetRooms();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("rooms").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getWorkTypes(): Promise<WorkType[]> {
  if (USE_MOCK_DATA) return mockGetWorkTypes();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("work_types").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getWeeks(roomId: string, workTypeId: string): Promise<Week[]> {
  if (USE_MOCK_DATA) return mockGetWeeks(roomId, workTypeId);

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .eq("room_id", roomId)
    .eq("work_type_id", workTypeId)
    .order("week_number");
  if (error) throw error;
  return data;
}

// Unfiltered — used only to populate the "move to a different week" picker
// in EditModal, since a photo can move to any room/work-type/week (FR-008).
export async function getAllWeeks(): Promise<Week[]> {
  if (USE_MOCK_DATA) return mockGetAllWeeks();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("weeks").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function getPhotos(weekId: string): Promise<Photo[]> {
  if (USE_MOCK_DATA) return mockGetPhotos(weekId);

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("week_id", weekId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  if (USE_MOCK_DATA) return mockGetDocumentCategories();

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
  if (USE_MOCK_DATA) return mockGetDocuments(categoryId);

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

// Header stats chips (total photos/documents/distinct weeks site-wide).
export async function getSiteStats(): Promise<{
  totalPhotos: number;
  totalDocuments: number;
  totalWeeks: number;
}> {
  if (USE_MOCK_DATA) return mockGetSiteStats();

  await requireUser();
  const supabase = createServiceClient();
  const [{ count: totalPhotos }, { count: totalDocuments }, { data: weeks }] = await Promise.all([
    supabase.from("photos").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("weeks").select("week_number"),
  ]);
  const totalWeeks = new Set((weeks ?? []).map((week) => week.week_number)).size;
  return { totalPhotos: totalPhotos ?? 0, totalDocuments: totalDocuments ?? 0, totalWeeks };
}

// Total photo count per room, across every work type/week — sidebar badges.
export async function getRoomPhotoCounts(): Promise<Record<string, number>> {
  if (USE_MOCK_DATA) return mockGetRoomPhotoCounts();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("photos").select("week_id, weeks!inner(room_id)");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data as unknown as Array<{ weeks: { room_id: string } }>) {
    const roomId = row.weeks.room_id;
    counts[roomId] = (counts[roomId] ?? 0) + 1;
  }
  return counts;
}
