"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, requireRole } from "@/lib/supabase/server";
import {
  createCategorySchema,
  createGroupSchema,
  deleteCategorySchema,
  deleteGroupSchema,
  moveCategorySchema,
  moveGroupSchema,
  renameCategorySchema,
  renameGroupSchema,
} from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  localCreateDocumentCategory,
  localCreateDocumentGroup,
  localMoveDocumentCategory,
  localMoveDocumentGroup,
  localRenameDocumentCategory,
  localCountDocumentsIn,
  localDeleteDocumentCategory,
  localDeleteDocumentGroup,
  localDeleteDocumentsIn,
  localMoveDocumentsIn,
  localRenameDocumentGroup,
  nextCategorySlug,
} from "@/lib/local/store";
import type { ActionResult, DocumentCategory, DocumentGroup } from "@/lib/types";

// specs/040-editable-document-taxonomy.
//
// The role gate here is "editor", not "admin". The feature was first briefed as
// admin-only, and that was overturned during clarification: Constitution VII
// gives the admin role exactly one power the editor role lacks — changing an
// account's role — so gating the taxonomy behind admin would quietly add a
// second one (spec FR-015, FR-017a).
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

// Both the sitewide list and each category's page render from these paths.
function revalidateDocumentPaths() {
  revalidatePath("/documents", "page");
  revalidatePath("/documents/[categorySlug]", "page");
}

export async function createGroup(input: {
  categoryId: string;
  nameTh: string;
}): Promise<ActionResult<DocumentGroup>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { categoryId, nameTh } = parsed.data;

  if (DATA_SOURCE === "mock") {
    return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };
  }

  if (DATA_SOURCE === "local") {
    const group = await localCreateDocumentGroup(categoryId, nameTh);
    if (!group) return { ok: false, error: "มีหมวดย่อยชื่อนี้อยู่แล้วในหมวดนี้" };
    revalidateDocumentPaths();
    return { ok: true, data: group };
  }

  const supabase = createServiceClient();

  // Appended last. sort_order is contiguous within a category, so the next
  // position is simply how many siblings there already are.
  const { count } = await supabase
    .from("document_groups")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { data: group, error } = await supabase
    .from("document_groups")
    .insert({ category_id: categoryId, name_th: nameTh, sort_order: (count ?? 0) + 1 })
    .select("*")
    .single();

  if (error || !group) {
    // 23505 is the unique (category_id, name_th) constraint — the one case
    // worth naming, since it is the user's mistake rather than a fault.
    const duplicate = error?.code === "23505";
    return {
      ok: false,
      error: duplicate ? "มีหมวดย่อยชื่อนี้อยู่แล้วในหมวดนี้" : error?.message ?? "เพิ่มหมวดย่อยไม่สำเร็จ",
    };
  }

  revalidateDocumentPaths();
  return { ok: true, data: { ...group, document_count: 0 } };
}

// Renaming is one write against one row. No document is read, updated, or
// re-uploaded — which is the whole reason sub-groups became records
// (FR-009): correcting a name used to mean correcting the identical string on
// every document carrying it, and missing one silently split the group in two.
export async function renameGroup(input: { id: string; nameTh: string }): Promise<ActionResult<DocumentGroup>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = renameGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { id, nameTh } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  if (DATA_SOURCE === "local") {
    const group = await localRenameDocumentGroup(id, nameTh);
    if (!group) return { ok: false, error: "มีหมวดย่อยชื่อนี้อยู่แล้วในหมวดนี้" };
    revalidateDocumentPaths();
    return { ok: true, data: group };
  }

  const supabase = createServiceClient();
  const { data: group, error } = await supabase
    .from("document_groups")
    .update({ name_th: nameTh })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !group) {
    const duplicate = error?.code === "23505";
    return {
      ok: false,
      error: duplicate ? "มีหมวดย่อยชื่อนี้อยู่แล้วในหมวดนี้" : error?.message ?? "เปลี่ยนชื่อไม่สำเร็จ",
    };
  }

  revalidateDocumentPaths();
  return { ok: true, data: { ...group, document_count: 0 } };
}

