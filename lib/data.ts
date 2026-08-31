import "server-only";

import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  mockGetChecklistItems,
  mockGetDocumentCategories,
  mockGetDocumentGroups,
  mockGetDocuments,
  mockGetPhotos,
  mockGetRoomChecklistItems,
  mockGetRoomPhotoCounts,
  mockGetRooms,
  mockGetSiteStats,
  mockGetWorkTypes,
} from "@/lib/mock/source";
import {
  localGetChecklistItems,
  localGetDocumentCategories,
  localGetDocumentCountsByCategory,
  localGetAllDocumentGroups,
  localGetDocumentGroups,
  localGetDocuments,
  localGetPhotos,
  localGetRoomChecklistItems,
  localGetRoomPhotoCounts,
  localGetSiteStats,
} from "@/lib/local/store";
import type { DateFilter } from "@/lib/date-filter";
import type { ChecklistItem, Document, DocumentCategory, DocumentGroup, Photo, Room, WorkType } from "@/lib/types";

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
  if (DATA_SOURCE === "mock") return mockGetDocumentCategories();
  // The local backend owns its categories now that they are editable
  // (specs/040-editable-document-taxonomy) rather than borrowing the mock's
  // fixed list.
  if (DATA_SOURCE === "local") return localGetDocumentCategories();

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

