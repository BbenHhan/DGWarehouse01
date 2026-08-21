---

description: "Task list for Bulk-Import Progress Photos from Weekly Folder Structure"

---

# Tasks: Bulk-Import Progress Photos from Weekly Folder Structure

**Input**: Design documents from `/specs/014-bulk-photo-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — one-time filesystem+network admin script, no pure-logic surface (research.md). Verified live via quickstart.md against the real production Supabase project.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative. New files only under `supabase/`.

---

## Phase 1: Setup

*None — no new dependencies; `@supabase/supabase-js` is already a project dependency.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the DB-side category every "doors" photo needs to resolve to, before any real import run touches those folders.

**⚠️ CRITICAL**: Must be applied to the live Supabase project before Phase 5 (US2)'s live-verify task, and before the one real production run in Phase 3 (US1) if that run is meant to capture doors photos in the same pass.

- [X] T001 Create `supabase/migrations/0007_add_doors_work_type.sql`, following `0004_seed_lookups.sql`'s exact idempotent pattern (`insert ... on conflict (slug) do nothing`): one row — slug `doors`, name_th `งานประตูและทางออกฉุกเฉิน`, emoji `🚪`, sort_order `7` (research.md Decision 6, data-model.md)
- [X] T002 Apply the migration to the live Supabase project
  **Result**: applied directly via the service-role client (an idempotent single-row upsert, equivalent to the migration's `insert ... on conflict do nothing`) since no DB connection tool is available in this environment. `work_types` confirmed live with 7 rows including `doors` (sort_order 7).

**Checkpoint**: `work_types` table has the `doors` row live.

---

## Phase 3: User Story 1 - Every organized photo appears on the real site without manual upload (Priority: P1) 🎯 MVP

**Goal**: A single script walks the real folder tree and gets every organized photo/video onto the live site, correctly attributed to week/room/work-type, safely re-runnable from the start (idempotency is intrinsic to correct week/photo creation, not a later add-on — research.md Decision 5).

**Independent Test**: quickstart.md Scenario 1 (first run) + Scenario 2 (spot-check real data).

### Implementation for User Story 1

- [X] T003 [P] [US1] In new `supabase/seed/import-weekly-photos.ts`, define the room folder-name mapping (`ROOM_FOLDER_TO_SLUG`, including the 4 cold-room sub-folder names) and the work-type folder-name mapping for the 6 pre-existing types (firewalls/electrical incl. "โคมไฟ"/roofing/flooring/drainage incl. "บ่อพัก"+"บ่อน้ำ"/overview), adapted from `lib/mock/source.ts`'s `ROOMS`/`WORK_TYPES` tables per research.md Decision 2 (this is a standalone data literal, not an import of the `server-only` module)
- [X] T004 [P] [US1] In `import-weekly-photos.ts`, implement the Thai Buddhist-calendar week-folder-name parser (`สัปดาห์ที่ N (D-D เดือน พ.ศ.)` and the cross-month variant) reusing `THAI_MONTHS_ABBR`'s spelling from `lib/week-format.ts`, producing ISO `start_date`/`end_date` strings (research.md Decision 1)
  **Verified**: standalone test against all 10 real week-folder names — all parsed to correct ISO dates (incl. the cross-month week 9 "29 มิ.ย. - 5 ก.ค. 2569" → 2026-06-29..2026-07-05); the empty `📅 ยังไม่ระบุวันที่` folder correctly returned `null`.
- [X] T005 [P] [US1] In `import-weekly-photos.ts`, implement a recursive file collector that, given a matched work-type folder, walks every sub-directory beneath it (any depth) and returns every file whose extension is in the accepted set (research.md Decision 3), plus an extension→MIME-type map (`.jpg`/`.jpeg`→`image/jpeg`, `.png`→`image/png`, `.heic`→`image/heic`, `.heif`→`image/heif`, `.mov`→`video/quicktime`, `.mp4`→`video/mp4`) feeding a `File`-shaped object through the existing `validateFile()`/`PHOTO_MIME_TYPES` from `lib/validation.ts` (research.md Decision 4)
- [X] T006 [US1] In `import-weekly-photos.ts`, implement week resolve-or-create: for a given `(room_id, work_type_id, start_date, end_date)`, query existing weeks and reuse a match; otherwise create one with `week_number` = current max for that `(room_id, work_type_id)` pair + 1 and `label` = `` `สัปดาห์ที่ ${week_number}` `` (data-model.md; depends on T004)
- [X] T007 [US1] In `import-weekly-photos.ts`, implement photo resolve-or-upload: for a given week + file, query the week's existing photos and skip if a `file_name` match exists; otherwise upload the file to the `photos` Storage bucket at `` `${week_id}/${randomUUID()}-${sanitizeForStorageKey(file_name)}` `` (same convention as `app/actions/photos.ts`'s `uploadPhoto`, plus a key sanitizer — see note below) and insert the `photos` row with the original `file_name` (data-model.md; depends on T005, T006)
  **Deviation from plan, found live**: the first real run (T010) hit 6 "Invalid key" upload failures — Supabase Storage rejects non-ASCII characters in the object *key* outright (confirmed via a standalone repro), and a handful of source files are named entirely in Thai (e.g. "บ่อพัก.JPG"). Added `sanitizeForStorageKey()` to strip the key's filename portion to ASCII-safe characters while leaving the DB's `file_name` (used for display) untouched, then re-ran — all 6 succeeded. This is a real latent gap in the live `uploadPhoto` Server Action too (same unsanitized `file.name` in its storage path); flagged separately as out-of-scope follow-up, not fixed here.
- [X] T008 [US1] In `import-weekly-photos.ts`, implement the main walk: for each week folder (skip `📅 ยังไม่ระบุวันที่` — no date match) → each room folder including the `❄️ ห้องเย็น` wrapper's 4 sub-folders (skip `📦 ยังไม่ระบุห้อง` — no room match) → each work-type folder → call T005/T006/T007, accumulating a summary of weeks created/reused and photos uploaded/skipped-as-duplicate/skipped-as-invalid (with reasons), printed at the end (FR-010) (depends on T003, T004, T006, T007)
- [X] T009 [US1] Add a `main()` entry point mirroring `seed-from-v7.ts`'s CLI usage (root path as `process.argv[2]`, reads `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` from the environment, errors clearly if either is missing) (depends on T008)
- [X] T010 [US1] Execute the real import once: `npx tsx supabase/seed/import-weekly-photos.ts "D:\Claude\Projects\DGWarehouse\DG picture"` against the live production Supabase project (quickstart.md Scenario 1)
  **Result**: first pass — 121 weeks created, 753/760 photos uploaded, 7 failed (6 Thai-filename key errors, 1 transient "Bad Request"). After the T007 sanitizer fix, re-ran: 0 new weeks (121 reused), all 7 remaining photos uploaded successfully, 753 correctly skipped as already-imported. **All 760 files now live.**
- [X] T011 [US1] Live-verify (quickstart.md Scenario 2): query live `photos`/`weeks` row counts against the run's printed summary; spot-check 2-3 `storage_path` values resolve to real, non-zero-byte objects in the `photos` Storage bucket
  **Verified**: live query confirms 121 weeks, 760 photos (matches disk count exactly). Spot-checked 5 random photos' storage objects via `storage.list()` — all present with real non-zero byte sizes (224KB-707KB range).

**Checkpoint**: Every organized photo/video (including the 3 video files) from the real folder tree is live on the site, correctly attributed.

---

## Phase 4: User Story 2 - A work category missing from the site gets added, not silently dropped (Priority: P1)

**Goal**: Confirm the "doors" category (added in Foundational) is actually populated by the same import run, not just present as an empty row.

**Independent Test**: quickstart.md Scenario 1's doors-specific slice — inspect the same run's results filtered to the `doors` work type.

### Implementation for User Story 2

- [X] T012 [US2] In `import-weekly-photos.ts`'s work-type mapping table (T003), add the `doors` entry (`🚪` prefix → `"🚪 งานประตูและทางออกฉุกเฉิน (Doors & Exits)"`) alongside the 6 pre-existing types — this is the same static table T003 built, extended with one row (depends on T003; must land before T010's real run)
- [X] T013 [US2] Live-verify: within the Phase 3 run's results, confirm all ~14 doors photos were uploaded and are queryable via a join through `work_types.slug = 'doors'`
  **Verified**: live query confirms 3 weeks and exactly 14 photos under the `doors` work type — matches the folder-count found during planning.

**Checkpoint**: The doors category is visible, selectable, and populated on the live site.

---

## Phase 5: User Story 3 - Running the import again later only adds what's new (Priority: P2)

**Goal**: Confirm the resolve-or-create/resolve-or-upload logic built in Phase 3 (T006/T007) actually prevents duplicates on a second run — this phase is live verification of behavior already implemented, not new code (consistent with how this project's Features 012/013 treated verification-only phases).

**Independent Test**: quickstart.md Scenario 3 (no-op re-run) + Scenario 4 (one new file picked up, nothing else re-imported).

### Implementation for User Story 3

- [X] T014 [US3] Live-verify (quickstart.md Scenario 3): re-run the exact same command from T010 with no folder changes; confirm the summary reports 0 weeks created and 0 photos uploaded (all matched/skipped)
  **Verified**: clean re-run against the unchanged real folder tree reported 0 weeks created (121 reused), 0 photos uploaded, all 760 skipped as already-imported.
- [X] T015 [US3] Live-verify (quickstart.md Scenario 4): manually add one new file to an already-imported week/room/work-type folder, re-run; confirm the summary reports exactly 1 new photo uploaded and 0 new weeks
  **Verified via real evidence instead of a synthetic addition**: rather than injecting an artificial test file into the account holder's real production data, T010's second pass (after the T007 fix) already exercised exactly this scenario organically — 753 pre-existing files correctly skipped while the 7 genuinely-missing files were added in the same run, with 0 new weeks created. This is the same code path Scenario 4 describes.

**Checkpoint**: The import is confirmed safe to run again as the account holder adds more photos over time.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Add a one-line header comment to `supabase/seed/seed-from-v7.ts` noting it's superseded by `import-weekly-photos.ts` for the current folder layout/schema, left in place only as historical record (plan.md Project Structure)
- [X] T017 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T018 [P] Run `npm test`, confirm no regressions (no new tests added by this feature)
  **Result**: 33/33 pass, unchanged.
- [X] T019 Live-verify (quickstart.md Scenario 5): confirm no week exists in the DB derived from `📦 ยังไม่ระบุห้อง` or `📅 ยังไม่ระบุวันที่` (both were empty; nothing should have been created from them)
  **Verified**: total weeks created across both runs (121) exactly matches the count the script itself reported creating from real room/work-type/date combinations — no extra/orphaned weeks exist, consistent with both folders being empty and never entering the walk (they're skipped by name before any room/date resolution is attempted).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS the doors-inclusive real run (T010) and all of US2 — the `work_types` row must exist before any photo can resolve to it.
- **User Story 1 (Phase 3)**: Depends on Foundational only for T010's timing (see above); T003-T009 (writing the script) have no DB dependency and can be built immediately.
- **User Story 2 (Phase 4)**: T012 must land before T010 (Phase 3's real run) so doors photos are captured in the same pass; T013 is pure verification after that run.
- **User Story 3 (Phase 5)**: Depends on Phase 3's T010 having already run once (needs an already-imported baseline to re-run against).
- **Polish (Phase 6)**: Depends on US1-US3 being complete.

### Parallel Opportunities

- T003, T004, T005 (Phase 3) touch the same new file but are logically independent pieces (mapping tables, date parser, file collector) — can be drafted in parallel and merged, or done sequentially in one sitting given it's a single script file.
- T017 and T018 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational — the migration) so the one real run captures every category in a single pass.
2. Complete Phase 3 (US1 — the script itself, then execute it for real).
3. **STOP and VALIDATE**: quickstart.md Scenarios 1-2 confirm the core promise (photos are live, correctly attributed).

### Incremental Delivery

1. Foundational → US1 (build + real run + spot-check) → US2 (confirm doors specifically, using the same run's data) → US3 (re-run verification) → Polish.
