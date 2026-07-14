import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Document, Photo, Week } from "@/lib/types";
import { formatWeekDateRange } from "@/lib/week-format";

// Interim storage backend for Constitution III ("local" DATA_SOURCE) — persists
// uploads to a git-ignored disk folder instead of Supabase Storage, so upload/
// edit/delete work today with no live Supabase project. Only this file and
// lib/storage.ts know this backend exists; lib/data.ts and Server Actions call
// these functions the same way they'd call the Supabase equivalents, so
// switching DATA_SOURCE back to "supabase" needs no other code changes.
// Overridable via LOCAL_DATA_DIR so the automated test suite can point this
// backend at a disposable temp directory instead of the developer's real
// .local-data/ folder (specs/005-automated-testing) — set by vitest.setup.ts
// before any test imports this module.
export const LOCAL_BASE_DIR = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.env.LOCAL_DATA_DIR)
  : path.join(process.cwd(), ".local-data");
export const LOCAL_FILES_DIR = path.join(LOCAL_BASE_DIR, "files");
const DB_PATH = path.join(LOCAL_BASE_DIR, "db.json");

type LocalDb = {
  weeks: Week[];
  photos: Photo[];
  documents: Document[];
};

// No in-memory cache: Next.js bundles Server Actions and Server Component
// renders into separate module instances even within the same dev process,
// so a module-level cache variable silently desyncs between "the action that
// just wrote a week" and "the page that reads it back" — confirmed by a
// write showing up in db.json but not in the next render. Reading/writing
// the file directly every call costs a few ms on a tiny JSON file, which is
// irrelevant for a single-user interim backend, and is actually correct.
// Serializes writes so two overlapping Server Actions can't clobber each
// other's changes to db.json — single-user tool, but requests can still race.
let writeQueue: Promise<void> = Promise.resolve();

async function loadDb(): Promise<LocalDb> {
  if (!existsSync(DB_PATH)) {
    return { weeks: [], photos: [], documents: [] };
  }
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as LocalDb;
  } catch {
    return { weeks: [], photos: [], documents: [] };
  }
}

function persist(db: LocalDb): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await mkdir(LOCAL_BASE_DIR, { recursive: true });
    await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  });
  return writeQueue;
}

function nowIso() {
  return new Date().toISOString();
}

async function writeUploadedFile(storagePath: string, file: File): Promise<void> {
  const absolutePath = path.join(LOCAL_FILES_DIR, storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);
}

async function deleteUploadedFile(storagePath: string): Promise<void> {
  const absolutePath = path.join(LOCAL_FILES_DIR, storagePath);
  await rm(absolutePath, { force: true });
}

// Weeks are ordered by their date range, earliest first — not by creation order
// or a manually-assigned number (specs/002-week-date-range-ui FR-004). ISO date
// strings ("YYYY-MM-DD") sort correctly with plain string comparison.
function sortWeeksByDate(weeks: Week[]): Week[] {
  return [...weeks].sort((a, b) => {
    if (a.start_date && b.start_date) return a.start_date.localeCompare(b.start_date);
    return a.week_number - b.week_number;
  });
}

export async function localGetWeeks(roomId: string, workTypeId: string): Promise<Week[]> {
  const db = await loadDb();
  return sortWeeksByDate(
    db.weeks.filter((week) => week.room_id === roomId && week.work_type_id === workTypeId)
  );
}

export async function localGetAllWeeks(): Promise<Week[]> {
  const db = await loadDb();
  return sortWeeksByDate(db.weeks);
}

export async function localCreateWeek(
  roomId: string,
  workTypeId: string,
  startDate: string,
  endDate: string
): Promise<Week> {
  const db = await loadDb();
  // week_number is kept only as an internal, never-shown bookkeeping/tie-break
  // value now — the user never sees or assigns it (specs/002-week-date-range-ui).
  const existing = db.weeks.filter((week) => week.room_id === roomId && week.work_type_id === workTypeId);
  const nextNumber = existing.reduce((max, week) => Math.max(max, week.week_number), 0) + 1;

  const week: Week = {
    id: randomUUID(),
    room_id: roomId,
    work_type_id: workTypeId,
    week_number: nextNumber,
    label: formatWeekDateRange(startDate, endDate) ?? `สัปดาห์ที่ ${nextNumber}`,
    start_date: startDate,
    end_date: endDate,
    created_at: nowIso(),
  };
  db.weeks.push(week);
  await persist(db);
  return week;
}

