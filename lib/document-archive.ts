import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { DATA_SOURCE } from "@/lib/data-config";
import { LOCAL_FILES_DIR } from "@/lib/local/store";
import { MOCK_BASE_DIR } from "@/lib/mock/source";
import { createServiceClient } from "@/lib/supabase/server";
import { groupLabel } from "@/lib/taxonomy-label";
import { archiveSafeName, type ZipEntry } from "@/lib/zip";
import type { Document, DocumentCategory, DocumentGroup } from "@/lib/types";

// Reads one stored document back as bytes. Mirrors lib/storage.ts's split by
// DATA_SOURCE (Constitution III) — that module hands the browser a URL, this
// one hands the server the file, and neither hard-codes a backend.
async function readDocumentBytes(storagePath: string): Promise<Uint8Array | null> {
  if (DATA_SOURCE === "supabase") {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from("documents").download(storagePath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  const baseDir = path.resolve(DATA_SOURCE === "mock" ? MOCK_BASE_DIR : LOCAL_FILES_DIR);
  const resolved = path.resolve(baseDir, storagePath);
  // A storage_path is ours, not a visitor's, but it still ends up in a
  // filesystem join — the same guard the file routes use.
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) return null;

  try {
    return new Uint8Array(await readFile(resolved));
  } catch {
    return null;
  }
}

// Two rows may legitimately carry the same file name, and a ZIP holding two
// identical paths extracts as one file — losing a document with nothing to say
// so (FR-007). Counting the names already taken was not enough: a folder with
// "ก (2).pdf" and two copies of "ก.pdf" produced "ก (2).pdf" twice. Probing
// upwards for a free name cannot collide by construction.
function uniqueIn(taken: Set<string>, name: string): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const extension = path.extname(name);
  const base = path.basename(name, extension);
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})${extension}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

export function archiveFileName(category: Pick<DocumentCategory, "sort_order" | "name_th">): string {
  return `${archiveSafeName(`หมวดที่ ${category.sort_order} ${category.name_th}`)}.zip`;
}

/**
 * The category as a folder tree: one folder per sub-group in the order an
 * editor put them in, each named the way the app labels it ("6.2 ใบรับรอง…").
 *
 * A group holding no files still yields its folder, so the archive doubles as
 * a checklist of what is still missing — and a document belonging to no group
 * lands in a folder of its own rather than vanishing.
 */
export async function* categoryArchiveEntries(
  category: DocumentCategory,
  groups: DocumentGroup[],
  documents: Document[]
): AsyncGenerator<ZipEntry> {
  const root = archiveSafeName(`หมวดที่ ${category.sort_order} ${category.name_th}`);

  const folders: { id: string | null; name: string }[] = groups
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group) => ({ id: group.id, name: archiveSafeName(groupLabel(group, category.sort_order)) }));

  if (documents.some((document) => document.group_id === null)) {
    folders.push({ id: null, name: "ไม่ได้ระบุหมวดย่อย" });
  }

  yield { path: `${root}/` };

  for (const folder of folders) {
    const folderPath = `${root}/${folder.name}`;
    yield { path: `${folderPath}/` };

    const taken = new Set<string>();
    for (const document of documents.filter((candidate) => candidate.group_id === folder.id)) {
      const name = uniqueIn(taken, archiveSafeName(document.file_name));

      const data = await readDocumentBytes(document.storage_path);
      // A row whose object is missing from storage must not abort the whole
      // download — the other files are still worth having.
      if (!data) continue;

      yield { path: `${folderPath}/${name}`, data };
    }
  }
}
