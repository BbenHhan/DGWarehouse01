import "server-only";

import { readdirSync } from "node:fs";
import path from "node:path";
import type { DateFilter } from "@/lib/date-filter";
import { photoMatchesDateFilter } from "@/lib/date-filter";
import type { ChecklistItem, Document, DocumentCategory, DocumentGroup, Photo, Room, WorkType } from "@/lib/types";

// Root of the real v7 local folder this mock data layer reads from.
// Override with MOCK_DATA_ROOT if the folder lives somewhere else.
export const MOCK_BASE_DIR = process.env.MOCK_DATA_ROOT || "D:\\Claude\\Projects\\DGWarehouse";

const PHOTOS_ROOT_NAME = "📸 รูปภาพความคืบหน้า (Progress Photos)";
const COLD_ROOM_FOLDER = "❄️ ห้องเย็น";

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const DOC_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".jpg", ".jpeg"]);

const ROOMS: Array<Room & { folderName?: string; subroomFolderName?: string }> = [
  { id: "hong-raek", slug: "hong-raek", name_th: "ห้องแรก", emoji: "🏠", sort_order: 1, folderName: "🏠 ห้องแรก" },
  { id: "hong-klang", slug: "hong-klang", name_th: "ห้องกลาง", emoji: "🏢", sort_order: 2, folderName: "🏢 ห้องกลาง" },
  { id: "hong-soi-1", slug: "hong-soi-1", name_th: "ห้องย่อย 1", emoji: "❄️", sort_order: 3, subroomFolderName: "ห้องย่อย 1" },
  { id: "hong-soi-2", slug: "hong-soi-2", name_th: "ห้องย่อย 2", emoji: "❄️", sort_order: 4, subroomFolderName: "ห้องย่อย 2" },
  { id: "hong-soi-3", slug: "hong-soi-3", name_th: "ห้องย่อย 3", emoji: "❄️", sort_order: 5, subroomFolderName: "ห้องย่อย 3" },
  { id: "hong-soi-4", slug: "hong-soi-4", name_th: "ห้องย่อย 4", emoji: "❄️", sort_order: 6, subroomFolderName: "ห้องย่อย 4" },
];

// 7 tabs, not 6 — the real folder structure has a "Doors & Exits" work-type
// with real photos in it that the original 6-type spec didn't list. Shown
// here since this mock layer's job is to faithfully display what's really
// on disk; the Supabase-backed schema (6 types) is untouched for later.
const WORK_TYPES: Array<WorkType & { folderNames: string[] }> = [
  { id: "firewalls", slug: "firewalls", name_th: "งานผนังและกำแพงกันไฟ", emoji: "🧱", sort_order: 1, folderNames: ["🧱 งานผนังและกำแพงกันไฟ (Firewalls)"] },
  { id: "electrical", slug: "electrical", name_th: "งานไฟฟ้าและสายล่อฟ้า", emoji: "⚡", sort_order: 2, folderNames: ["⚡ งานไฟฟ้าและสายล่อฟ้า (Electrical)", "โคมไฟ"] },
  { id: "roofing", slug: "roofing", name_th: "งานหลังคาและระบายอากาศ", emoji: "🏠", sort_order: 3, folderNames: ["🏠 งานหลังคาและระบายอากาศ (Roofing & Ventilation)"] },
  { id: "flooring", slug: "flooring", name_th: "งานพื้น", emoji: "🏗️", sort_order: 4, folderNames: ["🏗️ งานพื้น (Flooring)"] },
  { id: "drainage", slug: "drainage", name_th: "บ่อพัก/รางน้ำ", emoji: "🌊", sort_order: 5, folderNames: ["บ่อพัก", "บ่อน้ำ"] },
  { id: "doors", slug: "doors", name_th: "งานประตูและทางออกฉุกเฉิน", emoji: "🚪", sort_order: 6, folderNames: ["🚪 งานประตูและทางออกฉุกเฉิน (Doors & Exits)"] },
  { id: "overview", slug: "overview", name_th: "ภาพรวมทั่วไป", emoji: "📷", sort_order: 7, folderNames: ["📷 ภาพรวมทั่วไป (General Overview)"] },
];

