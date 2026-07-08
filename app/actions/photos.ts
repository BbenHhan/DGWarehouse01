"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import {
  PHOTO_MIME_TYPES,
  createWeekSchema,
  editPhotoSchema,
  uploadPhotoSchema,
  validateFile,
} from "@/lib/validation";
import { DATA_SOURCE } from "@/lib/data-config";
import {
  localCreateWeek,
  localDeletePhoto,
  localDeleteWeek,
  localSavePhotoFile,
  localUpdatePhoto,
} from "@/lib/local/store";
import { getWeeks } from "@/lib/data";
import type { ActionResult, Photo, UploadPhotoOutput } from "@/lib/types";

// Two weeks in the same room/work-type must not cover overlapping dates
// (specs/002-week-date-range-ui, confirmed via /speckit-clarify). Half-open
// interval overlap check: ranges [aStart, aEnd] and [bStart, bEnd] overlap
// (inclusive) whenever aStart <= bEnd && bStart <= aEnd.
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

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

  const results: UploadPhotoOutput["results"] = [];

  if (DATA_SOURCE === "local") {
    for (const file of parsed.data.files) {
      const fileError = validateFile(file, PHOTO_MIME_TYPES);
      if (fileError) {
        results.push({ fileName: file.name, success: false, error: fileError });
        continue;
      }

      const photo = await localSavePhotoFile(weekId, file);
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
  weekId?: string;
}): Promise<ActionResult<Photo>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = editPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { photoId, fileName, note, weekId } = parsed.data;

  if (DATA_SOURCE === "local") {
    const photo = await localUpdatePhoto(photoId, { fileName, note, weekId });
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
  workTypeId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<{ weekId: string }>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  const parsed = createWeekSchema.safeParse({ roomId, workTypeId, startDate, endDate });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const weeksInSameWorkType = await getWeeks(parsed.data.roomId, parsed.data.workTypeId);
  const hasOverlap = weeksInSameWorkType.some(
    (week) =>
      week.start_date &&
      week.end_date &&
      rangesOverlap(parsed.data.startDate, parsed.data.endDate, week.start_date, week.end_date)
  );
  if (hasOverlap) {
    return { ok: false, error: "ช่วงวันที่นี้ทับซ้อนกับสัปดาห์ที่มีอยู่แล้วในประเภทงานนี้" };
  }

  if (DATA_SOURCE === "local") {
    const week = await localCreateWeek(
      parsed.data.roomId,
      parsed.data.workTypeId,
      parsed.data.startDate,
      parsed.data.endDate
    );
    revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
    return { ok: true, data: { weekId: week.id } };
  }

  const supabase = createServiceClient();

  const { data: existingWeeks, error: fetchError } = await supabase
    .from("weeks")
    .select("week_number")
    .eq("room_id", parsed.data.roomId)
    .eq("work_type_id", parsed.data.workTypeId)
    .order("week_number", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const nextWeekNumber = (existingWeeks[0]?.week_number ?? 0) + 1;

  const { data: week, error: insertError } = await supabase
    .from("weeks")
    .insert({
      room_id: parsed.data.roomId,
      work_type_id: parsed.data.workTypeId,
      week_number: nextWeekNumber,
      label: `สัปดาห์ที่ ${nextWeekNumber}`,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
    })
    .select("*")
    .single();

  if (insertError || !week) {
    return { ok: false, error: insertError?.message ?? "สร้างสัปดาห์ไม่สำเร็จ" };
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: { weekId: week.id } };
}

export async function deleteWeek(weekId: string): Promise<ActionResult<{ weekId: string }>> {
  const authError = await assertAuthenticated();
  if (authError) return { ok: false, error: authError };

  if (DATA_SOURCE === "local") {
    const removed = await localDeleteWeek(weekId);
    if (!removed) {
      return { ok: false, error: "ไม่พบสัปดาห์นี้" };
    }
    revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");
    return { ok: true, data: { weekId } };
  }

  const supabase = createServiceClient();

  const { data: photosInWeek, error: fetchPhotosError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("week_id", weekId);

  if (fetchPhotosError) {
    return { ok: false, error: fetchPhotosError.message };
  }

  if (photosInWeek.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("photos")
      .remove(photosInWeek.map((photo) => photo.storage_path));
    if (storageError) {
      return { ok: false, error: storageError.message };
    }
  }

  // photos rows are removed automatically via the weeks_id FK's
  // "on delete cascade" once the week row itself is deleted below.
  const { error: deleteError, count } = await supabase
    .from("weeks")
    .delete({ count: "exact" })
    .eq("id", weekId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }
  if (!count) {
    return { ok: false, error: "ไม่พบสัปดาห์นี้" };
  }

  revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page");

  return { ok: true, data: { weekId } };
}
