import { z } from "zod";

// Limits and allowed types decided in research.md §4 (upload limits) — not
// user-facing spec requirements, but concrete numbers Server Actions enforce.
// Raised from the original 25MB photo-only ceiling now that every module
// accepts video too (Constitution VIII: size ceiling must admit real video).
export const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024; // 300 MB
export const MAX_BATCH_FILES = 20;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "image/gif"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const PDF_MIME_TYPE = "application/pdf";

// Constitution VIII: every module's upload button accepts image/PDF/video —
// the "photo" vs "document" split is about which module a file attaches to,
// not which file types are allowed, so both lists share the same allowlist.
export const PHOTO_MIME_TYPES = [...IMAGE_MIME_TYPES, PDF_MIME_TYPE, ...VIDEO_MIME_TYPES];
export const DOCUMENT_MIME_TYPES = [
  PDF_MIME_TYPE,
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

const uuid = z.string().uuid();
// weekId/categoryId are foreign-key references to a fixed lookup list, not
// user-typed text. In Supabase mode they're real UUIDs, but the "local" and
// "mock" backends (lib/mock/source.ts) use human-readable slug ids like
// "structure" for document categories — a strict .uuid() check rejected
// those outright, breaking every document upload/edit as soon as those
// backends went live. The actual existence check happens at the data layer
// (local store lookup / Supabase FK constraint), so this only needs to
// reject empty strings.
const foreignKeyId = z.string().min(1, "ข้อมูลไม่ถูกต้อง");

// Only checks batch size — per-file MIME/size checks happen in validateFile()
// below, called per-item so one bad file doesn't fail the whole batch (US3
// acceptance scenario 2: partial success/failure reporting).
const fileArray = () =>
  z
    .array(z.instanceof(File))
    .min(1, "เลือกอย่างน้อย 1 ไฟล์")
    .max(MAX_BATCH_FILES, `อัปโหลดได้ครั้งละไม่เกิน ${MAX_BATCH_FILES} ไฟล์`);

export function validateFile(file: File, allowedMimeTypes: string[]): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: ไฟล์ใหญ่เกินไป (จำกัด ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`;
  }
  if (!allowedMimeTypes.includes(file.type)) {
    return `${file.name}: ไม่รองรับชนิดไฟล์นี้`;
  }
  return null;
}

export const uploadPhotoSchema = z.object({
  weekId: foreignKeyId,
  files: fileArray(),
});

export const deletePhotoSchema = z.object({
  photoId: uuid,
});

export const editPhotoSchema = z
  .object({
    photoId: uuid,
    fileName: z.string().trim().min(1, "ชื่อไฟล์ห้ามว่าง").optional(),
    note: z.string().optional(),
    weekId: foreignKeyId.optional(),
  })
  .refine((input) => input.fileName !== undefined || input.note !== undefined || input.weekId !== undefined, {
    message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข",
  });

// Week's user-facing identity is its date range, not a manually-assigned order
// number (Constitution-adjacent product decision — see
// specs/002-week-date-range-ui/spec.md FR-001/FR-002/FR-003).
const isoDate = z.string().min(1, "กรุณาระบุวันที่").refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "รูปแบบวันที่ไม่ถูกต้อง",
});

export const createWeekSchema = z
  .object({
    roomId: foreignKeyId,
    workTypeId: foreignKeyId,
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น",
    path: ["endDate"],
  });

export const uploadDocSchema = z.object({
  categoryId: foreignKeyId,
  files: fileArray(),
});

export const deleteDocSchema = z.object({
  documentId: uuid,
});

export const editDocSchema = z
  .object({
    documentId: uuid,
    fileName: z.string().trim().min(1, "ชื่อไฟล์ห้ามว่าง").optional(),
    note: z.string().optional(),
    categoryId: foreignKeyId.optional(),
  })
  .refine(
    (input) => input.fileName !== undefined || input.note !== undefined || input.categoryId !== undefined,
    { message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข" }
  );
