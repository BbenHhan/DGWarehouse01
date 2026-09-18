// Shared types — mirrors specs/001-progress-tracker-migration/data-model.md
// and contracts/server-actions.md. Import these everywhere rather than
// redefining local shapes.

import type { Role } from "@/lib/roles";
import type { ChecklistStatus } from "@/lib/checklist-status";

export type Account = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type RoleRequest = {
  id: string;
  requesterId: string;
  requesterEmail: string;
  requesterFullName: string | null;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
};

export type Room = {
  id: string;
  slug: string;
  name_th: string;
  emoji: string;
  sort_order: number;
};

export type WorkType = {
  id: string;
  slug: string;
  name_th: string;
  emoji: string;
  sort_order: number;
};

export type Photo = {
  id: string;
  room_id: string;
  work_type_id: string;
  // The photo's single exact date (ISO "YYYY-MM-DD"), chosen at upload time —
  // replaces the old week date-RANGE container (specs/018-per-photo-dates).
  // For "mock" backend photos (a frozen, date-less v7 folder snapshot) this
  // is a best-effort value parsed from legacy week-label text, never a gap —
  // see specs/018-per-photo-dates/research.md Decision 5.
  date: string;
  storage_path: string;
  file_name: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentCategory = {
  id: string;
  slug: string;
  name_th: string;
  emoji: string;
  sort_order: number;
  // What belongs in here, in a sentence (specs/046, migration 0015). Optional
  // rather than `string | null`: a Supabase project where 0015 has not been run
  // yet returns rows without the column, and the page has to render them as
  // having no description rather than break.
  description?: string | null;
};

// A named division inside exactly one category (specs/040-editable-document-
// taxonomy). Replaces the old `documents.note` string: a group is now a record
// with its own identity and order, so it can exist before any file does, be
// renamed in one place, and be put in a deliberate order.
// `document_count` is counted at read time rather than stored — the numbers are
// small, and a stored counter that drifted would make the delete confirmation
// lie about how many files are about to be destroyed (FR-011a).
export type DocumentGroup = {
  id: string;
  category_id: string;
  name_th: string;
  sort_order: number;
  document_count: number;
  // See DocumentCategory.description. What the sub-group is for; the
  // requirement items below it say what it must actually contain.
  description?: string | null;
};

// specs/046-subgroup-requirement-checklist. One document or piece of evidence a
// sub-group is expected to hold. Status is set by a person, never inferred from
// the files present: a file can be in the folder and still not satisfy the item
// (research Decision 3).
export type RequirementStatus = "have" | "missing" | "waiting";

export type GroupRequirement = {
  id: string;
  group_id: string;
  name_th: string;
  status: RequirementStatus;
  note: string | null;
  sort_order: number;
};

export type Document = {
  id: string;
  category_id: string;
  storage_path: string;
  file_name: string;
  // null means the document belongs to no sub-group; it renders outside every
  // group, exactly as an empty `note` did before specs/040.
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

// Free-text, checkable task, optionally tagged to one or more rooms
// (specs/028-room-checklist). room_ids is derived from a join
// (checklist_item_rooms), not a raw column. parent_id/sub_items add a single
// level of breakdown (specs/029-checklist-subitems): a top-level item
// (parent_id null) returned by lib/data.ts carries its full sub-item list;
// a sub-item's own sub_items is always [] (one level only). status is the
// direct source of truth for an item with no room tags and no sub-items;
// otherwise it's a derived, kept-in-sync rollup (lib/checklist-status.ts)
// of either room_statuses (1+ room tags) or every sub-item's own status
// (specs/032-checklist-detail-status-colors, replacing the old boolean
// is_done/room_completions from specs/031 everywhere).
export type ChecklistItem = {
  id: string;
  text: string;
  detail: string | null;
  status: ChecklistStatus;
  start_date: string | null;
  due_date: string | null;
  room_ids: string[];
  room_statuses: { room_id: string; status: ChecklistStatus }[];
  parent_id: string | null;
  sub_items: ChecklistItem[];
  created_at: string;
  updated_at: string;
};

// Discriminated result every Server Action returns, so call sites can render
// loading/success/error without a try/catch across the Server/Client boundary.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type BatchUploadFileResult<TItem> =
  | { fileName: string; success: true; item: TItem }
  | { fileName: string; success: false; error: string };

export type UploadPhotoOutput = { results: BatchUploadFileResult<Photo>[] };
export type UploadDocOutput = { results: BatchUploadFileResult<Document>[] };
