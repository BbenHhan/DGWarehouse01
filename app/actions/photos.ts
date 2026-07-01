"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { PHOTO_MIME_TYPES, editPhotoSchema, uploadPhotoSchema, validateFile } from "@/lib/validation";
import type { ActionResult, Photo, UploadPhotoOutput } from "@/lib/types";

async function assertAuthenticated(): Promise<string | null> {
  try {
    await requireUser();
    return null;
  } catch {
    return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
  }
}

export async function uploadPhoto(
  weekId: string,
  files: File[]
): Promise<ActionResult<UploadPhotoOutput>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = uploadPhotoSchema.safeParse({ weekId, files });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = createServiceClient();
  const results: UploadPhotoOutput["results"] = [];

  for (const file of parsed.data.files) {
    const fileError = validateFile(file, PHOTO_MIME_TYPES);
    if (fileError) {
      results.push({ fileName: file.name, success: false, error: fileError });
      continue;
    }

    const storagePath = `${weekId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      results.push({ fileName: file.name, success: false, error: uploadError.message });
      continue;
    }

    const { data: photo, error: insertError } = await supabase
      .from("photos")
      .insert({ week_id: weekId, storage_path: storagePath, file_name: file.name })
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
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

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
  weekId?: string;
}): Promise<ActionResult<Photo>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = editPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { photoId, fileName, note, weekId } = parsed.data;
  const supabase = createServiceClient();

  const { data: photo, error } = await supabase
    .from("photos")
    .update({
      ...(fileName !== undefined ? { file_name: fileName } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(weekId !== undefined ? { week_id: weekId } : {}),
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

export async function createWeek(
  roomId: string,
  workTypeId: string
): Promise<ActionResult<{ weekId: string }>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const supabase = createServiceClient();

  const { data: existingWeeks, error: fetchError } = await supabase
    .from("weeks")
    .select("week_number")
    .eq("room_id", roomId)
    .eq("work_type_id", workTypeId)
    .order("week_number", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const nextWeekNumber = (existingWeeks[0]?.week_number ?? 0) + 1;

  const { data: week, error: insertError } = await supabase
    .from("weeks")
    .insert({
      room_id: roomId,
      work_type_id: workTypeId,
      week_number: nextWeekNumber,
      label: `สัปดาห์ที่ ${nextWeekNumber}`,
    })
    .select("*")
    .single();

  if (insertError || !week) {
    return { ok: false, error: insertError?.message ?? "สร้างสัปดาห์ไม่สำเร็จ" };
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: { weekId: week.id } };
}
