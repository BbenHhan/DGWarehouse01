// Shared types — mirrors specs/001-progress-tracker-migration/data-model.md
// and contracts/server-actions.md. Import these everywhere rather than
// redefining local shapes.

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

export type Week = {
  id: string;
  room_id: string;
  work_type_id: string;
  week_number: number;
  label: string;
  created_at: string;
  // Date range the week covers (ISO "YYYY-MM-DD"). Required for weeks created via
  // the "local"/"supabase" backends; absent/null only for "mock" backend weeks
  // read from the legacy v7 folder snapshot, which has no structured date data —
  // see specs/002-week-date-range-ui/research.md Decision 3.
  start_date?: string | null;
  end_date?: string | null;
};

export type Photo = {
  id: string;
  week_id: string;
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
