import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChecklistItem,
  Document,
  DocumentCategory,
  DocumentGroup,
  GroupRequirement,
  Photo,
  RequirementStatus,
} from "@/lib/types";
import { stripGroupNumber } from "@/lib/taxonomy-label";
import type { ChecklistStatus } from "@/lib/checklist-status";
import { rollupChecklistStatus } from "@/lib/checklist-status";
import type { DateFilter } from "@/lib/date-filter";
import { photoMatchesDateFilter } from "@/lib/date-filter";

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
  photos: Photo[];
  documents: Document[];
  documentCategories: DocumentCategory[];
  documentGroups: DocumentGroup[];
  checklistItems: ChecklistItem[];
  // specs/046-subgroup-requirement-checklist — what each sub-group should hold.
  groupRequirements: GroupRequirement[];
};

// Categories used to be a fixed list this backend borrowed from the read-only
// mock source. They are editable now (specs/040-editable-document-taxonomy), so
// the local backend has to own them like every other table — Constitution III
// requires it to be a drop-in for Supabase, and the test suite runs here.
// Seeded once, on the first load that finds none, with the same four the
// production project was seeded with in 0004_seed_lookups.sql.
const SEED_CATEGORIES: DocumentCategory[] = [
  { id: "structure", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1 },
  { id: "electrical", slug: "electrical", name_th: "หมวดที่ 2 ระบบไฟฟ้า", emoji: "⚡", sort_order: 2 },
  { id: "environment", slug: "environment", name_th: "หมวดที่ 3 สิ่งแวดล้อม", emoji: "🌿", sort_order: 3 },
  { id: "safety", slug: "safety", name_th: "หมวดที่ 4 ความปลอดภัย", emoji: "🦺", sort_order: 4 },
];

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
    return { photos: [], documents: [], documentCategories: [...SEED_CATEGORIES], documentGroups: [], checklistItems: [], groupRequirements: [] };
  }
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    // checklistItems is a newer field (specs/028-room-checklist) — an
    // existing db.json written before this feature won't have it yet.
    const db: LocalDb = {
      photos: [],
      documents: [],
      documentCategories: [],
      documentGroups: [],
      checklistItems: [],
      // A db.json written before specs/046 has no requirements yet.
      groupRequirements: [],
      ...parsed,
    };
    if (db.documentCategories.length === 0) db.documentCategories = [...SEED_CATEGORIES];
    db.checklistItems = db.checklistItems.map(normalizeChecklistItem);
    migrateDocumentNotes(db);
    return db;
  } catch {
    return { photos: [], documents: [], documentCategories: [...SEED_CATEGORIES], documentGroups: [], checklistItems: [], groupRequirements: [] };
  }
}

// The local mirror of migration 0014 (specs/040-editable-document-taxonomy).
// A db.json written before that feature stores a document's sub-group as a
// `note` string on the document itself. Promote each distinct (category, note)
// pair to a real group record and repoint the documents at it, so the local
// backend keeps the same contract as Supabase (Constitution III) instead of
// silently dropping everyone's grouping.
//
// Ordering matches the SQL: groups sort by their own names, which are already
// numbered by hand.
function migrateDocumentNotes(db: LocalDb): void {
  const legacy = db.documents as Array<Document & { note?: string | null }>;
  if (!legacy.some((document) => typeof document.note === "string" && document.note.trim() !== "")) return;

  const byCategory = new Map<string, Set<string>>();
  for (const document of legacy) {
    const note = document.note?.trim();
    if (!note) continue;
    if (!byCategory.has(document.category_id)) byCategory.set(document.category_id, new Set());
    byCategory.get(document.category_id)!.add(note);
  }

  for (const [categoryId, names] of byCategory) {
    const existing = new Set(
      db.documentGroups.filter((group) => group.category_id === categoryId).map((group) => group.name_th)
    );
    let order = db.documentGroups.filter((group) => group.category_id === categoryId).length;
    for (const name of [...names].sort()) {
      if (existing.has(name)) continue;
      order += 1;
      db.documentGroups.push({
        id: randomUUID(),
        category_id: categoryId,
        name_th: name,
        sort_order: order,
        document_count: 0,
      });
    }
  }

  for (const document of legacy) {
    const note = document.note?.trim();
    if (note) {
      const group = db.documentGroups.find(
        (candidate) => candidate.category_id === document.category_id && candidate.name_th === note
      );
      document.group_id = group?.id ?? null;
    } else if (document.group_id === undefined) {
      document.group_id = null;
    }
    delete document.note;
  }
}

