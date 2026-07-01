import { z } from "zod";

// Limits and allowed types decided in research.md §4 (upload limits) — not
// user-facing spec requirements, but concrete numbers Server Actions enforce.
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_BATCH_FILES = 20;

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

const uuid = z.string().uuid();

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
  weekId: uuid,
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
    weekId: uuid.optional(),
  })
  .refine((input) => input.fileName !== undefined || input.note !== undefined || input.weekId !== undefined, {
    message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข",
  });

export const uploadDocSchema = z.object({
  categoryId: uuid,
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
    categoryId: uuid.optional(),
  })
  .refine(
    (input) => input.fileName !== undefined || input.note !== undefined || input.categoryId !== undefined,
    { message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข" }
  );
