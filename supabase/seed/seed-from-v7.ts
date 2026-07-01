/**
 * OPTIONAL one-time import script — walks a local copy of the v7 folder
 * structure (see the old DG Warehouse 01 v7 constitution notes) and uploads
 * every file into the matching Supabase Storage bucket + metadata row.
 *
 * Not part of the deployed app. Run locally, once, against a real Supabase
 * project:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx supabase/seed/seed-from-v7.ts "D:\Claude\Projects\DGWarehouse"
 *
 * Requires supabase/migrations/0001-0004 already applied (rooms, work
 * types, and document categories seeded) so slugs below resolve to real IDs.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

const ROOM_FOLDER_TO_SLUG: Record<string, string> = {
  "🏠 ห้องแรก": "hong-raek",
  "🏢 ห้องกลาง": "hong-klang",
  "ห้องย่อย 1": "hong-soi-1",
  "ห้องย่อย 2": "hong-soi-2",
  "ห้องย่อย 3": "hong-soi-3",
  "ห้องย่อย 4": "hong-soi-4",
};

const WORK_TYPE_FOLDER_PREFIX_TO_SLUG: Array<[string, string]> = [
  ["🧱", "firewalls"],
  ["⚡", "electrical"],
  ["🏠", "roofing"],
  ["🏗️", "flooring"],
  ["🌊", "drainage"],
  ["📷", "overview"],
];

const DOC_CATEGORY_FOLDER_PREFIX_TO_SLUG: Array<[string, string]> = [
  ["หมวดที่ 1", "structure"],
  ["หมวดที่ 2", "electrical"],
  ["หมวดที่ 3", "environment"],
  ["หมวดที่ 4", "safety"],
];

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const DOC_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx"]);

function slugForPrefix(name: string, table: Array<[string, string]>): string | null {
  const match = table.find(([prefix]) => name.startsWith(prefix) || name.includes(prefix));
  return match?.[1] ?? null;
}

async function walkPhotos(supabase: ReturnType<typeof createClient<Database>>, root: string) {
  const progressRoot = path.join(root, "📸 รูปภาพความคืบหน้า (Progress Photos)");
  const roomFolders = await readdir(progressRoot).catch(() => []);

  for (const roomFolder of roomFolders) {
    const roomSlug = ROOM_FOLDER_TO_SLUG[roomFolder];
    const roomPath = path.join(progressRoot, roomFolder);
    if (!(await stat(roomPath)).isDirectory()) continue;

    // ห้องเย็น wraps ห้องย่อย 1-4 one level deeper.
    const entries = roomSlug ? [{ folder: roomFolder, dir: roomPath, slug: roomSlug }] : [];
    if (!roomSlug) {
      const subFolders = await readdir(roomPath).catch(() => []);
      for (const sub of subFolders) {
        const subSlug = ROOM_FOLDER_TO_SLUG[sub];
        if (subSlug) entries.push({ folder: sub, dir: path.join(roomPath, sub), slug: subSlug });
      }
    }

    for (const { dir, slug } of entries) {
      const { data: room } = await supabase.from("rooms").select("id").eq("slug", slug).single();
      if (!room) {
        console.warn(`Skipping unknown room slug "${slug}"`);
        continue;
      }

      const weekFolders = await readdir(dir).catch(() => []);
      for (const weekFolder of weekFolders) {
        const weekMatch = weekFolder.match(/สัปดาห์ที่\s*(\d+)/);
        if (!weekMatch) continue;
        const weekNumber = Number(weekMatch[1]);
        const weekPath = path.join(dir, weekFolder);

        const workTypeFolders = await readdir(weekPath).catch(() => []);
        for (const workTypeFolder of workTypeFolders) {
          const workTypeSlug = slugForPrefix(workTypeFolder, WORK_TYPE_FOLDER_PREFIX_TO_SLUG);
          if (!workTypeSlug) continue;

          const { data: workType } = await supabase
            .from("work_types")
            .select("id")
            .eq("slug", workTypeSlug)
            .single();
          if (!workType) continue;

          let { data: week } = await supabase
            .from("weeks")
            .select("id")
            .eq("room_id", room.id)
            .eq("work_type_id", workType.id)
            .eq("week_number", weekNumber)
            .maybeSingle();

          if (!week) {
            const { data: inserted, error } = await supabase
              .from("weeks")
              .insert({
                room_id: room.id,
                work_type_id: workType.id,
                week_number: weekNumber,
                label: `สัปดาห์ที่ ${weekNumber}`,
              })
              .select("id")
              .single();
            if (error || !inserted) {
              console.error(`Failed to create week ${weekNumber} for ${slug}/${workTypeSlug}:`, error);
              continue;
            }
            week = inserted;
          }

          const photoDir = path.join(weekPath, workTypeFolder);
          const files = await readdir(photoDir).catch(() => []);
          for (const fileName of files) {
            if (!PHOTO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) continue;

            const filePath = path.join(photoDir, fileName);
            const buffer = await readFile(filePath);
            const storagePath = `${week.id}/${randomUUID()}-${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("photos")
              .upload(storagePath, buffer);
            if (uploadError) {
              console.error(`Upload failed for ${filePath}:`, uploadError.message);
              continue;
            }

            const { error: insertError } = await supabase
              .from("photos")
              .insert({ week_id: week.id, storage_path: storagePath, file_name: fileName });
            if (insertError) {
              console.error(`Insert failed for ${filePath}:`, insertError.message);
              continue;
            }

            console.log(`Imported photo: ${slug}/${workTypeSlug}/สัปดาห์ที่ ${weekNumber}/${fileName}`);
          }
        }
      }
    }
  }
}

async function walkDocuments(supabase: ReturnType<typeof createClient<Database>>, root: string) {
  const topLevel = await readdir(root).catch(() => []);

  for (const folder of topLevel) {
    const categorySlug = slugForPrefix(folder, DOC_CATEGORY_FOLDER_PREFIX_TO_SLUG);
    if (!categorySlug) continue;

    const { data: category } = await supabase
      .from("document_categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (!category) continue;

    const categoryPath = path.join(root, folder);
    await walkDocumentFiles(supabase, categoryPath, category.id, categorySlug);
  }
}

async function walkDocumentFiles(
  supabase: ReturnType<typeof createClient<Database>>,
  dir: string,
  categoryId: string,
  categorySlug: string
) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDocumentFiles(supabase, entryPath, categoryId, categorySlug);
      continue;
    }

    if (!DOC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    const buffer = await readFile(entryPath);
    const storagePath = `${categoryId}/${randomUUID()}-${entry.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer);
    if (uploadError) {
      console.error(`Upload failed for ${entryPath}:`, uploadError.message);
      continue;
    }

    const { error: insertError } = await supabase
      .from("documents")
      .insert({ category_id: categoryId, storage_path: storagePath, file_name: entry.name });
    if (insertError) {
      console.error(`Insert failed for ${entryPath}:`, insertError.message);
      continue;
    }

    console.log(`Imported document: ${categorySlug}/${entry.name}`);
  }
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: npx tsx supabase/seed/seed-from-v7.ts "<path-to-v7-DGWarehouse-folder>"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceRoleKey);

  await walkPhotos(supabase, root);
  await walkDocuments(supabase, root);

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
