"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, requireRole } from "@/lib/supabase/server";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  addRequirementSchema,
  deleteRequirementSchema,
  moveRequirementSchema,
  setCategoryDescriptionSchema,
  setGroupDescriptionSchema,
  updateRequirementSchema,
} from "@/lib/validation";
import {
  localAddRequirement,
  localDeleteRequirement,
  localMoveRequirement,
  localSetCategoryDescription,
  localSetGroupDescription,
  localUpdateRequirement,
} from "@/lib/local/store";
import type { ActionResult, GroupRequirement } from "@/lib/types";

// specs/046-subgroup-requirement-checklist, contracts/server-actions.md.
//
// Same gate as the rest of the taxonomy: editor, not admin (Constitution VII).
// Checked before anything is parsed or read, so a refused call changes nothing
// and learns nothing (FR-013).
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

const MOCK_REFUSAL = "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้";
const NOT_MIGRATED = "ยังไม่ได้เปิดใช้รายการเอกสารที่ต้องมี (ต้องรัน migration 0015 ก่อน)";
const ITEM_NOT_FOUND = "ไม่พบรายการนี้";
const GROUP_NOT_FOUND = "ไม่พบหมวดย่อยนี้";
const CATEGORY_NOT_FOUND = "ไม่พบหมวดนี้";

// Migration 0015 is applied by hand in the SQL Editor, so a deploy can reach
// production before it (research Decision 4). A missing table (PGRST205 /
// 42P01) or column (PGRST204 / 42703) means exactly that, and is worth saying
// in words rather than as a database error.
function isNotMigrated(error: { code?: string } | null | undefined): boolean {
  return ["PGRST205", "42P01", "PGRST204", "42703"].includes(error?.code ?? "");
}

function failure(error: { code?: string; message?: string } | null | undefined, fallback: string): string {
  if (isNotMigrated(error)) return NOT_MIGRATED;
  return error?.message ?? fallback;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

function revalidateDocumentPaths() {
  revalidatePath("/documents", "page");
  revalidatePath("/documents/[categorySlug]", "page");
}

const ITEM_COLUMNS = "id, group_id, name_th, status, note, sort_order";

export async function addRequirement(input: {
  groupId: string;
  nameTh: string;
  status?: GroupRequirement["status"];
  note?: string | null;
}): Promise<ActionResult<GroupRequirement>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = addRequirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { groupId, nameTh, status, note } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const item = await localAddRequirement({ groupId, nameTh, status, note });
    if (!item) return { ok: false, error: GROUP_NOT_FOUND };
    revalidateDocumentPaths();
    return { ok: true, data: item };
  }

  const supabase = createServiceClient();
  const { data: group, error: groupError } = await supabase
    .from("document_groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError) return { ok: false, error: failure(groupError, "เพิ่มรายการไม่สำเร็จ") };
  if (!group) return { ok: false, error: GROUP_NOT_FOUND };

  // Appended last; positions are contiguous, so the next one is the count + 1.
  const { count, error: countError } = await supabase
    .from("document_group_requirements")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if (countError) return { ok: false, error: failure(countError, "เพิ่มรายการไม่สำเร็จ") };

  const { data: item, error } = await supabase
    .from("document_group_requirements")
    .insert({ group_id: groupId, name_th: nameTh, status, note, sort_order: (count ?? 0) + 1 })
    .select(ITEM_COLUMNS)
    .single();
  if (error || !item) return { ok: false, error: failure(error, "เพิ่มรายการไม่สำเร็จ") };

  revalidateDocumentPaths();
  return { ok: true, data: item };
}

export async function updateRequirement(input: {
  id: string;
  nameTh?: string;
  status?: GroupRequirement["status"];
  note?: string | null;
}): Promise<ActionResult<GroupRequirement>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = updateRequirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { id, nameTh, status, note } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const item = await localUpdateRequirement(id, { nameTh, status, note });
    if (!item) return { ok: false, error: ITEM_NOT_FOUND };
    revalidateDocumentPaths();
    return { ok: true, data: item };
  }

  const patch: {
    name_th?: string;
    status?: GroupRequirement["status"];
    note?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (nameTh !== undefined) patch.name_th = nameTh;
  if (status !== undefined) patch.status = status;
  if (note !== undefined) patch.note = note;

  const supabase = createServiceClient();
  const { data: item, error } = await supabase
    .from("document_group_requirements")
    .update(patch)
    .eq("id", id)
    .select(ITEM_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, error: failure(error, "บันทึกไม่สำเร็จ") };
  if (!item) return { ok: false, error: ITEM_NOT_FOUND };

  revalidateDocumentPaths();
  return { ok: true, data: item };
}