// Changes the display name and icon only. The slug is not accepted as input
// anywhere in this module, so a rename can never break a live URL (FR-013).
export async function renameCategory(input: {
  id: string;
  nameTh?: string;
  emoji?: string;
}): Promise<ActionResult<DocumentCategory>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = renameCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { id, nameTh, emoji } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  if (DATA_SOURCE === "local") {
    const category = await localRenameDocumentCategory(id, { nameTh, emoji });
    if (!category) return { ok: false, error: "เปลี่ยนชื่อไม่สำเร็จ" };
    revalidateDocumentPaths();
    return { ok: true, data: category };
  }

  const supabase = createServiceClient();
  const { data: category, error } = await supabase
    .from("document_categories")
    .update({
      ...(nameTh !== undefined ? { name_th: nameTh } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !category) {
    return { ok: false, error: error?.message ?? "เปลี่ยนชื่อไม่สำเร็จ" };
  }

  revalidateDocumentPaths();
  return { ok: true, data: category };
}

// Swap with the neighbour, then renumber the whole sibling set to a contiguous
// 1..n. Dense renumbering rather than sparse gaps: the lists are four
// categories and a handful of groups, so rewriting every row costs nothing and
// keeps the numbers readable (research.md Decision 3).
//
// Supabase has no multi-row update with different values per row, so the
// renumber is a sequence of single-row updates. The lists are small enough that
// this is a handful of statements, and an interrupted run leaves a valid
// ordering — just not the intended one, which the next move corrects.
async function renumber(
  table: "document_groups" | "document_categories",
  ordered: { id: string }[]
): Promise<string | null> {
  const supabase = createServiceClient();
  for (const [position, row] of ordered.entries()) {
    const { error } = await supabase
      .from(table)
      .update({ sort_order: position + 1 })
      .eq("id", row.id);
    if (error) return error.message;
  }
  return null;
}

function swapped<T extends { id: string }>(ordered: T[], id: string, direction: "up" | "down"): T[] | null {
  const index = ordered.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  // Already first, or already last. The UI does not offer the action, but the
  // server refuses it too rather than trusting that.
  if (target < 0 || target >= ordered.length) return null;
  const next = [...ordered];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export async function moveGroup(input: {
  id: string;
  direction: "up" | "down";
}): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = moveGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { id, direction } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  if (DATA_SOURCE === "local") {
    const moved = await localMoveDocumentGroup(id, direction);
    if (!moved) return { ok: false, error: "ย้ายลำดับไม่ได้" };
    revalidateDocumentPaths();
    return { ok: true, data: { id } };
  }

  const supabase = createServiceClient();
  const { data: group } = await supabase.from("document_groups").select("category_id").eq("id", id).single();
  if (!group) return { ok: false, error: "ไม่พบหมวดย่อยนี้" };

  const { data: siblings } = await supabase
    .from("document_groups")
    .select("id")
    .eq("category_id", group.category_id)
    .order("sort_order");

  const next = swapped(siblings ?? [], id, direction);
  if (!next) return { ok: false, error: "ย้ายลำดับไม่ได้" };

  const error = await renumber("document_groups", next);
  if (error) return { ok: false, error };

  revalidateDocumentPaths();
  return { ok: true, data: { id } };
}

export async function moveCategory(input: {
  id: string;
  direction: "up" | "down";
}): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = moveCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { id, direction } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  if (DATA_SOURCE === "local") {
    const moved = await localMoveDocumentCategory(id, direction);
    if (!moved) return { ok: false, error: "ย้ายลำดับไม่ได้" };
    revalidateDocumentPaths();
    return { ok: true, data: { id } };
  }

  const supabase = createServiceClient();
  const { data: categories } = await supabase.from("document_categories").select("id").order("sort_order");

  const next = swapped(categories ?? [], id, direction);
  if (!next) return { ok: false, error: "ย้ายลำดับไม่ได้" };

  const error = await renumber("document_categories", next);
  if (error) return { ok: false, error };

  revalidateDocumentPaths();
  return { ok: true, data: { id } };
}

