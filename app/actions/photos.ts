"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient, requireRole } from "@/lib/supabase/server";
import { PHOTO_MIME_TYPES, editPhotoSchema, uploadPhotoSchema, validateFile } from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import { localDeletePhoto, localSavePhotoFile, localUpdatePhoto } from "@/lib/local/store";
import type { ActionResult, Photo, UploadPhotoOutput } from "@/lib/types";

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

// A photo carries its own single date, chosen at upload time (default
// today) — no pre-created week date-range container to resolve first
// (specs/018-per-photo-dates). No overlap/conflict check exists here; that
// concept belonged entirely to the removed week model.
export async function uploadPhoto(
  roomId: string,
  workTypeId: string,
  date: string,
  files: File[]
): Promise<ActionResult<UploadPhotoOutput>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = uploadPhotoSchema.safeParse({ roomId, workTypeId, date, files });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const results: UploadPhotoOutput["results"] = [];

  if (DATA_SOURCE === "local") {
    for (const file of parsed.data.files) {
      const fileError = validateFile(file, PHOTO_MIME_TYPES);
      if (fileError) {
        results.push({ fileName: file.name, success: false, error: fileError });
        continue;
      }

      const photo = await localSavePhotoFile(parsed.data.roomId, parsed.data.workTypeId, parsed.data.date, file);
      results.push({ fileName: file.name, success: true, item: photo });
    }

    revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
    return { ok: true, data: { results } };
  }

  const supabase = createServiceClient();

  for (const file of parsed.data.files) {
    const fileError = validateFile(file, PHOTO_MIME_TYPES);
    if (fileError) {
      results.push({ fileName: file.name, success: false, error: fileError });
      continue;
    }

    const storagePath = `${parsed.data.roomId}-${parsed.data.workTypeId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      results.push({ fileName: file.name, success: false, error: uploadError.message });
      continue;
    }

    const { data: photo, error: insertError } = await supabase
      .from("photos")
      .insert({
        room_id: parsed.data.roomId,
        work_type_id: parsed.data.workTypeId,
        date: parsed.data.date,
        storage_path: storagePath,
        file_name: file.name,
      })
      .select("*")
      .single();

    if (insertError || !photo) {
      results.push({
        fileName: file.name,
        success: false,
        error: insertError?.message ?? "บันทึกข้อมูลไม่สำเร็จ",
      });
      continue;
    }

    results.push({ fileName: file.name, success: true, item: photo });
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: { results } };
}

export async function deletePhoto(photoId: string): Promise<ActionResult<{ photoId: string }>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  if (DATA_SOURCE === "local") {
    const removed = await localDeletePhoto(photoId);
    if (!removed) {
      return { ok: false, error: "ไม่พบรูปภาพนี้" };
    }
    revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
    return { ok: true, data: { photoId } };
  }

  const supabase = createServiceClient();

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) {
    return { ok: false, error: "ไม่พบรูปภาพนี้" };
  }

  const { error: storageError } = await supabase.storage.from("photos").remove([photo.storage_path]);
  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", photoId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: { photoId } };
}

export async function editPhoto(input: {
  photoId: string;
  fileName?: string;
  note?: string;
  date?: string;
  roomId?: string;
  workTypeId?: string;
}): Promise<ActionResult<Photo>> {
  const authError = await assertCanEdit();
  if (authError) return { ok: false, error: authError };

  const parsed = editPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { photoId, fileName, note, date, roomId, workTypeId } = parsed.data;

  if (DATA_SOURCE === "local") {
    const photo = await localUpdatePhoto(photoId, { fileName, note, date, roomId, workTypeId });
    if (!photo) {
      return { ok: false, error: "แก้ไขข้อมูลไม่สำเร็จ" };
    }
    revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
    return { ok: true, data: photo };
  }

  const supabase = createServiceClient();

  const { data: photo, error } = await supabase
    .from("photos")
    .update({
      ...(fileName !== undefined ? { file_name: fileName } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(roomId !== undefined ? { room_id: roomId } : {}),
      ...(workTypeId !== undefined ? { work_type_id: workTypeId } : {}),
    })
    .eq("id", photoId)
    .select("*")
    .single();

  if (error || !photo) {
    return { ok: false, error: error?.message ?? "แก้ไขข้อมูลไม่สำเร็จ" };
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: photo };
}
