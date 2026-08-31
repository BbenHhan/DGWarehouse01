"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, requireRole } from "@/lib/supabase/server";
import { createGroupSchema, renameCategorySchema, renameGroupSchema } from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  localCreateDocumentGroup,
  localRenameDocumentCategory,
  localRenameDocumentGroup,
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