const DOC_CATEGORIES: Array<DocumentCategory & { folderPrefix: string }> = [
  { id: "structure", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1, folderPrefix: "หมวดที่ 1" },
  { id: "electrical", slug: "electrical", name_th: "หมวดที่ 2 ระบบไฟฟ้า", emoji: "⚡", sort_order: 2, folderPrefix: "หมวดที่ 2" },
  { id: "environment", slug: "environment", name_th: "หมวดที่ 3 สิ่งแวดล้อม", emoji: "🌿", sort_order: 3, folderPrefix: "หมวดที่ 3" },
  { id: "safety", slug: "safety", name_th: "หมวดที่ 4 ความปลอดภัย", emoji: "🦺", sort_order: 4, folderPrefix: "หมวดที่ 4" },
];

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function listFiles(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// Best-effort date extraction for this already-legacy, read-only mock
// backend only (specs/018-per-photo-dates/research.md Decision 5) — real
// per-photo dates for live data come from the "supabase"/"local" backends'
// actual `date` column. The v7 folder snapshot embeds a Thai date range as
// plain text in each week folder's name, e.g. "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)"
// — every photo under that folder is assigned that range's start date.
const THAI_MONTHS_ABBR = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const MOCK_FALLBACK_DATE = "1970-01-01"; // used only if a folder's label doesn't parse

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthIndex(abbr: string): number | null {
  const i = THAI_MONTHS_ABBR.indexOf(abbr.trim());
  return i === -1 ? null : i;
}

function parseWeekFolderStartDate(folderName: string): string | null {
  const match = folderName.match(/^สัปดาห์ที่\s*\d+\s*\(([^)]+)\)$/);
  if (!match) return null;
  const rangeText = match[1].trim();

  const sameMonth = rangeText.match(/^(\d{1,2})-(\d{1,2})\s+([ก-๙.]+)\s+(\d{4})$/);
  if (sameMonth) {
    const [, d1, , monthAbbr, beYear] = sameMonth;
    const month = monthIndex(monthAbbr);
    if (month === null) return null;
    return `${Number(beYear) - 543}-${pad(month + 1)}-${pad(Number(d1))}`;
  }

  const crossMonth = rangeText.match(/^(\d{1,2})\s+([ก-๙.]+)\s*-\s*\d{1,2}\s+[ก-๙.]+\s+(\d{4})$/);
  if (crossMonth) {
    const [, d1, monthAbbr1, beYear] = crossMonth;
    const month1 = monthIndex(monthAbbr1);
    if (month1 === null) return null;
    return `${Number(beYear) - 543}-${pad(month1 + 1)}-${pad(Number(d1))}`;
  }

  return null;
}

type PhotoIndex = Map<string, Photo[]>; // key: `${roomId}::${workTypeId}`

function buildPhotoIndex(): PhotoIndex {
  const index: PhotoIndex = new Map();
  const photosRoot = path.join(MOCK_BASE_DIR, PHOTOS_ROOT_NAME);

  for (const weekFolder of listDirs(photosRoot)) {
    if (!weekFolder.match(/สัปดาห์ที่\s*\d+/)) continue; // skips "📅 ยังไม่ระบุวันที่"
    const date = parseWeekFolderStartDate(weekFolder) ?? MOCK_FALLBACK_DATE;
    const weekPath = path.join(photosRoot, weekFolder);

    for (const roomFolder of listDirs(weekPath)) {
      if (roomFolder === COLD_ROOM_FOLDER) {
        const coldRoomPath = path.join(weekPath, roomFolder);
        for (const subroomFolder of listDirs(coldRoomPath)) {
          const room = ROOMS.find((r) => r.subroomFolderName === subroomFolder);
          if (!room) continue;
          indexRoomFolder(index, room, date, path.join(coldRoomPath, subroomFolder));
        }
        continue;
      }

      const room = ROOMS.find((r) => r.folderName === roomFolder);
      if (!room) continue; // skips "📦 ยังไม่ระบุห้อง"
      indexRoomFolder(index, room, date, path.join(weekPath, roomFolder));
    }
  }

  return index;
}

function indexRoomFolder(index: PhotoIndex, room: Room, date: string, roomWeekPath: string) {
  for (const workType of WORK_TYPES) {
    const key = `${room.id}::${workType.id}`;
    const matchingFolders = listDirs(roomWeekPath).filter((f) => workType.folderNames.includes(f));
    if (matchingFolders.length === 0) continue;

    let photos = index.get(key);
    if (!photos) {
      photos = [];
      index.set(key, photos);
    }

    for (const folderName of matchingFolders) {
      const folderPath = path.join(roomWeekPath, folderName);
      for (const fileName of listFiles(folderPath)) {
        if (!PHOTO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) continue;
        const absolutePath = path.join(folderPath, fileName);
        const relativePath = path.relative(MOCK_BASE_DIR, absolutePath).split(path.sep).join("/");
        photos.push({
          id: relativePath,
          room_id: room.id,
          work_type_id: workType.id,
          date,
          storage_path: relativePath,
          file_name: fileName,
          note: null,
          created_at: "",
          updated_at: "",
        });
      }
    }
  }
}