// A checklistItems entry may have been written by an earlier version of
// this feature — specs/028/029 (is_done only) or specs/031
// (room_completions with a boolean is_done) — before status/detail/dates
// existed (specs/032-checklist-detail-status-colors). Coerces any of those
// shapes forward to the current one.
function normalizeChecklistItem(raw: ChecklistItem & { is_done?: boolean; room_completions?: { room_id: string; is_done: boolean }[] }): ChecklistItem {
  const status: ChecklistStatus = raw.status ?? (raw.is_done ? "done" : "todo");
  const room_statuses =
    raw.room_statuses ??
    raw.room_completions?.map((rc) => ({ room_id: rc.room_id, status: (rc.is_done ? "done" : "todo") as ChecklistStatus })) ??
    raw.room_ids.map((roomId) => ({ room_id: roomId, status }));
  return {
    id: raw.id,
    text: raw.text,
    detail: raw.detail ?? null,
    status,
    start_date: raw.start_date ?? null,
    due_date: raw.due_date ?? null,
    room_ids: raw.room_ids,
    room_statuses,
    parent_id: raw.parent_id ?? null,
    sub_items: [],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
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

// Every photo for a room+work-type, most recent date first, optionally
// narrowed by lib/date-filter.ts's semantics (specs/018-per-photo-dates —
// replaces the old per-week fetch entirely).
export async function localGetPhotos(
  roomId: string,
  workTypeId: string,
  filter?: DateFilter
): Promise<Photo[]> {
  const db = await loadDb();
  return db.photos
    .filter(
      (photo) =>
        photo.room_id === roomId &&
        photo.work_type_id === workTypeId &&
        photoMatchesDateFilter(photo.date, filter ?? {})
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function localSavePhotoFile(
  roomId: string,
  workTypeId: string,
  date: string,
  file: File
): Promise<Photo> {
  const db = await loadDb();
  const id = randomUUID();
  const storagePath = `photos/${roomId}-${workTypeId}/${id}-${file.name}`;
  await writeUploadedFile(storagePath, file);

  const photo: Photo = {
    id,
    room_id: roomId,
    work_type_id: workTypeId,
    date,
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
  updates: { fileName?: string; note?: string; date?: string; roomId?: string; workTypeId?: string }
): Promise<Photo | null> {
  const db = await loadDb();
  const photo = db.photos.find((p) => p.id === photoId);
  if (!photo) return null;
  if (updates.fileName !== undefined) photo.file_name = updates.fileName;
  if (updates.note !== undefined) photo.note = updates.note;
  if (updates.date !== undefined) photo.date = updates.date;
  if (updates.roomId !== undefined) photo.room_id = updates.roomId;
  if (updates.workTypeId !== undefined) photo.work_type_id = updates.workTypeId;
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

export async function localSaveDocumentFile(
  categoryId: string,
  groupId: string | null,
  file: File
): Promise<Document> {
  const db = await loadDb();
  const id = randomUUID();
  const storagePath = `documents/${categoryId}/${id}-${file.name}`;
  await writeUploadedFile(storagePath, file);

  const document: Document = {
    id,
    category_id: categoryId,
    storage_path: storagePath,
    file_name: file.name,
    group_id: groupId,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.documents.push(document);
  await persist(db);
  return document;
}

// specs/040-editable-document-taxonomy. Replaces localGetDocumentNotes, which
// could only report names some document already carried and drew from every
// category at once — the two faults that made this feature necessary.
export async function localGetDocumentCategories(): Promise<DocumentCategory[]> {
  const db = await loadDb();
  return [...db.documentCategories].sort((a, b) => a.sort_order - b.sort_order);
}

// Name and icon only. The slug is never touched — it is a live URL, so a
// rename must not break existing links (FR-013).
export async function localRenameDocumentCategory(
  id: string,
  updates: { nameTh?: string; emoji?: string }
): Promise<DocumentCategory | null> {
  const db = await loadDb();
  const category = db.documentCategories.find((candidate) => candidate.id === id);
  if (!category) return null;
  if (updates.nameTh !== undefined) category.name_th = updates.nameTh;
  if (updates.emoji !== undefined) category.emoji = updates.emoji;
  await persist(db);
  return category;
}

export async function localGetDocumentCountsByCategory(): Promise<Record<string, number>> {
  const db = await loadDb();
  const counts: Record<string, number> = {};
  for (const document of db.documents) {
    counts[document.category_id] = (counts[document.category_id] ?? 0) + 1;
  }
  return counts;
}

// Same swap-then-renumber shape as localMoveDocumentGroup, over the flat list
// of categories (research.md Decision 3).
// `category-N`, N being the smallest positive integer not already taken
// (research.md Decision 4). The slug is only ever a URL segment; Thai names do
// not slugify into anything usable, and the four original slugs
// (structure/electrical/environment/safety) are live URLs that must never be
// regenerated.
export function nextCategorySlug(taken: string[]): string {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) {
    const candidate = `category-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export async function localCreateDocumentCategory(
  nameTh: string,
  emoji: string
): Promise<DocumentCategory | null> {
  const db = await loadDb();
  if (db.documentCategories.some((category) => category.name_th === nameTh)) return null;

  const category: DocumentCategory = {
    id: randomUUID(),
    slug: nextCategorySlug(db.documentCategories.map((existing) => existing.slug)),
    name_th: nameTh,
    emoji,
    sort_order: db.documentCategories.length + 1,
  };
  db.documentCategories.push(category);
  await persist(db);
  return category;
}

export async function localMoveDocumentCategory(
  id: string,
  direction: "up" | "down"
): Promise<DocumentCategory[] | null> {
  const db = await loadDb();
  const ordered = [...db.documentCategories].sort((a, b) => a.sort_order - b.sort_order);
  const index = ordered.findIndex((category) => category.id === id);
  if (index === -1) return null;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return null;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  ordered.forEach((category, position) => {
    category.sort_order = position + 1;
  });
  await persist(db);
  return ordered;
}

export async function localGetDocumentGroups(categoryId: string): Promise<DocumentGroup[]> {
  const db = await loadDb();
  return db.documentGroups
    .filter((group) => group.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group) => ({
      ...group,
      document_count: db.documents.filter((document) => document.group_id === group.id).length,
    }));
}

export async function localGetAllDocumentGroups(): Promise<DocumentGroup[]> {
  const db = await loadDb();
  return [...db.documentGroups]
    .sort((a, b) => a.category_id.localeCompare(b.category_id) || a.sort_order - b.sort_order)
    .map((group) => ({
      ...group,
      document_count: db.documents.filter((document) => document.group_id === group.id).length,
    }));
}

export async function localCreateDocumentGroup(categoryId: string, nameTh: string): Promise<DocumentGroup | null> {
  const db = await loadDb();
  const siblings = db.documentGroups.filter((group) => group.category_id === categoryId);
  // Uniqueness is per category (FR-004): the same name under a different
  // category is fine. Returning null rather than throwing keeps the Server
  // Action's ActionResult shape.
  if (siblings.some((group) => group.name_th === nameTh)) return null;

  const group: DocumentGroup = {
    id: randomUUID(),
    category_id: categoryId,
    name_th: nameTh,
    sort_order: siblings.length + 1,
    document_count: 0,
  };
  db.documentGroups.push(group);
  await persist(db);
  return group;
}

export async function localRenameDocumentGroup(id: string, nameTh: string): Promise<DocumentGroup | null> {
  const db = await loadDb();
  const group = db.documentGroups.find((candidate) => candidate.id === id);
  if (!group) return null;
  const clash = db.documentGroups.some(
    (candidate) => candidate.category_id === group.category_id && candidate.name_th === nameTh && candidate.id !== id
  );
  if (clash) return null;
  group.name_th = nameTh;
  await persist(db);
  return group;
}

// Swap with the neighbour, then renumber that category's groups to a
// contiguous 1..n. Dense renumbering is fine at this size and keeps the
// numbers readable when inspecting db.json by hand (research.md Decision 3).
export async function localMoveDocumentGroup(id: string, direction: "up" | "down"): Promise<DocumentGroup[] | null> {
  const db = await loadDb();
  const group = db.documentGroups.find((candidate) => candidate.id === id);
  if (!group) return null;

  const siblings = db.documentGroups
    .filter((candidate) => candidate.category_id === group.category_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const index = siblings.findIndex((candidate) => candidate.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return null;

  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  siblings.forEach((sibling, position) => {
    sibling.sort_order = position + 1;
  });
  await persist(db);
  return siblings.map((sibling) => ({
    ...sibling,
    document_count: db.documents.filter((document) => document.group_id === sibling.id).length,
  }));
}

// Deliberately refuses while documents still point at the group — the caller
// re-parents or removes them first (contracts/server-actions.md,
// DocumentDisposition). The equivalent of the SQL's `on delete restrict`.
export async function localDeleteDocumentGroup(id: string): Promise<{ id: string } | null> {
  const db = await loadDb();
  const index = db.documentGroups.findIndex((group) => group.id === id);
  if (index === -1) return null;
  if (db.documents.some((document) => document.group_id === id)) return null;

  const [removed] = db.documentGroups.splice(index, 1);
  // Requirement items go with their sub-group — the local mirror of the SQL's
  // `on delete cascade` (specs/046 FR-015).
  db.groupRequirements = db.groupRequirements.filter((item) => item.group_id !== removed.id);
  const siblings = db.documentGroups
    .filter((group) => group.category_id === removed.category_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  siblings.forEach((sibling, position) => {
    sibling.sort_order = position + 1;
  });
  await persist(db);
  return { id: removed.id };
}

// Resolve a freely typed group name to an id, creating the group if this
// category has never seen it (FR-024). Shared by the upload path so a group
// born at upload time is indistinguishable from one made in management mode.
// Removes every document in a group or category, files included, then the
// structure itself. Used only by the delete flow after the caller has confirmed
// the count (specs/040-editable-document-taxonomy FR-011a).
export async function localDeleteDocumentsIn(
  scope: { groupId: string } | { categoryId: string }
): Promise<number> {
  const db = await loadDb();
  const doomed = db.documents.filter((document) =>
    "groupId" in scope ? document.group_id === scope.groupId : document.category_id === scope.categoryId
  );
  db.documents = db.documents.filter((document) => !doomed.includes(document));
  await persist(db);
  for (const document of doomed) {
    await deleteUploadedFile(document.storage_path);
  }
  return doomed.length;
}

export async function localMoveDocumentsIn(
  scope: { groupId: string } | { categoryId: string },
  toCategoryId: string,
  toGroupId: string | null
): Promise<number | null> {
  const db = await loadDb();
  const moving = db.documents.filter((document) =>
    "groupId" in scope ? document.group_id === scope.groupId : document.category_id === scope.categoryId
  );
  for (const document of moving) {
    document.category_id = toCategoryId;
    document.group_id = toGroupId;
    document.updated_at = nowIso();
  }
  await persist(db);
  return moving.length;
}

export async function localCountDocumentsIn(
  scope: { groupId: string } | { categoryId: string }
): Promise<number> {
  const db = await loadDb();
  return db.documents.filter((document) =>
    "groupId" in scope ? document.group_id === scope.groupId : document.category_id === scope.categoryId
  ).length;
}

// Deleting a category takes its groups with it in one action, so the editor is
// not made to remove them one at a time first (FR-010). Documents must already
// be gone or moved — the caller enforces that; this mirrors the SQL's
// `on delete restrict` by refusing while any remain.
export async function localDeleteDocumentCategory(id: string): Promise<{ id: string } | null> {
  const db = await loadDb();
  const index = db.documentCategories.findIndex((category) => category.id === id);
  if (index === -1) return null;
  if (db.documents.some((document) => document.category_id === id)) return null;

  db.documentCategories.splice(index, 1);
  const removedGroupIds = new Set(
    db.documentGroups.filter((group) => group.category_id === id).map((group) => group.id)
  );
  db.documentGroups = db.documentGroups.filter((group) => group.category_id !== id);
  db.groupRequirements = db.groupRequirements.filter((item) => !removedGroupIds.has(item.group_id));
  db.documentCategories
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((category, position) => {
      category.sort_order = position + 1;
    });
  await persist(db);
  return { id };
}

export async function localResolveDocumentGroup(categoryId: string, nameTh: string | null): Promise<string | null> {
  const trimmed = stripGroupNumber(nameTh ?? "");
  if (!trimmed) return null;
  const db = await loadDb();
  const existing = db.documentGroups.find(
    (group) => group.category_id === categoryId && group.name_th === trimmed
  );
  if (existing) return existing.id;
  const created = await localCreateDocumentGroup(categoryId, trimmed);
  return created?.id ?? null;
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
  updates: { fileName?: string; groupId?: string | null; categoryId?: string }
): Promise<Document | null> {
  const db = await loadDb();
  const document = db.documents.find((d) => d.id === documentId);
  if (!document) return null;
  if (updates.fileName !== undefined) document.file_name = updates.fileName;
  if (updates.groupId !== undefined) document.group_id = updates.groupId;
  if (updates.categoryId !== undefined) document.category_id = updates.categoryId;
  document.updated_at = nowIso();
  await persist(db);
  return document;
}

export async function localGetSiteStats(): Promise<{
  totalPhotos: number;
  totalDocuments: number;
  totalDays: number;
}> {
  const db = await loadDb();
  return {
    totalPhotos: db.photos.length,
    totalDocuments: db.documents.length,
    totalDays: new Set(db.photos.map((photo) => photo.date)).size,
  };
}

export async function localGetRoomPhotoCounts(): Promise<Record<string, number>> {
  const db = await loadDb();
  const counts: Record<string, number> = {};
  for (const photo of db.photos) {
    counts[photo.room_id] = (counts[photo.room_id] ?? 0) + 1;
  }
  return counts;
}

// Room checklist (specs/028-room-checklist) — room_ids are embedded
// directly on the local record (not a separate junction file), since this
// backend is a single JSON document, not a relational store. parent_id/
// sub_items (specs/029-checklist-subitems) add one level of breakdown —
// sub_items is never persisted on a record itself, only computed at read
// time by grouping children under their parent. status (specs/032-
// checklist-detail-status-colors) is a direct value for an item with no
// room tags and no sub-items, otherwise a derived rollup (room_statuses for
// 1+ room tags, else its sub-items) kept in sync via recomputeStatus below.
function byCreatedDesc(a: ChecklistItem, b: ChecklistItem): number {
  return b.created_at.localeCompare(a.created_at);
}

function recomputeStatus(item: ChecklistItem): void {
  if (item.room_statuses.length > 0) {
    item.status = rollupChecklistStatus(item.room_statuses.map((rs) => rs.status));
  }
}

export async function localGetChecklistItems(): Promise<ChecklistItem[]> {
  const db = await loadDb();
  const topLevel = db.checklistItems.filter((item) => !item.parent_id).sort(byCreatedDesc);
  return topLevel.map((item) => ({
    ...item,
    sub_items: db.checklistItems
      .filter((sub) => sub.parent_id === item.id)
      .sort(byCreatedDesc),
  }));
}

// Relevant to this room = tagged to it, and that room's own tag not yet
// done (specs/031-checklist-room-completion Decision 4, specs/032 status =
// "done") — every item shown is directly tagged by construction, no
// reaching around via sub-items needed (unlike specs/030's removed union
// logic).
export async function localGetRoomChecklistItems(roomId: string): Promise<ChecklistItem[]> {
  const db = await loadDb();

  function roomNotDone(item: ChecklistItem): boolean {
    const roomStatus = item.room_statuses.find((rs) => rs.room_id === roomId);
    return item.room_ids.includes(roomId) && !!roomStatus && roomStatus.status !== "done";
  }

  // An entry belongs on this room's page when it carries the room's own tag,
  // or when any of its sub-items does. Asking only the first question made an
  // entry that covers several rooms through its sub-items — and so carries no
  // room of its own — unreachable from every room page, taking its sub-items
  // with it (specs/043 FR-001).
  const parentsReachedByASub = new Set(
    db.checklistItems
      .filter((sub) => sub.parent_id && sub.status !== "done" && roomNotDone(sub))
      .map((sub) => sub.parent_id as string)
  );

  const topLevel = db.checklistItems
    .filter((item) => !item.parent_id && (roomNotDone(item) || parentsReachedByASub.has(item.id)))
    .sort(byCreatedDesc);

  return topLevel.map((item) => ({
    ...item,
    sub_items: db.checklistItems
      .filter(
        (sub) =>
          sub.parent_id === item.id &&
          sub.status !== "done" &&
          (sub.room_ids.length === 0 || roomNotDone(sub))
      )
      .sort(byCreatedDesc),
  }));
}

export async function localAddChecklistItem(input: {
  text: string;
  roomIds: string[];
  parentId?: string;
  detail?: string;
  startDate?: string;
  dueDate?: string;
}): Promise<ChecklistItem> {
  const db = await loadDb();
  const item: ChecklistItem = {
    id: randomUUID(),
    text: input.text,
    detail: input.detail ?? null,
    status: "todo",
    start_date: input.startDate ?? null,
    due_date: input.dueDate ?? null,
    room_ids: input.roomIds,
    room_statuses: input.roomIds.map((roomId) => ({ room_id: roomId, status: "todo" as ChecklistStatus })),
    parent_id: input.parentId ?? null,
    sub_items: [],
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.checklistItems.push(item);
  await persist(db);
  return item;
}

// Keeps a parent's status in sync with its sub-items in both directions
// (specs/029-checklist-subitems FR-003/FR-004, now 3-way per specs/032):
// setting a sub-item's status recomputes its parent via rollup over all
// siblings; setting a parent's status cascades to every sub-item. Only ever
// the mechanism for an item with no room tags (a room-tagged item's own
// status control isn't exposed — see localSetChecklistItemRoomStatus).
export async function localSetChecklistItemStatus(
  id: string,
  status: ChecklistStatus
): Promise<ChecklistItem | null> {
  const db = await loadDb();
  const item = db.checklistItems.find((i) => i.id === id);
  if (!item) return null;

  item.status = status;
  item.updated_at = nowIso();

  if (item.parent_id) {
    const siblings = db.checklistItems.filter((i) => i.parent_id === item.parent_id);
    const parent = db.checklistItems.find((i) => i.id === item.parent_id);
    if (parent) {
      parent.status = rollupChecklistStatus(siblings.map((sibling) => sibling.status));
      parent.updated_at = nowIso();
    }
  } else {
    for (const child of db.checklistItems) {
      if (child.parent_id === id) {
        child.status = status;
        child.updated_at = nowIso();
      }
    }
  }

  await persist(db);
  return item;
}

// A single room tag's own status (specs/031-checklist-room-completion,
// specs/032-checklist-detail-status-colors) — writes that one
// room_statuses entry, recomputes the item's own derived status, then
// re-syncs the parent from siblings if this item has one (upward sync
// only, specs/031 research.md Decision 5).
export async function localSetChecklistItemRoomStatus(
  itemId: string,
  roomId: string,
  status: ChecklistStatus
): Promise<{ status: ChecklistStatus } | null> {
  const db = await loadDb();
  const item = db.checklistItems.find((i) => i.id === itemId);
  if (!item) return null;

  const roomStatus = item.room_statuses.find((rs) => rs.room_id === roomId);
  if (!roomStatus) return null;
  roomStatus.status = status;
  recomputeStatus(item);
  item.updated_at = nowIso();

  if (item.parent_id) {
    const siblings = db.checklistItems.filter((i) => i.parent_id === item.parent_id);
    const parent = db.checklistItems.find((i) => i.id === item.parent_id);
    if (parent) {
      parent.status = rollupChecklistStatus(siblings.map((sibling) => sibling.status));
      parent.updated_at = nowIso();
    }
  }

  await persist(db);
  return { status: item.status };
}

export async function localEditChecklistItem(
  id: string,
  updates: { text?: string; roomIds?: string[]; detail?: string | null; startDate?: string | null; dueDate?: string | null }
): Promise<ChecklistItem | null> {
  const db = await loadDb();
  const item = db.checklistItems.find((i) => i.id === id);
  if (!item) return null;
  if (updates.text !== undefined) item.text = updates.text;
  if (updates.detail !== undefined) item.detail = updates.detail;
  if (updates.startDate !== undefined) item.start_date = updates.startDate;
  if (updates.dueDate !== undefined) item.due_date = updates.dueDate;
  if (updates.roomIds !== undefined) {
    // Full-replace semantics, same as the Supabase branch: the new room set
    // starts fresh, none of it done yet.
    item.room_ids = updates.roomIds;
    item.room_statuses = updates.roomIds.map((roomId) => ({ room_id: roomId, status: "todo" as ChecklistStatus }));
    if (updates.roomIds.length > 0) item.status = "todo";
  }
  item.updated_at = nowIso();
  await persist(db);
  return item;
}

export async function localDeleteChecklistItem(id: string): Promise<ChecklistItem | null> {
  const db = await loadDb();
  const index = db.checklistItems.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const [removed] = db.checklistItems.splice(index, 1);
  // No real FK to cascade on in a JSON store — remove sub-items by hand
  // (specs/029-checklist-subitems Edge Cases: deleting a parent deletes
  // every one of its sub-items).
  db.checklistItems = db.checklistItems.filter((item) => item.parent_id !== id);
  await persist(db);
  return removed;
}

// ---------------------------------------------------------------------------
// Requirement checklist (specs/046-subgroup-requirement-checklist). Same
// contract as the Supabase path in app/actions/group-requirements.ts and
// lib/data.ts (Constitution III). Functions return null for "not found" so the
// Server Action can phrase the refusal.
// ---------------------------------------------------------------------------

function renumberRequirements(db: LocalDb, groupId: string): GroupRequirement[] {
  const siblings = db.groupRequirements
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order);
  siblings.forEach((item, position) => {
    item.sort_order = position + 1;
  });
  return siblings;
}

export async function localGetGroupRequirements(categoryId: string): Promise<Record<string, GroupRequirement[]>> {
  const db = await loadDb();
  const groupIds = new Set(
    db.documentGroups.filter((group) => group.category_id === categoryId).map((group) => group.id)
  );
  const byGroup: Record<string, GroupRequirement[]> = {};
  for (const item of [...db.groupRequirements].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!groupIds.has(item.group_id)) continue;
    (byGroup[item.group_id] ??= []).push({ ...item });
  }
  return byGroup;
}

export async function localAddRequirement(input: {
  groupId: string;
  nameTh: string;
  status: RequirementStatus;
  note: string | null;
}): Promise<GroupRequirement | null> {
  const db = await loadDb();
  if (!db.documentGroups.some((group) => group.id === input.groupId)) return null;
  const count = db.groupRequirements.filter((item) => item.group_id === input.groupId).length;
  const item: GroupRequirement = {
    id: randomUUID(),
    group_id: input.groupId,
    name_th: input.nameTh,
    status: input.status,
    note: input.note,
    sort_order: count + 1,
  };
  db.groupRequirements.push(item);
  await persist(db);
  return { ...item };
}

export async function localUpdateRequirement(
  id: string,
  changes: { nameTh?: string; status?: RequirementStatus; note?: string | null }
): Promise<GroupRequirement | null> {
  const db = await loadDb();
  const item = db.groupRequirements.find((candidate) => candidate.id === id);
  if (!item) return null;
  if (changes.nameTh !== undefined) item.name_th = changes.nameTh;
  if (changes.status !== undefined) item.status = changes.status;
  if (changes.note !== undefined) item.note = changes.note;
  await persist(db);
  return { ...item };
}

export async function localDeleteRequirement(id: string): Promise<{ id: string } | null> {
  const db = await loadDb();
  const index = db.groupRequirements.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const [removed] = db.groupRequirements.splice(index, 1);
  renumberRequirements(db, removed.group_id);
  await persist(db);
  return { id };
}

// "edge" when the item is already first (up) or last (down).
export async function localMoveRequirement(
  id: string,
  direction: "up" | "down"
): Promise<GroupRequirement[] | "edge" | null> {
  const db = await loadDb();
  const item = db.groupRequirements.find((candidate) => candidate.id === id);
  if (!item) return null;
  const siblings = renumberRequirements(db, item.group_id);
  const index = siblings.findIndex((candidate) => candidate.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return "edge";
  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  siblings.forEach((sibling, position) => {
    sibling.sort_order = position + 1;
  });
  await persist(db);
  return siblings.map((sibling) => ({ ...sibling }));
}

export async function localSetGroupDescription(
  groupId: string,
  description: string | null
): Promise<{ id: string; description: string | null } | null> {
  const db = await loadDb();
  const group = db.documentGroups.find((candidate) => candidate.id === groupId);
  if (!group) return null;
  group.description = description;
  await persist(db);
  return { id: groupId, description };
}

export async function localSetCategoryDescription(
  categoryId: string,
  description: string | null
): Promise<{ id: string; description: string | null } | null> {
  const db = await loadDb();
  const category = db.documentCategories.find((candidate) => candidate.id === categoryId);
  if (!category) return null;
  category.description = description;
  await persist(db);
  return { id: categoryId, description };
}
