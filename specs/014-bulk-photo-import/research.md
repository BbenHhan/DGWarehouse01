# Phase 0 Research: Bulk-Import Progress Photos from Weekly Folder Structure

## Decision 1: Parse week date ranges from Thai Buddhist-calendar folder names

**Decision**: Parse `"สัปดาห์ที่ N (D-D เดือน พ.ศ.)"` and the cross-month variant `"สัปดาห์ที่ N (D เดือน - D เดือน พ.ศ.)"` with a regex against the 12 Thai month abbreviations already enumerated in `lib/week-format.ts` (`THAI_MONTHS_ABBR`), converting the trailing 4-digit Buddhist year to Gregorian via `year - 543`, and emit ISO `YYYY-MM-DD` strings for `start_date`/`end_date`.

**Rationale**: `lib/week-format.ts` already defines the exact reverse operation (ISO date → Thai display string) and the exact month-abbreviation list the folder names use (confirmed by direct inspection: "พ.ค.", "มิ.ย.", "ก.ค." all appear verbatim in `THAI_MONTHS_ABBR`). Reusing that list (rather than re-deriving it) guarantees the parser and the app's own formatter agree on spelling. The +543/-543 Buddhist-year conversion is the same one-line arithmetic `parseIsoDate` already does in reverse.

**Two folder-name shapes confirmed present** (both must parse):
- Same month: `"สัปดาห์ที่ 8 (22-28 มิ.ย. 2569)"` → start `2026-06-22`, end `2026-06-28`.
- Crosses a month boundary: `"สัปดาห์ที่ 9 (29 มิ.ย. - 5 ก.ค. 2569)"` → start `2026-06-29`, end `2026-07-05` (both sides carry their own month abbreviation when they differ; the year only appears once, at the end, and applies to both sides — confirmed neither side crosses a Buddhist-calendar year boundary in the current data, so a single trailing year is unambiguous).

**Alternatives considered**: Hand-maintain a lookup table of week-number → date-range instead of parsing the folder name. Rejected — the whole point of FR-002 is that the folder name *is* the source of truth for the date range; a hardcoded table would silently drift the moment the account holder adds week 11.

## Decision 2: Room/work-type folder-name mapping — reuse, don't re-derive

**Decision**: Reuse the exact `ROOMS`/`WORK_TYPES` folder-name mapping tables already defined in `lib/mock/source.ts` (extended with the new `doors` entry: prefix `🚪`, matching `"🚪 งานประตูและทางออกฉุกเฉิน (Doors & Exits)"`) as the source of truth for which folder names correspond to which room/work-type slug, rather than writing a second, independent mapping.

**Rationale**: `lib/mock/source.ts`'s tables were already built and validated against this exact same real folder tree (it's the module that renders the legacy read-only "mock" view of it) — including the two non-obvious cases this feature also needs: the "cold room" wrapper folder (`❄️ ห้องเย็น`) whose four sub-folders (`ห้องย่อย 1`..`4`) are the real per-room targets, not the wrapper itself; and the `electrical` work type also matching a bare `"โคมไฟ"` folder name (a lamp-fixtures sub-category someone filed separately). Re-deriving these mappings independently risks reintroducing bugs `lib/mock/source.ts` already worked through. The import script imports its own copy of just the mapping *data* (folder-name → slug tables) rather than importing `lib/mock/source.ts`'s functions directly, since that module is marked `import "server-only"` and reads via a different root-path env var (`MOCK_DATA_ROOT`) than this script uses.

**Alternatives considered**: Point `MOCK_DATA_ROOT` at the new folder and drive the import off `mockGetPhotos()`'s already-built in-memory index. Rejected — that module is `server-only` (can't be imported from a standalone `tsx` script cleanly) and, more importantly, its `Photo.storage_path` values are local filesystem paths, not the `${weekId}/${uuid}-${fileName}` Supabase Storage keys this import needs to write.

## Decision 3: Recursive file collection under a matched work-type folder

**Decision**: Once a work-type folder is matched under a room/week, recursively walk every sub-directory beneath it and collect every file whose extension is in the accepted list — regardless of how many extra descriptive sub-folders (`รางน้ำ`, `โครงผนัง`, `โครงหลังคา`, etc.) the account holder nested underneath. The sub-folder's own name is never inspected or used for categorization.