export async function createCategory(input: {
  nameTh: string;
  emoji?: string;
}): Promise<ActionResult<DocumentCategory>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { nameTh, emoji } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  if (DATA_SOURCE === "local") {
    const category = await localCreateDocumentCategory(nameTh, emoji);
    if (!category) return { ok: false, error: "มีหมวดชื่อนี้อยู่แล้ว" };
    revalidateDocumentPaths();
    return { ok: true, data: category };
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("document_categories").select("slug, name_th");

  if ((existing ?? []).some((category) => category.name_th === nameTh)) {
    return { ok: false, error: "มีหมวดชื่อนี้อยู่แล้ว" };
  }

  const { data: category, error } = await supabase
    .from("document_categories")
    .insert({
      slug: nextCategorySlug((existing ?? []).map((row) => row.slug)),
      name_th: nameTh,
      emoji,
      sort_order: (existing ?? []).length + 1,
    })
    .select("*")
    .single();

  if (error || !category) {
    return { ok: false, error: error?.message ?? "เพิ่มหมวดไม่สำเร็จ" };
  }

  revalidateDocumentPaths();
  return { ok: true, data: category };
}

type DocumentDisposition =
  | { kind: "none" }
  | { kind: "move"; toCategoryId: string; toGroupId: string | null }
  | { kind: "delete"; confirmedCount: number };

// Applies the caller's decision about the documents inside something that is
// about to be removed, and returns an error string if it must not proceed
// (spec FR-011, FR-011a, FR-011b).
//
// Every refusal happens BEFORE anything is written, so a rejected delete leaves
// the taxonomy and the documents exactly as they were — no partial delete, no
// partial move.
async function applyDisposition(
  scope: { groupId: string } | { categoryId: string },
  disposition: DocumentDisposition
): Promise<string | null> {
  const isLocal = DATA_SOURCE === "local";
  const supabase = isLocal ? null : createServiceClient();

  async function affected(): Promise<{ ids: string[]; paths: string[] }> {
    if (isLocal) {
      // The local store counts and deletes by scope directly; ids are only
      // needed for the move path, handled below.
      return { ids: [], paths: [] };
    }
    const query = supabase!.from("documents").select("id, storage_path");
    const { data } = await ("groupId" in scope
      ? query.eq("group_id", scope.groupId)
      : query.eq("category_id", scope.categoryId));
    return { ids: (data ?? []).map((row) => row.id), paths: (data ?? []).map((row) => row.storage_path) };
  }

  async function count(): Promise<number> {
    if (isLocal) return localCountDocumentsIn(scope);
    return (await affected()).ids.length;
  }

  if (disposition.kind === "none") {
    const real = await count();
    if (real > 0) {
      return `ยังมีเอกสาร ${real} ไฟล์อยู่ข้างใน — เลือกก่อนว่าจะย้ายไปที่ไหน หรือจะลบไปพร้อมกัน`;
    }
    return null;
  }

  if (disposition.kind === "move") {
    // Moving into the very thing being deleted would destroy the documents a
    // moment later (spec Edge Cases). The UI does not offer it; the server
    // refuses it too.
    if ("categoryId" in scope && disposition.toCategoryId === scope.categoryId) {
      return "เลือกปลายทางที่อยู่ในหมวดที่กำลังจะลบไม่ได้";
    }
    if ("groupId" in scope && disposition.toGroupId === scope.groupId) {
      return "เลือกปลายทางเป็นหมวดย่อยที่กำลังจะลบไม่ได้";
    }

    if (isLocal) {
      const db = await localCountDocumentsIn(scope);
      if (db > 0) {
        const moved = await localMoveDocumentsIn(scope, disposition.toCategoryId, disposition.toGroupId);
        if (moved === null) return "ย้ายเอกสารไม่สำเร็จ";
      }
      return null;
    }

    const { ids } = await affected();
    if (ids.length === 0) return null;
    const { error } = await supabase!
      .from("documents")
      .update({ category_id: disposition.toCategoryId, group_id: disposition.toGroupId })
      .in("id", ids);
    return error ? error.message : null;
  }

  // kind === "delete"
  const real = await count();
  // The number the user agreed to must still be the number about to be
  // destroyed. If someone uploaded in the meantime, the confirmation they saw
  // was a lie, so refuse rather than destroy more than they agreed to.
  if (real !== disposition.confirmedCount) {
    return `จำนวนไฟล์เปลี่ยนไประหว่างยืนยัน (ตอนนี้ ${real} ไฟล์) — กรุณาลองใหม่อีกครั้ง`;
  }
  if (real === 0) return null;

  if (isLocal) {
    await localDeleteDocumentsIn(scope);
    return null;
  }

  const { ids, paths } = await affected();
  // Storage first: a row without its file is a broken link the user can see and
  // report, while a file without its row is invisible and orphaned forever.
  const { error: storageError } = await supabase!.storage.from("documents").remove(paths);
  if (storageError) return storageError.message;
  const { error } = await supabase!.from("documents").delete().in("id", ids);
  return error ? error.message : null;
}