// One category's sub-groups, in the order an editor set, each carrying how many
// documents it holds (specs/040-editable-document-taxonomy).
//
// Replaces getDocumentNotes(), whose two faults are what made this feature
// necessary: it could only report names that some document already carried, so
// a group with no files was invisible, and it scanned every category at once,
// so one category's page offered another category's groups. Both are fixed by
// reading real records scoped to the category being viewed (FR-023).
// How many documents each category holds, for the management panel's rows
// (FR-020) — so the effect of a deletion is visible before it is attempted.
export async function getDocumentCountsByCategory(): Promise<Record<string, number>> {
  if (DATA_SOURCE === "mock") return {};
  if (DATA_SOURCE === "local") return localGetDocumentCountsByCategory();

  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("documents").select("category_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

// Every category's groups at once. The per-document move control needs this:
// a document can be moved to any category and any group inside it (FR-026), so
// once a different category is chosen the picker has to be able to offer that
// category's groups, not the ones belonging to the page you happen to be on.
export async function getAllDocumentGroups(): Promise<DocumentGroup[]> {
  if (DATA_SOURCE === "mock") return [];
  if (DATA_SOURCE === "local") return localGetAllDocumentGroups();

  await requireUser();
  const supabase = createServiceClient();
  const [{ data: groups, error: groupsError }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from("document_groups").select("*").order("category_id").order("sort_order"),
    supabase.from("documents").select("group_id"),
  ]);
  if (groupsError) throw groupsError;
  if (documentsError) throw documentsError;

  const counts = new Map<string, number>();
  for (const row of documents) {
    if (row.group_id) counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return groups.map((group) => ({ ...group, document_count: counts.get(group.id) ?? 0 }));
}

export async function getDocumentGroups(categoryId: string): Promise<DocumentGroup[]> {
  if (DATA_SOURCE === "mock") return mockGetDocumentGroups();
  if (DATA_SOURCE === "local") return localGetDocumentGroups(categoryId);

  await requireUser();
  const supabase = createServiceClient();
  const [{ data: groups, error: groupsError }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from("document_groups").select("*").eq("category_id", categoryId).order("sort_order"),
    supabase.from("documents").select("group_id").eq("category_id", categoryId),
  ]);
  if (groupsError) throw groupsError;
  if (documentsError) throw documentsError;

  // Counted here rather than stored: the numbers are small, and a stored
  // counter that drifted would make the delete confirmation lie about how many
  // files are about to be destroyed (FR-011a).
  const counts = new Map<string, number>();
  for (const row of documents) {
    if (row.group_id) counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return groups.map((group) => ({ ...group, document_count: counts.get(group.id) ?? 0 }));
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

// Shape shared by both checklist queries below — a raw Supabase row with its
// room tags (and each tag's own status, specs/031/032) joined in, not yet
// carrying its (separately-fetched) sub_items.
type RawChecklistRow = {
  id: string;
  text: string;
  detail: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  checklist_item_rooms: { room_id: string; status: string }[];
};

function toChecklistItem(row: RawChecklistRow, subItems: ChecklistItem[] = []): ChecklistItem {
  return {
    id: row.id,
    text: row.text,
    detail: row.detail,
    status: row.status as ChecklistItem["status"],
    start_date: row.start_date,
    due_date: row.due_date,
    room_ids: row.checklist_item_rooms.map((r) => r.room_id),
    room_statuses: row.checklist_item_rooms.map((r) => ({
      room_id: r.room_id,
      status: r.status as ChecklistItem["status"],
    })),
    parent_id: row.parent_id,
    sub_items: subItems,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Every top-level checklist item sitewide, most recently created first, each
// carrying its full sub-item list (any status — this is the full-history
// view) — powers the standalone /checklist page (specs/028-room-checklist,
// specs/029-checklist-subitems). room_ids/room_statuses come from a
// joined select on the junction table rather than a second query.
export async function getChecklistItems(): Promise<ChecklistItem[]> {
  if (DATA_SOURCE === "mock") return mockGetChecklistItems();
  if (DATA_SOURCE === "local") return localGetChecklistItems();

  await requireUser();
  const supabase = createServiceClient();

  const { data: topLevel, error: topLevelError } = await supabase
    .from("checklist_items")
    .select("*, checklist_item_rooms(room_id, status)")
    .is("parent_id", null)
    .order("created_at", { ascending: false });
  if (topLevelError) throw topLevelError;
  if (topLevel.length === 0) return [];

  const { data: subs, error: subsError } = await supabase
    .from("checklist_items")
    .select("*, checklist_item_rooms(room_id, status)")
    .in(
      "parent_id",
      topLevel.map((row) => row.id)
    )
    .order("created_at", { ascending: false });
  if (subsError) throw subsError;

  return topLevel.map((row) =>
    toChecklistItem(
      row,
      subs.filter((sub) => sub.parent_id === row.id).map((sub) => toChecklistItem(sub))
    )
  );
}

// Top-level checklist items relevant to one specific room — tagged to it,
// and that room's own tag not yet done (specs/031-checklist-room-completion
// Decision 4, specs/032-checklist-detail-status-colors status !== "done";
// supersedes specs/030's union-of-parent-sets logic, no longer needed since
// every relevant item is directly tagged by construction) — each carrying
// only the not-yet-done sub-items relevant to that room: a sub-item with no
// room tags of its own inherits its parent's rooms (using its own status);
// one with its own tags shows only where that room's tag isn't yet done
// (specs/029-checklist-subitems research.md Decision 4, updated to check
// the tag's own status). Powers the room/work-type page's sidebar checklist
// box.
export async function getRoomChecklistItems(roomId: string): Promise<ChecklistItem[]> {
  if (DATA_SOURCE === "mock") return mockGetRoomChecklistItems();
  if (DATA_SOURCE === "local") return localGetRoomChecklistItems(roomId);

  await requireUser();
  const supabase = createServiceClient();

  const { data: topLevel, error: topLevelError } = await supabase
    .from("checklist_items")
    .select("*, checklist_item_rooms!inner(room_id, status)")
    .eq("checklist_item_rooms.room_id", roomId)
    .neq("checklist_item_rooms.status", "done")
    .is("parent_id", null)
    .order("created_at", { ascending: false });
  if (topLevelError) throw topLevelError;
  if (topLevel.length === 0) return [];

  const { data: subs, error: subsError } = await supabase
    .from("checklist_items")
    .select("*, checklist_item_rooms(room_id, status)")
    .in(
      "parent_id",
      topLevel.map((row) => row.id)
    )
    .neq("status", "done")
    .order("created_at", { ascending: false });
  if (subsError) throw subsError;

  return topLevel.map((row) =>
    toChecklistItem(
      row,
      subs
        .filter((sub) => sub.parent_id === row.id)
        .filter((sub) => {
          if (sub.checklist_item_rooms.length === 0) return true; // inherits the parent's rooms
          const tag = sub.checklist_item_rooms.find((r) => r.room_id === roomId);
          return !!tag && tag.status !== "done";
        })
        .map((sub) => toChecklistItem(sub))
    )
  );
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
