import "server-only";

import { createServiceClient, requireUser } from "@/lib/supabase/server";
import type { Document, DocumentCategory, Photo, Room, Week, WorkType } from "@/lib/types";

export async function getRooms(): Promise<Room[]> {
  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("rooms").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getWorkTypes(): Promise<WorkType[]> {
  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("work_types").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getWeeks(roomId: string, workTypeId: string): Promise<Week[]> {
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
  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("weeks").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function getPhotos(weekId: string): Promise<Photo[]> {
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