export async function deleteGroup(input: {
  id: string;
  documents: DocumentDisposition;
}): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = deleteGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { id, documents } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  const problem = await applyDisposition({ groupId: id }, documents);
  if (problem) return { ok: false, error: problem };

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteDocumentGroup(id);
    if (!removed) return { ok: false, error: "ลบหมวดย่อยไม่สำเร็จ" };
    revalidateDocumentPaths();
    return { ok: true, data: { id } };
  }

  const supabase = createServiceClient();
  // The category is read before the delete, because afterwards there is no row
  // left to read it from.
  const { data: doomed } = await supabase
    .from("document_groups")
    .select("category_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("document_groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Positions are what the displayed numbering is derived from, so a delete
  // that leaves a gap leaves the numbering wrong — 1, 2, 4 — until something
  // else happens to reorder. The local backend has always closed the gap; this
  // is the Supabase side catching up (Constitution III).
  if (doomed) {
    const { data: rest } = await supabase
      .from("document_groups")
      .select("id")
      .eq("category_id", doomed.category_id)
      .order("sort_order");
    if (rest) {
      const problem = await renumber("document_groups", rest);
      if (problem) return { ok: false, error: problem };
    }
  }

  revalidateDocumentPaths();
  return { ok: true, data: { id } };
}

export async function deleteCategory(input: {
  id: string;
  documents: DocumentDisposition;
}): Promise<ActionResult<{ id: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { id, documents } = parsed.data;

  if (DATA_SOURCE === "mock") return { ok: false, error: "โหมดตัวอย่างแก้ไขข้อมูลไม่ได้" };

  const problem = await applyDisposition({ categoryId: id }, documents);
  if (problem) return { ok: false, error: problem };

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteDocumentCategory(id);
    if (!removed) return { ok: false, error: "ลบหมวดไม่สำเร็จ" };
    revalidateDocumentPaths();
    return { ok: true, data: { id } };
  }

  const supabase = createServiceClient();
  // The category's groups go with it in one action (FR-010) — that is the
  // `on delete cascade` on document_groups.category_id, so no separate sweep.
  const { error } = await supabase.from("document_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Same reason as deleteGroup: the number a category shows is its position,
  // so deleting the fifth of six must make the sixth become the fifth. Without
  // this the gap persists in the data, and every later category keeps a number
  // that no longer matches where it sits.
  const { data: rest } = await supabase
    .from("document_categories")
    .select("id")
    .order("sort_order");
  if (rest) {
    const problem = await renumber("document_categories", rest);
    if (problem) return { ok: false, error: problem };
  }

  revalidateDocumentPaths();
  return { ok: true, data: { id } };
}
