"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, requireRole } from "@/lib/supabase/server";
import {
  addChecklistItemSchema,
  deleteChecklistItemSchema,
  editChecklistItemSchema,
  setChecklistItemRoomStatusSchema,
  setChecklistItemStatusSchema,
} from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import { rollupChecklistStatus, type ChecklistStatus } from "@/lib/checklist-status";
import {
  localAddChecklistItem,
  localDeleteChecklistItem,
  localEditChecklistItem,
  localSetChecklistItemRoomStatus,
  localSetChecklistItemStatus,
} from "@/lib/local/store";
import type { ActionResult, ChecklistItem } from "@/lib/types";

async function assertCanEdit(): Promise<string | null> {
  try {
    await requireRole("editor");
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
    }
    return "คุณไม่มีสิทธิ์ทำรายการนี้";
  }
}

// Both call sites this feature has (the sitewide /checklist page and every
// room's RoomChecklistBox) render from these two paths, so revalidating both
// keeps every place an item can appear in sync (specs/028-room-checklist).
function revalidateChecklistPaths() {
  revalidatePath("/checklist", "page");
  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
}

// parentId (specs/029-checklist-subitems): when present, the new row is a
// sub-item of that parent. Callers only ever pass a parentId that itself has
// no parent (the UI never offers "add a sub" on a sub-item row), keeping
// nesting to one level (research.md Decision 2) — not re-checked here.
//
// A new item tagged to two or more rooms is a single row carrying all of
// them, same as one room (specs/031-checklist-room-completion supersedes
// specs/030's per-room sub-item explosion) — each room's own status is
// tracked on its checklist_item_rooms row instead (setChecklistItemRoomStatus).
// detail/startDate/dueDate (specs/032-checklist-detail-status-colors) are
// optional; a new item always starts as "todo".
export async function addChecklistItem(input: {
  text: string;
  roomIds: string[];
  parentId?: string;
  detail?: string;
  startDate?: string;
  dueDate?: string;
}): Promise<ActionResult<ChecklistItem>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = addChecklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  if (DATA_SOURCE === "local") {
    const item = await localAddChecklistItem(parsed.data);
    revalidateChecklistPaths();
    return { ok: true, data: item };
  }

  const supabase = createServiceClient();

  const { data: item, error: insertError } = await supabase
    .from("checklist_items")
    .insert({
      text: parsed.data.text,
      parent_id: parsed.data.parentId ?? null,
      detail: parsed.data.detail ?? null,
      start_date: parsed.data.startDate ?? null,
      due_date: parsed.data.dueDate ?? null,
    })
    .select("*")
    .single();

  if (insertError || !item) {
    return { ok: false, error: insertError?.message ?? "บันทึกข้อมูลไม่สำเร็จ" };
  }

  if (parsed.data.roomIds.length > 0) {
    const { error: linkError } = await supabase
      .from("checklist_item_rooms")
      .insert(parsed.data.roomIds.map((roomId) => ({ checklist_item_id: item.id, room_id: roomId })));
    if (linkError) {
      return { ok: false, error: linkError.message };
    }
  }

  revalidateChecklistPaths();

  return {
    ok: true,
    data: {
      id: item.id,
      text: item.text,
      detail: item.detail,
      status: item.status as ChecklistStatus,
      start_date: item.start_date,
      due_date: item.due_date,
      room_ids: parsed.data.roomIds,
      room_statuses: parsed.data.roomIds.map((roomId) => ({ room_id: roomId, status: "todo" as ChecklistStatus })),
      parent_id: item.parent_id,
      sub_items: [],
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
  };
}