function buildDocumentIndex(): Map<string, Document[]> {
  const index = new Map<string, Document[]>();

  for (const category of DOC_CATEGORIES) {
    const topLevelFolders = listDirs(MOCK_BASE_DIR).filter((f) => f.startsWith(category.folderPrefix));
    const documents: Document[] = [];

    for (const topFolder of topLevelFolders) {
      walkDocuments(path.join(MOCK_BASE_DIR, topFolder), category.id, documents);
    }

    index.set(category.id, documents);
  }

  return index;
}

function walkDocuments(dir: string, categoryId: string, out: Document[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDocuments(entryPath, categoryId, out);
      continue;
    }
    if (!DOC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    const relativePath = path.relative(MOCK_BASE_DIR, entryPath).split(path.sep).join("/");
    out.push({
      id: relativePath,
      category_id: categoryId,
      storage_path: relativePath,
      file_name: entry.name,
      group_id: null,
      created_at: "",
      updated_at: "",
    });
  }
}

let cachedPhotoIndex: PhotoIndex | null = null;
let cachedDocumentIndex: Map<string, Document[]> | null = null;

function getPhotoIndex(): PhotoIndex {
  if (!cachedPhotoIndex) cachedPhotoIndex = buildPhotoIndex();
  return cachedPhotoIndex;
}

function getDocumentIndex(): Map<string, Document[]> {
  if (!cachedDocumentIndex) cachedDocumentIndex = buildDocumentIndex();
  return cachedDocumentIndex;
}

export async function mockGetRooms(): Promise<Room[]> {
  return ROOMS.map(({ id, slug, name_th, emoji, sort_order }) => ({ id, slug, name_th, emoji, sort_order }));
}

export async function mockGetWorkTypes(): Promise<WorkType[]> {
  return WORK_TYPES.map(({ id, slug, name_th, emoji, sort_order }) => ({ id, slug, name_th, emoji, sort_order }));
}

export async function mockGetPhotos(
  roomId: string,
  workTypeId: string,
  filter?: DateFilter
): Promise<Photo[]> {
  const photos = getPhotoIndex().get(`${roomId}::${workTypeId}`) ?? [];
  return photos
    .filter((photo) => photoMatchesDateFilter(photo.date, filter ?? {}))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function mockGetDocumentCategories(): Promise<DocumentCategory[]> {
  return DOC_CATEGORIES.map(({ id, slug, name_th, emoji, sort_order }) => ({ id, slug, name_th, emoji, sort_order }));
}

export async function mockGetDocuments(categoryId: string): Promise<Document[]> {
  return getDocumentIndex().get(categoryId) ?? [];
}

// Mock-backend documents never have a note (specs/017-bulk-document-import's
// import script — the only writer of real note values — never ran against
// this frozen, read-only snapshot), so there's nothing to suggest.
// The frozen v7 folder snapshot has no taxonomy to expose — same precedent as
// mockGetChecklistItems below (specs/040-editable-document-taxonomy).
export async function mockGetDocumentGroups(): Promise<DocumentGroup[]> {
  return [];
}

// The mock backend is a frozen, read-only v7 folder snapshot with no
// checklist concept at all (specs/028-room-checklist/research.md
// Decision 3, same precedent as mockGetDocumentNotes above).
export async function mockGetChecklistItems(): Promise<ChecklistItem[]> {
  return [];
}

export async function mockGetRoomChecklistItems(): Promise<ChecklistItem[]> {
  return [];
}

// Site-wide header stats (total photos/documents/distinct photographed days).
export async function mockGetSiteStats(): Promise<{
  totalPhotos: number;
  totalDocuments: number;
  totalDays: number;
}> {
  const photoIndex = getPhotoIndex();
  const documentIndex = getDocumentIndex();

  let totalPhotos = 0;
  const dates = new Set<string>();
  for (const photos of photoIndex.values()) {
    totalPhotos += photos.length;
    for (const photo of photos) dates.add(photo.date);
  }

  let totalDocuments = 0;
  for (const documents of documentIndex.values()) {
    totalDocuments += documents.length;
  }

  return { totalPhotos, totalDocuments, totalDays: dates.size };
}

// Total photo count per room, across every work type/date — used for the
// sidebar's per-room count badges.
export async function mockGetRoomPhotoCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const photos of getPhotoIndex().values()) {
    for (const photo of photos) {
      counts[photo.room_id] = (counts[photo.room_id] ?? 0) + 1;
    }
  }
  return counts;
}
