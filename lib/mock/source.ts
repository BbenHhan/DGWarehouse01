import "server-only";

import { readdirSync } from "node:fs";
import path from "node:path";
import type { Document, DocumentCategory, Photo, Room, Week, WorkType } from "@/lib/types";

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

type PhotoIndex = Map<string, { week: Week; photos: Photo[] }>; // key: `${roomId}::${workTypeId}::${weekNumber}`

function buildPhotoIndex(): PhotoIndex {
  const index: PhotoIndex = new Map();
  const photosRoot = path.join(MOCK_BASE_DIR, PHOTOS_ROOT_NAME);

  for (const weekFolder of listDirs(photosRoot)) {
    const weekMatch = weekFolder.match(/สัปดาห์ที่\s*(\d+)/);
    if (!weekMatch) continue; // skips "📅 ยังไม่ระบุวันที่"
    const weekNumber = Number(weekMatch[1]);
    const weekPath = path.join(photosRoot, weekFolder);

    for (const roomFolder of listDirs(weekPath)) {
      if (roomFolder === COLD_ROOM_FOLDER) {
        const coldRoomPath = path.join(weekPath, roomFolder);
        for (const subroomFolder of listDirs(coldRoomPath)) {
          const room = ROOMS.find((r) => r.subroomFolderName === subroomFolder);
          if (!room) continue;
          indexRoomWeek(index, room, weekNumber, weekFolder, path.join(coldRoomPath, subroomFolder));
        }
        continue;
      }

      const room = ROOMS.find((r) => r.folderName === roomFolder);
      if (!room) continue; // skips "📦 ยังไม่ระบุห้อง"
      indexRoomWeek(index, room, weekNumber, weekFolder, path.join(weekPath, roomFolder));
    }
  }

  return index;
}

function indexRoomWeek(
  index: PhotoIndex,
  room: Room,
  weekNumber: number,
  weekFolderLabel: string,
  roomWeekPath: string
) {
  for (const workType of WORK_TYPES) {
    const key = `${room.id}::${workType.id}::${weekNumber}`;
    const matchingFolders = listDirs(roomWeekPath).filter((f) => workType.folderNames.includes(f));
    if (matchingFolders.length === 0) continue;

    let entry = index.get(key);
    if (!entry) {
      entry = {
        week: {
          id: key,
          room_id: room.id,
          work_type_id: workType.id,
          week_number: weekNumber,
          label: weekFolderLabel,
          created_at: "",
        },
        photos: [],
      };
      index.set(key, entry);
    }

    for (const folderName of matchingFolders) {
      const folderPath = path.join(roomWeekPath, folderName);
      for (const fileName of listFiles(folderPath)) {
        if (!PHOTO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) continue;
        const absolutePath = path.join(folderPath, fileName);
        const relativePath = path.relative(MOCK_BASE_DIR, absolutePath).split(path.sep).join("/");
        entry.photos.push({
          id: relativePath,
          week_id: key,
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
      note: null,
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

export async function mockGetWeeks(roomId: string, workTypeId: string): Promise<Week[]> {
  const weeks: Week[] = [];
  for (const [key, entry] of getPhotoIndex()) {
    if (key.startsWith(`${roomId}::${workTypeId}::`)) weeks.push(entry.week);
  }
  return weeks.sort((a, b) => a.week_number - b.week_number);
}

export async function mockGetAllWeeks(): Promise<Week[]> {
  return [...getPhotoIndex().values()].map((entry) => entry.week);
}

export async function mockGetPhotos(weekId: string): Promise<Photo[]> {
  return getPhotoIndex().get(weekId)?.photos ?? [];
}

export async function mockGetDocumentCategories(): Promise<DocumentCategory[]> {
  return DOC_CATEGORIES.map(({ id, slug, name_th, emoji, sort_order }) => ({ id, slug, name_th, emoji, sort_order }));
}

export async function mockGetDocuments(categoryId: string): Promise<Document[]> {
  return getDocumentIndex().get(categoryId) ?? [];
}