// Replaces the old boolean toggle (specs/032-checklist-detail-status-colors)
// — the mechanism for an item with no room tags: three states, cascading to
// sub-items when set on a parent, syncing up to a parent when set on a
// sub-item (specs/029-checklist-subitems FR-003/FR-004).
export async function setChecklistItemStatus(
  id: string,
  status: ChecklistStatus
): Promise<ActionResult<{ id: string; status: ChecklistStatus }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = setChecklistItemStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  if (DATA_SOURCE === "local") {
    const item = await localSetChecklistItemStatus(parsed.data.id, parsed.data.status);
    if (!item) {
      return { ok: false, error: "ไม่พบรายการนี้" };
    }
    revalidateChecklistPaths();
    return { ok: true, data: { id: item.id, status: item.status } };
  }

  const supabase = createServiceClient();

  const { data: item, error } = await supabase
    .from("checklist_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id, status, parent_id")
    .single();

  if (error || !item) {
    return { ok: false, error: error?.message ?? "ไม่พบรายการนี้" };
  }

  if (item.parent_id) {
    const { data: siblings, error: siblingsError } = await supabase
      .from("checklist_items")
      .select("status")
      .eq("parent_id", item.parent_id);
    if (siblingsError) {
      return { ok: false, error: siblingsError.message };
    }
    const { error: parentError } = await supabase
      .from("checklist_items")
      .update({ status: rollupChecklistStatus(siblings.map((s) => s.status as ChecklistStatus)) })
      .eq("id", item.parent_id);
    if (parentError) {
      return { ok: false, error: parentError.message };
    }
  } else {
    const { error: cascadeError } = await supabase
      .from("checklist_items")
      .update({ status: parsed.data.status })
      .eq("parent_id", item.id);
    if (cascadeError) {
      return { ok: false, error: cascadeError.message };
    }
  }

  revalidateChecklistPaths();

  return { ok: true, data: { id: item.id, status: item.status as ChecklistStatus } };
}

