// Shared types — mirrors specs/001-progress-tracker-migration/data-model.md
// and contracts/server-actions.md. Import these everywhere rather than
// redefining local shapes.

import type { Role } from "@/lib/roles";

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
};

export type Document = {
  id: string;
  category_id: string;
  storage_path: string;
  file_name: string;
  note: string | null;
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