// Rewrites positions 1..n for one sub-group's items in the given order. Single
// row updates — the lists are a handful long, and only rows whose position
// actually changes are written.
async function renumberItems(
  supabase: ReturnType<typeof createServiceClient>,
  ordered: { id: string; sort_order: number }[]
): Promise<string | null> {
  for (const [index, item] of ordered.entries()) {
    const position = index + 1;
    if (item.sort_order === position) continue;
    const { error } = await supabase
      .from("document_group_requirements")
      .update({ sort_order: position })
      .eq("id", item.id);
    if (error) return failure(error, "จัดลำดับไม่สำเร็จ");
  }
  return null;
}

export async function deleteRequirement(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = deleteRequirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { id } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteRequirement(id);
    if (!removed) return { ok: false, error: ITEM_NOT_FOUND };
    revalidateDocumentPaths();
    return { ok: true, data: removed };
  }

  const supabase = createServiceClient();
  const { data: removed, error } = await supabase
    .from("document_group_requirements")
    .delete()
    .eq("id", id)
    .select("group_id")
    .maybeSingle();
  if (error) return { ok: false, error: failure(error, "ลบรายการไม่สำเร็จ") };
  if (!removed) return { ok: false, error: ITEM_NOT_FOUND };

  const { data: rest, error: restError } = await supabase
    .from("document_group_requirements")
    .select("id, sort_order")
    .eq("group_id", removed.group_id)
    .order("sort_order");
  if (restError) return { ok: false, error: failure(restError, "จัดลำดับไม่สำเร็จ") };
  const problem = await renumberItems(supabase, rest);
  if (problem) return { ok: false, error: problem };

  revalidateDocumentPaths();
  return { ok: true, data: { id } };
}

export async function moveRequirement(input: {
  id: string;
  direction: "up" | "down";
}): Promise<ActionResult<GroupRequirement[]>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = moveRequirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { id, direction } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const result = await localMoveRequirement(id, direction);
    if (result === null) return { ok: false, error: ITEM_NOT_FOUND };
    if (result === "edge") return { ok: false, error: "ย้ายต่อไม่ได้แล้ว" };
    revalidateDocumentPaths();
    return { ok: true, data: result };
  }

  const supabase = createServiceClient();
  const { data: item, error: itemError } = await supabase
    .from("document_group_requirements")
    .select("group_id")
    .eq("id", id)
    .maybeSingle();
  if (itemError) return { ok: false, error: failure(itemError, "จัดลำดับไม่สำเร็จ") };
  if (!item) return { ok: false, error: ITEM_NOT_FOUND };

  const { data: siblings, error: siblingsError } = await supabase
    .from("document_group_requirements")
    .select(ITEM_COLUMNS)
    .eq("group_id", item.group_id)
    .order("sort_order");
  if (siblingsError) return { ok: false, error: failure(siblingsError, "จัดลำดับไม่สำเร็จ") };

  const index = siblings.findIndex((sibling) => sibling.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return { ok: false, error: "ย้ายต่อไม่ได้แล้ว" };

  const ordered = [...siblings];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const problem = await renumberItems(supabase, ordered);
  if (problem) return { ok: false, error: problem };

  revalidateDocumentPaths();
  return { ok: true, data: ordered.map((sibling, position) => ({ ...sibling, sort_order: position + 1 })) };
}

export async function setGroupDescription(input: {
  groupId: string;
  description: string | null;
}): Promise<ActionResult<{ id: string; description: string | null }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = setGroupDescriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { groupId, description } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const result = await localSetGroupDescription(groupId, description);
    if (!result) return { ok: false, error: GROUP_NOT_FOUND };
    revalidateDocumentPaths();
    return { ok: true, data: result };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_groups")
    .update({ description })
    .eq("id", groupId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: failure(error, "บันทึกคำอธิบายไม่สำเร็จ") };
  if (!data) return { ok: false, error: GROUP_NOT_FOUND };

  revalidateDocumentPaths();
  return { ok: true, data: { id: data.id, description } };
}

export async function setCategoryDescription(input: {
  categoryId: string;
  description: string | null;
}): Promise<ActionResult<{ id: string; description: string | null }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = setCategoryDescriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  const { categoryId, description } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: MOCK_REFUSAL };

  if (DATA_SOURCE === "local") {
    const result = await localSetCategoryDescription(categoryId, description);
    if (!result) return { ok: false, error: CATEGORY_NOT_FOUND };
    revalidateDocumentPaths();
    return { ok: true, data: result };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_categories")
    .update({ description })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: failure(error, "บันทึกคำอธิบายไม่สำเร็จ") };
  if (!data) return { ok: false, error: CATEGORY_NOT_FOUND };

  revalidateDocumentPaths();
  return { ok: true, data: { id: data.id, description } };
}