// A single room tag's own status (specs/031-checklist-room-completion,
// specs/032-checklist-detail-status-colors) — the mechanism for ANY room
// tag regardless of how many others the item has (specs/031 research.md
// Decision 3); ChecklistList/RoomChecklistBox decide when to expose this vs.
// the plain item-level setChecklistItemStatus above.
export async function setChecklistItemRoomStatus(
  itemId: string,
  roomId: string,
  status: ChecklistStatus
): Promise<ActionResult<{ id: string; status: ChecklistStatus; room_id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = setChecklistItemRoomStatusSchema.safeParse({ itemId, roomId, status });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  if (DATA_SOURCE === "local") {
    const result = await localSetChecklistItemRoomStatus(parsed.data.itemId, parsed.data.roomId, parsed.data.status);
    if (!result) {
      return { ok: false, error: "ไม่พบรายการนี้" };
    }
    revalidateChecklistPaths();
    return { ok: true, data: { id: parsed.data.itemId, status: result.status, room_id: parsed.data.roomId } };
  }

  const supabase = createServiceClient();

  const { error: roomError } = await supabase
    .from("checklist_item_rooms")
    .update({ status: parsed.data.status })
    .eq("checklist_item_id", parsed.data.itemId)
    .eq("room_id", parsed.data.roomId);
  if (roomError) {
    return { ok: false, error: roomError.message };
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("checklist_item_rooms")
    .select("status")
    .eq("checklist_item_id", parsed.data.itemId);
  if (roomsError) {
    return { ok: false, error: roomsError.message };
  }

  const derivedStatus = rollupChecklistStatus(rooms.map((r) => r.status as ChecklistStatus));

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .update({ status: derivedStatus })
    .eq("id", parsed.data.itemId)
    .select("id, status, parent_id")
    .single();
  if (itemError || !item) {
    return { ok: false, error: itemError?.message ?? "ไม่พบรายการนี้" };
  }

  // Upward sync only (specs/029-checklist-subitems FR-003) — a room-tagged
  // item's own status control is never directly exposed, so there's no
  // downward cascade path to mirror here (specs/031 research.md Decision 5).
  if (item.parent_id) {
    const { data: siblings, error: siblingsError } = await supabase
      .from("checklist_items")
      .select("status")
      .eq("parent_id", item.parent_id);
    if (siblingsError) {
      return { ok: false, error: siblingsError.message };
    }
    const { error: parentError } = await supabase
      .from("checklist_items")
      .update({ status: rollupChecklistStatus(siblings.map((s) => s.status as ChecklistStatus)) })
      .eq("id", item.parent_id);
    if (parentError) {
      return { ok: false, error: parentError.message };
    }
  }

  revalidateChecklistPaths();

  return {
    ok: true,
    data: { id: item.id, status: item.status as ChecklistStatus, room_id: parsed.data.roomId },
  };
}

export async function editChecklistItem(input: {
  id: string;
  text?: string;
  roomIds?: string[];
  detail?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}): Promise<ActionResult<ChecklistItem>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = editChecklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { id, text, roomIds, detail, startDate, dueDate } = parsed.data;

  if (DATA_SOURCE === "local") {
    const item = await localEditChecklistItem(id, { text, roomIds, detail, startDate, dueDate });
    if (!item) {
      return { ok: false, error: "แก้ไขข้อมูลไม่สำเร็จ" };
    }
    revalidateChecklistPaths();
    return { ok: true, data: item };
  }

  const supabase = createServiceClient();

  if (text !== undefined || detail !== undefined || startDate !== undefined || dueDate !== undefined) {
    const { error } = await supabase
      .from("checklist_items")
      .update({
        ...(text !== undefined ? { text } : {}),
        ...(detail !== undefined ? { detail } : {}),
        ...(startDate !== undefined ? { start_date: startDate } : {}),
        ...(dueDate !== undefined ? { due_date: dueDate } : {}),
      })
      .eq("id", id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  if (roomIds !== undefined) {
    // Full-replace semantics for room tags: clear the old set, insert the
    // new one, rather than diffing (data-model.md's editChecklistItem contract).
    const { error: deleteError } = await supabase
      .from("checklist_item_rooms")
      .delete()
      .eq("checklist_item_id", id);
    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }
    if (roomIds.length > 0) {
      const { error: insertError } = await supabase
        .from("checklist_item_rooms")
        .insert(roomIds.map((roomId) => ({ checklist_item_id: id, room_id: roomId })));
      if (insertError) {
        return { ok: false, error: insertError.message };
      }
      const { error: statusError } = await supabase.from("checklist_items").update({ status: "todo" }).eq("id", id);
      if (statusError) {
        return { ok: false, error: statusError.message };
      }
    }
  }

  const { data: item, error: fetchError } = await supabase
    .from("checklist_items")
    .select("*, checklist_item_rooms(room_id, status)")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return { ok: false, error: fetchError?.message ?? "แก้ไขข้อมูลไม่สำเร็จ" };
  }

  revalidateChecklistPaths();

  return {
    ok: true,
    data: {
      id: item.id,
      text: item.text,
      detail: item.detail,
      status: item.status as ChecklistStatus,
      start_date: item.start_date,
      due_date: item.due_date,
      room_ids: item.checklist_item_rooms.map((r) => r.room_id),
      room_statuses: item.checklist_item_rooms.map((r) => ({ room_id: r.room_id, status: r.status as ChecklistStatus })),
      parent_id: item.parent_id,
      sub_items: [],
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
  };
}

export async function deleteChecklistItem(id: string): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = deleteChecklistItemSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteChecklistItem(parsed.data.id);
    if (!removed) {
      return { ok: false, error: "ไม่พบรายการนี้" };
    }
    revalidateChecklistPaths();
    return { ok: true, data: { id: parsed.data.id } };
  }

  const supabase = createServiceClient();

  // checklist_item_rooms rows cascade-delete via the migration's
  // `on delete cascade` FK, so no explicit junction cleanup needed here.
  const { error } = await supabase.from("checklist_items").delete().eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateChecklistPaths();

  return { ok: true, data: { id: parsed.data.id } };
}