**Rationale**: Direct inspection confirmed these extra sub-folders exist purely as the account holder's own bookkeeping (e.g. grouping a handful of flooring photos under a "gutter" label) one level inside an already-matched work-type folder — they don't represent a different work type and have no folder-name mapping of their own. FR-004 requires this explicitly. A depth-limited (one extra level only) walk would work for every case seen today, but an unbounded recursive walk is no more complex to write and doesn't silently break if the account holder nests one level deeper next time.

## Decision 4: File-type acceptance and MIME-type detection

**Decision**: Reuse `lib/validation.ts`'s existing `PHOTO_MIME_TYPES` allowlist and `MAX_FILE_SIZE_BYTES`/`validateFile()` unchanged. Since this script reads files directly off disk (no browser `File` object supplies a `.type`), map file extension → MIME type with a small explicit table covering exactly the extensions observed in the real folder tree (`.jpg`/`.jpeg`→`image/jpeg`, `.png`→`image/png`, `.heic`→`image/heic`, `.heif`→`image/heif`, `.mov`→`video/quicktime`, `.mp4`→`video/mp4`), then run the resulting `File`-shaped object through the same `validateFile()` the live upload path uses, so any file that wouldn't have been accepted through the browser is skipped and reported the same way (FR-009), not silently imported through a looser path.

**Rationale**: Constitution VIII requires one allowlist as the single source of truth — writing a second, parallel accept-list for this script would violate that the first time someone updates `lib/validation.ts` and forgets this script exists.

**Alternatives considered**: Skip validation entirely since this is a trusted, locally-run script. Rejected — the whole point of reusing the shared validator is that "imported the same way a manual upload would have been accepted" is a real product guarantee (see spec Assumptions), not just a convenience.

## Decision 5: Idempotent re-runs — matching strategy

**Decision**:
- **Weeks**: before creating a week for a (room, work type) pair, query existing weeks for that pair and match by exact `(start_date, end_date)`. If a match exists, reuse its id. If none exists, create a new week the same way the live `createWeek` Server Action does — `week_number` = current max for that (room, work type) pair + 1, `label` = `` `สัปดาห์ที่ ${weekNumber}` `` (the raw `label` field is a bookkeeping fallback only; the UI always prefers `formatWeekDateRangeOrNull(week)` when dates are present, confirmed by reading `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`, so this raw label is never actually shown once dates are populated).
- **Photos**: before uploading a file into a (now-resolved) week, fetch the week's existing photos and match by `file_name`. If a photo with that exact file name already exists in that week, skip it (already imported). Otherwise upload and insert.

**Rationale**: This directly satisfies FR-008/SC-003 (safe re-run, no duplicates) using only fields the schema already has — no new "import batch" tracking table or external state file is needed. File-name matching within a single week is a reasonable-and-sufficient uniqueness signal here: photos are camera-generated filenames (`IMGxxxx.jpg`) that are already unique within the small set of files the account holder files into one work-type/week folder, and the cost of a false-positive skip (a genuinely different photo that happens to share a camera-assigned filename with one already imported into the same narrow week/room/work-type bucket) is low and easily corrected by hand through the existing edit UI, versus the cost of a false-negative duplicate-upload on every re-run, which is the failure mode FR-008 exists to prevent.

**Alternatives considered**: Content-hash every file to detect true duplicates. Rejected as unnecessary complexity — file name is sufficient for a script whose worst failure mode (an occasional missed re-import of a same-named-but-different file) is easily fixed by hand later, while content-hashing 760 files adds real runtime cost for a one-time script with no such reported problem.

## Decision 6: New migration for the missing "doors" work type

**Decision**: Add `supabase/migrations/0007_add_doors_work_type.sql`, following `0004_seed_lookups.sql`'s exact idempotent pattern (`insert ... on conflict (slug) do nothing`), inserting one row: slug `doors`, name_th `งานประตูและทางออกฉุกเฉิน`, emoji `🚪`, sort_order `7`.

**Rationale**: Confirmed via a live query that the `work_types` table currently has exactly 6 rows and none has slug `doors`, while the real folder tree has 14 real photos filed under a "Doors & Exits" folder across multiple weeks/rooms. The account holder was asked directly and chose to add the category (over skipping those 14 photos). `sort_order 7` places it last, after the other six, matching the position `lib/mock/source.ts`'s `WORK_TYPES` array already uses for this same category in its read-only legacy view.