export async function localDeleteWeek(weekId: string): Promise<Week | null> {
  const db = await loadDb();
  const index = db.weeks.findIndex((week) => week.id === weekId);
  if (index === -1) return null;

  // Cascade: every photo that belonged to this week is deleted too — same
  // per-file deletion localDeletePhoto already does (specs/003-delete-week).
  const photosInWeek = db.photos.filter((photo) => photo.week_id === weekId);
  db.photos = db.photos.filter((photo) => photo.week_id !== weekId);
  const [removed] = db.weeks.splice(index, 1);
  await persist(db);

  for (const photo of photosInWeek) {
    await deleteUploadedFile(photo.storage_path);
  }

  return removed;
}

export async function localGetPhotos(weekId: string): Promise<Photo[]> {
  const db = await loadDb();
  return db.photos
    .filter((photo) => photo.week_id === weekId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function localSavePhotoFile(weekId: string, file: File): Promise<Photo> {
  const db = await loadDb();
  const id = randomUUID();
  const storagePath = `photos/${weekId}/${id}-${file.name}`;
  await writeUploadedFile(storagePath, file);

  const photo: Photo = {
    id,
    week_id: weekId,
    storage_path: storagePath,
    file_name: file.name,
    note: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.photos.push(photo);
  await persist(db);
  return photo;
}

export async function localDeletePhoto(photoId: string): Promise<Photo | null> {
  const db = await loadDb();
  const index = db.photos.findIndex((photo) => photo.id === photoId);
  if (index === -1) return null;
  const [removed] = db.photos.splice(index, 1);
  await persist(db);
  await deleteUploadedFile(removed.storage_path);
  return removed;
}

export async function localUpdatePhoto(
  photoId: string,
  updates: { fileName?: string; note?: string; weekId?: string }
): Promise<Photo | null> {
  const db = await loadDb();
  const photo = db.photos.find((p) => p.id === photoId);
  if (!photo) return null;
  if (updates.fileName !== undefined) photo.file_name = updates.fileName;
  if (updates.note !== undefined) photo.note = updates.note;
  if (updates.weekId !== undefined) photo.week_id = updates.weekId;
  photo.updated_at = nowIso();
  await persist(db);
  return photo;
}

export async function localGetDocuments(categoryId: string): Promise<Document[]> {
  const db = await loadDb();
  return db.documents
    .filter((document) => document.category_id === categoryId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function localSaveDocumentFile(categoryId: string, file: File): Promise<Document> {
  const db = await loadDb();
  const id = randomUUID();
  const storagePath = `documents/${categoryId}/${id}-${file.name}`;
  await writeUploadedFile(storagePath, file);

  const document: Document = {
    id,
    category_id: categoryId,
    storage_path: storagePath,
    file_name: file.name,
    note: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.documents.push(document);
  await persist(db);
  return document;
}

export async function localDeleteDocument(documentId: string): Promise<Document | null> {
  const db = await loadDb();
  const index = db.documents.findIndex((document) => document.id === documentId);
  if (index === -1) return null;
  const [removed] = db.documents.splice(index, 1);
  await persist(db);
  await deleteUploadedFile(removed.storage_path);
  return removed;
}

export async function localUpdateDocument(
  documentId: string,
  updates: { fileName?: string; note?: string; categoryId?: string }
): Promise<Document | null> {
  const db = await loadDb();
  const document = db.documents.find((d) => d.id === documentId);
  if (!document) return null;
  if (updates.fileName !== undefined) document.file_name = updates.fileName;
  if (updates.note !== undefined) document.note = updates.note;
  if (updates.categoryId !== undefined) document.category_id = updates.categoryId;
  document.updated_at = nowIso();
  await persist(db);
  return document;
}

export async function localGetSiteStats(): Promise<{
  totalPhotos: number;
  totalDocuments: number;
  totalWeeks: number;
}> {
  const db = await loadDb();
  return {
    totalPhotos: db.photos.length,
    totalDocuments: db.documents.length,
    totalWeeks: new Set(db.weeks.map((week) => week.week_number)).size,
  };
}

export async function localGetRoomPhotoCounts(): Promise<Record<string, number>> {
  const db = await loadDb();
  const weekRoomMap = new Map(db.weeks.map((week) => [week.id, week.room_id]));
  const counts: Record<string, number> = {};
  for (const photo of db.photos) {
    const roomId = weekRoomMap.get(photo.week_id);
    if (!roomId) continue;
    counts[roomId] = (counts[roomId] ?? 0) + 1;
  }
  return counts;
}
