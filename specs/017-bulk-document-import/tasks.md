---

description: "Task list for Bulk Document Import"

---

# Tasks: Bulk Document Import

**Input**: Design documents from `/specs/017-bulk-document-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — one-time filesystem+network admin script, no pure-logic surface (research.md, matching Feature 014's precedent). Verified live via quickstart.md against the real production Supabase project.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative. New file only under `supabase/seed/`.

---

## Phase 1: Setup

*None — no new dependencies; `@supabase/supabase-js` is already a project dependency.*

---

## Phase 2: Foundational (Blocking Prerequisites)

*None — `document_categories` and `documents` already exist and are already correctly seeded (`0004_seed_lookups.sql`). No migration needed for this feature.*

---

## Phase 3: User Story 1 - See the real documents in each category (Priority: P1) 🎯 MVP

**Goal**: A single script walks the real folder tree and gets every organized document onto the live site, correctly attributed to its category (and sub-folder context where present).

**Independent Test**: quickstart.md Scenario 1.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create `supabase/seed/import-documents.ts`; define `CATEGORY_FOLDER_TO_SLUG`, the explicit 4-entry lookup table mapping the real top-level folder names to `document_categories.slug` values (research.md Decision 1)
- [X] T002 [P] [US1] In `import-documents.ts`, copy `sanitizeForStorageKey()` from `supabase/seed/import-weekly-photos.ts` verbatim (research.md Decision 4)
- [X] T003 [US1] In `import-documents.ts`, implement a file collector that, given a matched category root, lists its immediate entries: files become `{ filePath, note: null }`; directories are recursed (any depth) with every file inside tagged `{ filePath, note: <that immediate sub-folder's name> }` (research.md Decision 2)
- [X] T004 [US1] In `import-documents.ts`, implement document upload: for a given `(category_id, note, file_name)`, validate via `validateFile()`/`DOCUMENT_MIME_TYPES` from `lib/validation.ts` (research.md Decision 5), then upload to the `documents` Storage bucket at `` `${category_id}/${randomUUID()}-${sanitizeForStorageKey(file_name)}` `` (same convention as `app/actions/documents.ts`'s `uploadDoc`) and insert the `documents` row with the original `file_name` and resolved `note` (data-model.md; depends on T002, T003)
- [X] T005 [US1] In `import-documents.ts`, implement the main walk: for each of the 4 known category folders (skip + warn on any top-level folder not in `CATEGORY_FOLDER_TO_SLUG`, edge case) → collect files (T003) → look up that category's existing `(note, file_name)` pairs once → call T004 per file, accumulating a summary (documents uploaded / skipped-as-duplicate / skipped-as-invalid with reasons / categories skipped), printed at the end (FR-008) (depends on T001, T003, T004)
- [X] T006 [US1] Add a `main()` entry point mirroring `import-weekly-photos.ts`'s CLI usage (root path as `process.argv[2]`, reads `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` from the environment, errors clearly if either is missing) (depends on T005)
- [X] T007 [US1] Execute the real import once: `npx tsx supabase/seed/import-documents.ts "D:\Claude\Projects\DGWarehouse\DG picture"` against the live production Supabase project (quickstart.md Scenario 1)
  **Result**: 33/33 documents uploaded, 0 skipped duplicate, 0 invalid, on the first pass. Direct DB query confirms correct category attribution: structure 31 (12 with note "0. แปลนและแบบก่อสร้าง...", 1 with "1.1 งานพื้นอาคาร...", 7 with "1.2 งานผนังและกำแพงกันไฟ...", 7 with "1.3 งานหลังคา...", 4 with "1.4 งานประตู..."), electrical 1, environment 1, safety 0 (empty on disk, correctly produced nothing). Spot-checked 3 storage objects via `storage.list()` — all present with real non-zero byte sizes (127KB-208KB).
- [X] T008 [US1] Live-verify (quickstart.md Scenario 1 steps 3-4): open all 4 `/documents/[categorySlug]` pages in the app and confirm imported files appear with correct names, open/download correctly, and sub-folder-sourced documents show their note
  **Partially verified**: full sign-in verification is blocked on the account holder (password entry prohibited for this agent). What was verified: `tsc --noEmit`/`next lint` clean, `/documents/structure` compiles and returns 200 through the dev server (middleware correctly redirects to `/login` when unauthenticated — no server errors), and the underlying data (file names, notes, storage objects) directly confirmed correct via T007's DB query. Visual confirmation in the browser itself still needs the account holder.

**Checkpoint**: Every organized document from the real folder tree is live on the site, correctly attributed to its category, with sub-folder context preserved where present.

---

## Phase 4: User Story 2 - Re-run the import safely as more files get organized (Priority: P1)

**Goal**: Confirm the duplicate-detection logic built in Phase 3 (T004/T005) actually prevents re-imports on a second run and correctly picks up genuinely new files, including in a currently-empty category.

**Independent Test**: quickstart.md Scenario 2 (no-op re-run) + Scenario 3 (new files picked up, nothing else re-imported).

### Implementation for User Story 2

- [X] T009 [US2] Live-verify (quickstart.md Scenario 2): re-run the exact same command from T007 with no folder changes; confirm the summary reports 0 documents uploaded and every file skipped as already-imported
  **Verified**: immediate re-run against the unchanged real folder tree reported 0 documents uploaded, 33 skipped as already-imported, 0 invalid — no duplicates created.
- [ ] T010 [US2] Live-verify (quickstart.md Scenario 3): add one new file to an existing sub-folder and one new file directly in the currently-empty `หมวดที่ 4 ...` (safety) category folder with no sub-folder, re-run; confirm the summary reports exactly 2 new documents uploaded, one with a note and one without, and that all previously-imported documents remain present exactly once
  **Requires the account holder to add the two files to the real folder tree** (this agent must not fabricate files inside the account holder's real organized folders without asking first).

**Checkpoint**: The import is confirmed safe to run again as the account holder adds more documents over time, including into currently-empty categories.

---

## Phase 5: User Story 3 - Understand what didn't import (Priority: P2)

**Goal**: Confirm invalid files are reported by name and reason rather than silently dropped, while valid files in the same run still succeed.

**Independent Test**: quickstart.md Scenario 4.

### Implementation for User Story 3

- [X] T011 [US3] In `import-documents.ts`, confirm (by code review of T004/T005) that a `validateFile()` failure pushes `{ filePath, reason }` into the summary's `documentsSkippedInvalid` array and `continue`s the loop rather than throwing — this is inherent to T004/T005's structure, not separate new code (depends on T004, T005)
- [ ] T012 [US3] Live-verify (quickstart.md Scenario 4): with the account holder's permission, temporarily add one unsupported-type file (e.g. `.exe`) into a category sub-folder, re-run, confirm it's listed under skipped/invalid with a clear reason and every other new valid file still imports, then remove the test file
  **Requires the account holder's participation** — this agent must not add arbitrary files into the real organized folder tree without asking first.

**Checkpoint**: A failed file is always visible in the script's own output, never a silent loss.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T014 [P] Run `npm test`, confirm no regressions (no new tests added by this feature, consistent with Feature 014's precedent)
  **Result**: 51/51 pass, unchanged.
- [X] T015 Live-verify (quickstart.md "Expected final state"): confirm no changes to `photos`, `weeks`, `rooms`, `work_types`, or any user/auth table resulted from running this script (read-only spot-check against the same tables Feature 016's data-wipe verification already established a baseline for)
  **Verified**: direct read-only query after both import runs confirms `weeks: 0`, `photos: 0` — unchanged from the post-Feature-016 wipe baseline. `profiles` count changed independently of this script (2 vs. the earlier baseline of 1) — unrelated to this import, which never references the `profiles`/`weeks`/`photos`/`rooms`/`work_types` tables at all.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup/Foundational**: None — this feature has no blocking prerequisites of its own.
- **User Story 1 (Phase 3)**: T001-T006 (writing the script) have no DB dependency and can be built immediately; T007 is the first real run; T008 is live UI verification after that.
- **User Story 2 (Phase 4)**: Depends on Phase 3's T007 having already run once (needs an already-imported baseline to re-run against).
- **User Story 3 (Phase 5)**: T011 is code-review-level confirmation, independent of timing; T012 (live) is easiest done alongside Phase 4's file-addition round since both require the account holder to add test files.
- **Polish (Phase 6)**: Depends on US1-US3 being complete.

### Parallel Opportunities

- T001 and T002 (Phase 3) touch the same new file but are logically independent pieces (lookup table, sanitizer) — drafted together in one sitting given it's a single script file.
- T013 and T014 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1 — the script itself, then execute it for real).
2. **STOP and VALIDATE**: quickstart.md Scenario 1 confirms the core promise (documents are live, correctly attributed and noted).

### Incremental Delivery

1. US1 (build + real run + spot-check) → US2 (re-run + new-file verification) → US3 (invalid-file reporting verification) → Polish.
