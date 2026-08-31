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
// roomId/workTypeId/categoryId are foreign-key references to a fixed lookup list, not
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

// A photo's single exact date (specs/018-per-photo-dates) — replaces the old
// week date-RANGE container entirely; no range, no overlap check.
const isoDate = z.string().min(1, "กรุณาระบุวันที่").refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "รูปแบบวันที่ไม่ถูกต้อง",
});

export const uploadPhotoSchema = z.object({
  roomId: foreignKeyId,
  workTypeId: foreignKeyId,
  date: isoDate,
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
    date: isoDate.optional(),
    roomId: foreignKeyId.optional(),
    workTypeId: foreignKeyId.optional(),
  })
  .refine(
    (input) =>
      input.fileName !== undefined ||
      input.note !== undefined ||
      input.date !== undefined ||
      input.roomId !== undefined ||
      input.workTypeId !== undefined,
    { message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข" }
  );

export const uploadDocSchema = z.object({
  categoryId: foreignKeyId,
  note: z.string().nullable().optional(),
  files: fileArray(),
});

export const deleteDocSchema = z.object({
  documentId: uuid,
});

export const editDocSchema = z
  .object({
    documentId: uuid,
    fileName: z.string().trim().min(1, "ชื่อไฟล์ห้ามว่าง").optional(),
    // null moves the document out of every sub-group
    // (specs/040-editable-document-taxonomy). Replaces the free-text `note`,
    // which the taxonomy tables now own.
    groupId: foreignKeyId.nullable().optional(),
    categoryId: foreignKeyId.optional(),
  })
  .refine(
    (input) => input.fileName !== undefined || input.groupId !== undefined || input.categoryId !== undefined,
    { message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข" }
  );

// Room checklist (specs/028-room-checklist) — free text + optional
// multi-room tagging, no work-type scope (research.md Decision 4).
// parentId (specs/029-checklist-subitems) is a real DB-generated id in both
// the "local" and "supabase" backends (unlike roomId/categoryId, which use
// human-readable slugs in mock/local data) — safe to validate as a uuid.
// detail/startDate/dueDate (specs/032-checklist-detail-status-colors) are
// all optional, plain-text/date fields — no per-item requirement beyond text.
const checklistStatusSchema = z.enum(["todo", "in_progress", "done"]);

export const addChecklistItemSchema = z.object({
  text: z.string().trim().min(1, "กรุณาระบุข้อความ"),
  roomIds: z.array(foreignKeyId).default([]),
  parentId: uuid.optional(),
  detail: z.string().trim().min(1).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
});

export const editChecklistItemSchema = z
  .object({
    id: uuid,
    text: z.string().trim().min(1, "ข้อความห้ามว่าง").optional(),
    roomIds: z.array(foreignKeyId).optional(),
    detail: z.string().trim().nullable().optional(),
    startDate: isoDate.nullable().optional(),
    dueDate: isoDate.nullable().optional(),
  })
  .refine(
    (input) =>
      input.text !== undefined ||
      input.roomIds !== undefined ||
      input.detail !== undefined ||
      input.startDate !== undefined ||
      input.dueDate !== undefined,
    { message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข" }
  );

// Replaces the old boolean toggle (specs/032-checklist-detail-status-colors)
// — status is one of three states everywhere, item-level or per-room.
export const setChecklistItemStatusSchema = z.object({
  id: uuid,
  status: checklistStatusSchema,
});

export const setChecklistItemRoomStatusSchema = z.object({
  itemId: uuid,
  roomId: foreignKeyId,
  status: checklistStatusSchema,
});

export const deleteChecklistItemSchema = z.object({
  id: uuid,
});

// Document taxonomy (specs/040-editable-document-taxonomy). categoryId uses
// foreignKeyId rather than uuid for the same reason the document schemas do:
// the "local" and "mock" backends key categories by slug, not by UUID.
// Sub-group ids are always generated by whichever backend created them, so
// they are safe to validate as uuid — same reasoning as the checklist's
// parentId.
const taxonomyName = z.string().trim().min(1, "กรุณาระบุชื่อ");

export const createGroupSchema = z.object({
  categoryId: foreignKeyId,
  nameTh: taxonomyName,
});

export const renameGroupSchema = z.object({
  id: uuid,
  nameTh: taxonomyName,
});

// Deliberately has no `slug` field, and must never gain one: a category's slug
// is a live URL (/documents/structure), so renaming one would break every
// existing link and bookmark (FR-013). Only the display name and icon change.
export const renameCategorySchema = z
  .object({
    id: foreignKeyId,
    nameTh: taxonomyName.optional(),
    emoji: z.string().trim().min(1).optional(),
  })
  .refine((input) => input.nameTh !== undefined || input.emoji !== undefined, {
    message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข",
  });

// A destination is a category plus optionally one of its groups; null means the
// documents land outside every group (FR-026).
export const moveDocumentsSchema = z.object({
  documentIds: z.array(uuid),
  toCategoryId: foreignKeyId,
  toGroupId: uuid.nullable(),
});

const moveDirection = z.enum(["up", "down"]);

export const moveGroupSchema = z.object({ id: uuid, direction: moveDirection });
export const moveCategorySchema = z.object({ id: foreignKeyId, direction: moveDirection });

// No slug field, deliberately: the caller never supplies one. A category's slug
// is generated (FR-014) and then immutable (FR-013).
export const createCategorySchema = z.object({
  nameTh: taxonomyName,
  emoji: z.string().trim().min(1, "กรุณาเลือกไอคอน").default("📁"),
});

// What becomes of the documents when the structure above them is removed
// (spec FR-011). There is deliberately no default: every delete call has to
// carry an explicit decision, so nothing can be destroyed as a side effect of
// tidying up the taxonomy.
export const documentDispositionSchema = z.discriminatedUnion("kind", [
  // Asserts the target holds nothing. The server checks rather than trusting it.
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("move"),
    toCategoryId: foreignKeyId,
    toGroupId: uuid.nullable(),
  }),
  // The count the user was shown and agreed to. The server compares it against
  // its own before destroying anything, so FR-011a's "names the number to be
  // destroyed" is a guarantee rather than a label.
  z.object({ kind: z.literal("delete"), confirmedCount: z.number().int().nonnegative() }),
]);

export const deleteGroupSchema = z.object({ id: uuid, documents: documentDispositionSchema });
export const deleteCategorySchema = z.object({ id: foreignKeyId, documents: documentDispositionSchema });
