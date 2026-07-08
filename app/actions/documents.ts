"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { DOCUMENT_MIME_TYPES, editDocSchema, uploadDocSchema, validateFile } from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  localDeleteDocument,
  localSaveDocumentFile,
  localUpdateDocument,
} from "@/lib/local/store";
import type { ActionResult, Document, UploadDocOutput } from "@/lib/types";

async function assertAuthenticated(): Promise<string | null> {
  try {
    await requireUser();
    return null;
  } catch {
    return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
  }
}

export async function uploadDoc(
  categoryId: string,
  files: File[]
): Promise<ActionResult<UploadDocOutput>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = uploadDocSchema.safeParse({ categoryId, files });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const results: UploadDocOutput["results"] = [];

  if (DATA_SOURCE === "local") {
    for (const file of parsed.data.files) {
      const fileError = validateFile(file, DOCUMENT_MIME_TYPES);
      if (fileError) {
        results.push({ fileName: file.name, success: false, error: fileError });
        continue;
      }

      const document = await localSaveDocumentFile(categoryId, file);
      results.push({ fileName: file.name, success: true, item: document });
    }

    revalidatePath("/documents/[categorySlug]", "page");
    return { ok: true, data: { results } };
  }

  const supabase = createServiceClient();

  for (const file of parsed.data.files) {
    const fileError = validateFile(file, DOCUMENT_MIME_TYPES);
    if (fileError) {
      results.push({ fileName: file.name, success: false, error: fileError });
      continue;
    }

    const storagePath = `${categoryId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      results.push({ fileName: file.name, success: false, error: uploadError.message });
      continue;
    }

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({ category_id: categoryId, storage_path: storagePath, file_name: file.name })
      .select("*")
      .single();

    if (insertError || !document) {
      results.push({
        fileName: file.name,
        success: false,
        error: insertError?.message ?? "บันทึกข้อมูลไม่สำเร็จ",
      });
      continue;
    }

    results.push({ fileName: file.name, success: true, item: document });
  }

  revalidatePath("/documents/[categorySlug]", "page");

  return { ok: true, data: { results } };
}

export async function deleteDoc(documentId: string): Promise<ActionResult<{ documentId: string }>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteDocument(documentId);
    if (!removed) {
      return { ok: false, error: "ไม่พบเอกสารนี้" };
    }
    revalidatePath("/documents/[categorySlug]", "page");
    return { ok: true, data: { documentId } };
  }

  const supabase = createServiceClient();

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { ok: false, error: "ไม่พบเอกสารนี้" };
  }

  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([document.storage_path]);
  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", documentId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/documents/[categorySlug]", "page");

  return { ok: true, data: { documentId } };
}

export async function editDoc(input: {
  documentId: string;
  fileName?: string;
  note?: string;
  categoryId?: string;
}): Promise<ActionResult<Document>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = editDocSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { documentId, fileName, note, categoryId } = parsed.data;

  if (DATA_SOURCE === "local") {
    const document = await localUpdateDocument(documentId, { fileName, note, categoryId });
    if (!document) {
      return { ok: false, error: "แก้ไขข้อมูลไม่สำเร็จ" };
    }
    revalidatePath("/documents/[categorySlug]", "page");
    return { ok: true, data: document };
  }

  const supabase = createServiceClient();

  const { data: document, error } = await supabase
    .from("documents")
    .update({
      ...(fileName !== undefined ? { file_name: fileName } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error || !document) {
    return { ok: false, error: error?.message ?? "แก้ไขข้อมูลไม่สำเร็จ" };
  }

  revalidatePath("/documents/[categorySlug]", "page");

  return { ok: true, data: document };
}
