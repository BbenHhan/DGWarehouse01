---

description: "Task list for Per-Photo Dates (Replace Week Date-Ranges)"

---

# Tasks: Per-Photo Dates (Replace Week Date-Ranges)

**Input**: Design documents from `/specs/018-per-photo-dates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: `lib/date-filter.ts` gets Vitest coverage (the highest-value new pure logic — 5 branches per research.md Decision 3), matching this project's established pattern. `lib/date-range.test.ts` and `lib/period-generator.test.ts` are deleted along with the modules they covered.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md), plus a dedicated phase for tearing down Feature 016 (cadence), which is independent of the rest.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, types, validation, and both storage backends' core photo read/write functions every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Create `supabase/migrations/0009_photo_dates.sql` per data-model.md's exact SQL: `photos` gains `room_id`/`work_type_id`/`date` (all not null after add), `week_id` + its FK dropped, `photos_room_work_type_idx`/`photos_date_idx` added; `week_cadences` and `weeks` tables dropped
- [X] T002 Apply the migration to the live Supabase project (manual, via the Supabase SQL Editor — DDL cannot go through the service-role REST client)
  **Done — confirmed live.** The account holder applied it. Re-queried the live schema directly: `photos.room_id`/`work_type_id`/`date` all queryable with no error, `photos.week_id` correctly gone (`42703 does not exist`), `weeks` and `week_cadences` tables both gone ("Could not find the table in the schema cache"). `rooms`/`work_types`/`document_categories`/`documents`/`profiles` all unaffected. `photos` currently has 0 rows (expected — nothing uploaded yet under the new model).
- [X] T003 [P] Update `lib/types.ts`: `Photo` gains `room_id`/`work_type_id`/`date`, loses `week_id`; `Week` type removed entirely
- [X] T004 [P] Update `lib/database.types.ts`: `photos` Row/Insert/Update/Relationships updated to match T001 exactly; `weeks` and `week_cadences` table type blocks removed
- [X] T005 [P] Update `lib/validation.ts`: `uploadPhotoSchema` takes `roomId`/`workTypeId`/`date` instead of `weekId`; `editPhotoSchema` gains optional `date`/`roomId`/`workTypeId`, drops `weekId`; `createWeekSchema` removed, `isoDate` kept and reused for the new `date` field
- [X] T006 [P] Create `lib/date-filter.ts`: `DateFilter` type + `photoMatchesDateFilter(date, filter)` exactly per data-model.md; add `lib/date-filter.test.ts` covering all 5 branches (unfiltered/both-empty, from-only, to-only, valid-both, invalid-reversed-both)
  **Result**: 5/5 tests pass.
- [X] T007 [P] Rename `lib/week-format.ts` → `lib/date-format.ts`: add `formatThaiDate(date)` (new primary export), rename `formatWeekDateRange` → `formatThaiDateRange` (kept for the filter bar's range display), remove `formatWeekDateRangeOrNull`
- [X] T008 [P] Delete `lib/date-range.ts` and `lib/date-range.test.ts` (only consumer, week-overlap checking, is gone)
- [X] T009 Update `lib/data.ts`: `getPhotos(roomId, workTypeId, filter?)` replaces `getPhotos(weekId)` (orders by `date` desc, applies `filter` server-side via `.gte()`/`.lte()` mirroring `lib/date-filter.ts`'s semantics); `getWeeks`/`getAllWeeks` removed; `getRoomPhotoCounts()` queries `photos.select("room_id")` directly (no join); `getSiteStats()`'s `totalWeeks` replaced with `totalDays` (distinct `date` count)
- [X] T010 [P] Update `lib/local/store.ts`: `localGetWeeks`/`localCreateWeek`/`localDeleteWeek`/`localGetAllWeeks` removed; `localGetPhotos(roomId, workTypeId, filter?)` replaces `localGetPhotos(weekId)`; `localSavePhotoFile(roomId, workTypeId, date, file)` replaces `localSavePhotoFile(weekId, file)`; `localUpdatePhoto` accepts `date`/`roomId`/`workTypeId` instead of `weekId`; `localGetRoomPhotoCounts`/`localGetSiteStats` query `photos` directly
- [X] T011 [P] Update `lib/local/store.test.ts` to match T010's new function signatures
  **Result**: rewritten around `localSavePhotoFile`/`localGetPhotos`/`localDeletePhoto`/`localUpdatePhoto` (date sort, date-range filter, room/work-type move) since `localCreateWeek`/`localDeleteWeek`/`localGetWeeks` no longer exist.
- [X] T012 [P] Update `lib/mock/source.ts`: `mockGetWeeks`/`mockGetAllWeeks` removed; `mockGetPhotos(roomId, workTypeId, filter?)` replaces `mockGetPhotos(weekId)`; photo index keyed by `room+work-type` instead of `room+work-type+week`; each photo's `date` best-effort-parsed from its source week-label text (research.md Decision 5), falling back to a documented placeholder on parse failure
- [X] T013 [P] Update `lib/upload-session.ts`: remove `WeekResolutionCache`/`weekResolutionKey`/`getOrResolveWeek` (no more async container-resolution step); keep `chunkFiles` unchanged
- [X] T014 [P] Update `lib/upload-session.test.ts`: remove tests for the deleted exports, keep `chunkFiles` tests

**Checkpoint**: `photos` has its new shape live (once T002 runs); both storage backends and `lib/data.ts` read/write the new shape consistently; pure date-filter logic is unit-tested.

---

## Phase 3: User Story 1 - Upload a photo without creating anything first (Priority: P1) 🎯 MVP

**Goal**: Every upload path (room/work-type page uploader, bulk `/upload` page) is a single step: pick a date (default today) + files, upload — no container to create or resolve first.

**Independent Test**: quickstart.md Scenarios 1, 2.

### Implementation for User Story 1

- [X] T015 [US1] Update `app/actions/photos.ts`: `uploadPhoto(roomId, workTypeId, date, files)` replaces `uploadPhoto(weekId, files)` (storage path becomes `` `${roomId}-${workTypeId}/${randomUUID()}-${fileName}` `` per research.md Decision 4); `editPhoto` accepts `date?`/`roomId?`/`workTypeId?`; `createWeek`, `deleteWeek`, `resolveWeekForDrop` removed entirely
- [X] T016 [US1] Update `components/PhotoUploader.tsx`: takes `roomId`/`workTypeId` instead of `weekId`; adds an inline `<Input type="date">` defaulting to today (local date, `todayIsoLocal()`) alongside the file picker; calls the new `uploadPhoto` signature
- [X] T017 [US1] Create `components/UploadDatePicker.tsx`: single date input (default today, editable) replacing `components/UploadDateRangePicker.tsx`'s two-field range picker
- [X] T018 [US1] Delete `components/UploadDateRangePicker.tsx`
- [X] T019 [US1] Update `components/BulkUploadWorkspace.tsx`: replace `<UploadDateRangePicker>` with `<UploadDatePicker>`; remove `weekCacheRef`/`resolveWeek` entirely; `assignFiles`/`assignFileKeepInTray` call `uploadPhoto(roomId, workTypeId, date, files)` directly (no async resolution round-trip); state becomes a single `date` instead of `startDate`/`endDate`
- [X] T020 [US1] Delete `components/AddWeekButton.tsx` and `components/DeleteWeekButton.tsx` (nothing left to create/delete)
- [X] T021 [US1] Delete `components/WeekPeriodPicker.tsx` (done as part of Phase 6 teardown — its only consumers, `AddWeekButton`/`UploadDateRangePicker`, were already gone)

**Checkpoint**: A photo can be uploaded from either entry point in one step, with the chosen (or default-today) date attached directly — verified via `tsc`/`lint`/dev-server compile; live behavior confirmed blocked only on T002 (Postgres correctly reports `photos.room_id` doesn't exist yet — the exact expected pre-migration error).

---

## Phase 4: User Story 2 - Browse a room/work-type's photos in order, or narrow to a date range (Priority: P1)

**Goal**: The room/work-type page shows every photo chronologically by default, with an optional date-range filter — no week tabs.

**Independent Test**: quickstart.md Scenarios 3, 5.

### Implementation for User Story 2

- [X] T022 [US2] Create `components/WorkTypePhotoNav.tsx`: the work-type tab strip `WorkTypeWeekNav.tsx` rendered, minus the week strip beneath it
- [X] T023 [US2] Create `components/PhotoDateFilter.tsx`: two `<Input type="date">` (from/to, independently clearable) + a "ล้างตัวกรอง" button shown only when at least one is set
  **Deviation from data-model.md's sketch**: implemented as a self-contained client component reading/writing `?from=&to=` via `useSearchParams`/`useRouter` directly, rather than a controlled `{ from, to, onChange }` prop contract — simpler and avoids prop drilling between the server page and this client component while achieving the same shareable/bookmarkable-URL goal.
- [X] T024 [US2] Delete `components/WorkTypeWeekNav.tsx`
- [X] T025 [US2] Update `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`: reads `searchParams.from`/`searchParams.to` instead of `?week=`; calls `getPhotos(roomId, workTypeId, { from, to })` directly (no per-week fetch loop); renders `WorkTypePhotoNav` + `PhotoDateFilter` + `PhotoUploader` + `PhotoGrid`; move options become every room × work-type pair instead of every week
- [X] T026 [US2] Update `components/PhotoGrid.tsx`: `weekMoveOptions` prop renamed to `moveOptions` (room/work-type pairs) — no behavior change to the grid itself
- [X] T027 [US2] Update `components/Header.tsx`: stats chip shows `totalDays` ("N วัน") instead of `totalWeeks` ("N สัปดาห์")

**Checkpoint**: Opening a room/work-type page shows all its photos chronologically; the date filter narrows/clears correctly — verified via `tsc`/`lint`/dev-server compile; live behavior blocked only on T002.

---

## Phase 5: User Story 3 - Fix a photo's date or move it after the fact (Priority: P2)

**Goal**: An editor can correct a photo's date or move it to a different room/work-type through the existing edit action.

**Independent Test**: quickstart.md Scenario 4.

### Implementation for User Story 3

- [X] T028 [US3] Update `components/EditModal.tsx`: photo kind gains a `<Input type="date">` bound to the item's `date`, included in the `editPhoto` call when changed; the "move to" `Select` for photos lists room/work-type pairs (composite `"roomId::workTypeId"` value, split back apart before calling `editPhoto`) instead of weeks

**Checkpoint**: Editing a photo's date or room/work-type through the existing pencil-icon modal works end-to-end (code-verified; live check blocked on T002 + account-holder sign-in).

---

## Phase 6: Feature 016 Teardown (Cadence removal — independent of US1-US3)

**Goal**: Remove every trace of the recurring-period/cadence system, which solved a problem (week date-range overlap) that no longer exists.

**Independent Test**: quickstart.md Scenario 6.

### Implementation

- [X] T029 [P] Delete `lib/period-generator.ts` and `lib/period-generator.test.ts`
- [X] T030 [P] Delete `app/actions/cadence.ts`
- [X] T031 [P] Delete `components/CadenceForm.tsx` and `components/CadenceSettingsClient.tsx`
- [X] T032 [P] Delete `app/(app)/admin/cadence/` (the whole route directory)
- [X] T033 [P] Update `components/AccountMenu.tsx`: remove the "รอบเวลาสัปดาห์" admin menu entry and its `CalendarClock` import
- [X] T034 Confirm `components/WeekPeriodPicker.tsx` deletion covers its only remaining reference — no dangling import
  **Verified**: repo-wide grep for `WeekPeriodPicker` after deletion returns zero hits.

**Checkpoint**: `/admin/cadence` no longer exists as a route; no code references `week_cadences`, cadence, or period-generator anywhere.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T035 [P] Run `npx tsc --noEmit` — must be clean
  **Result**: clean.
- [X] T036 [P] Run `npx next lint` — must be clean
  **Result**: clean.
- [X] T037 [P] Run `npm test` — `lib/date-filter.test.ts` passing, `lib/date-range.test.ts`/`lib/period-generator.test.ts` gone, `lib/upload-session.test.ts` and `lib/local/store.test.ts` passing against new shapes
  **Result**: 36/36 pass (6 test files) — down from 51 as expected (period-generator's 9, date-range's 7, and the 5 week-cache tests removed; date-filter's 5 and rewritten local-store tests added).
- [ ] T038 Live-verify quickstart.md Scenarios 1-7 end-to-end against the real Supabase project
  **Backend fully verified live; only the signed-in UI click-through remains.** Ran a one-off smoke-test script (using the same service-role client and exact same Storage/DB operations the Server Actions perform internally) directly against production, then deleted it — all 9 checks passed and cleaned up after itself with zero leftover data: fetch real room/work-type → upload a file to Storage under the new `${roomId}-${workTypeId}/...` path convention → insert a `photos` row with `room_id`/`work_type_id`/`date` → confirm it's found via an unfiltered browse query → confirm an enclosing date range includes it → confirm a non-enclosing range excludes it → edit its date → move it to a different work type → delete the storage object + row → confirm nothing was left behind. This proves the real backend path (Storage + Postgres, the same code every Server Action uses after its auth check passes) genuinely works end-to-end against the live project, not just in local unit tests. What remains unverified is purely the client-side interactive UI (actual button clicks, drag-and-drop, form state, visual rendering, mobile touch) — that still needs the account holder signed in, since password entry is prohibited for this agent.
- [X] T039 Grep the full repo for any remaining reference to `week_id`, `weekId`, `getWeeks`, `getAllWeeks`, `WeekPeriodPicker`, `week_cadences`, or `resolveWeekForDrop` — zero hits in `app/`, `components/`, `lib/` (the only surviving scripts that ever targeted the old schema, `import-weekly-photos.ts` and `seed-from-v7.ts`, were deleted rather than reworked, since they can never run successfully against the removed `weeks` table)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories — schema, types, validation, and both backends' core read/write functions are load-bearing for everything after.
- **User Story 1 (Phase 3)**: Depends on Foundational. Delivers the core value (upload with no pre-creation step).
- **User Story 2 (Phase 4)**: Depends on Foundational only — independent of US1, could ship in either order, but both are needed together for a usable page (US1 without US2 has nowhere to browse to; US2 without US1 has nothing new to browse).
- **User Story 3 (Phase 5)**: Depends on US2's `PhotoGrid`/`moveOptions` rework (T026).
- **Feature 016 Teardown (Phase 6)**: Fully independent of US1-US3 — pure deletion, can run any time after Foundational (T021 must land first for the one cross-reference in T034).
- **Polish (Phase 7)**: Depends on everything else being complete.

### Parallel Opportunities

- T003-T014 (Foundational) are mostly `[P]` — different files, can be done in parallel once T001/T002's shape is settled.
- T029-T033 (Phase 6) are fully parallel deletions.
- T035-T037 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational — schema + types + both backends).
2. Complete Phase 3 (US1 — upload with no pre-creation step).
3. **STOP and VALIDATE**: quickstart.md Scenarios 1-2 confirm the core promise (upload is one step, no date-range conflicts possible).

### Incremental Delivery

1. Foundational → US1 (upload) → US2 (browse/filter, needed for US1's uploads to be visible anywhere) → US3 (edit date/move, refinement) → Feature 016 teardown (independent, any time after Foundational) → Polish.

---

## Summary

**38 of 39 tasks complete.** T002 (migration) is now applied and confirmed live. Only T038 (full live end-to-end verification through the actual signed-in UI) remains, blocked solely on a sign-in this agent cannot perform. Every other task across all 4 phases (Foundational, US1, US2, US3) plus the full Feature 016 teardown is done and verified via `tsc --noEmit` (clean), `next lint` (clean), `npm test` (36/36 passing), and direct live-schema queries against the real Supabase project.

## Post-implementation refinement (live account-holder feedback)

After the above was implemented, the account holder gave direct feedback on the room/work-type page:

- **Removed `PhotoUploader` from the room/work-type page entirely** (and deleted `components/PhotoUploader.tsx`) — uploading now happens only through the bulk `/upload` page (Feature 015). The page previously showed two separate date inputs at once (the upload-date picker and the browse date-range filter), which read as confusing; removing the per-page uploader also matches the account holder's explicit instruction that upload should be a single dedicated flow. Constitution VIII's "every module needs a working add-file control" is still satisfied — the photos module's control now lives at `/upload`, already linked from `Sidebar`/`AccountMenu`, rather than being duplicated on every room/work-type page.
- **`PhotoGrid.tsx` redesigned as a horizontal date timeline**, replacing the original masonry grid: photos are grouped into consecutive same-date columns (a single pass over the already date-sorted list, no re-sort) and laid out in a horizontally-scrolling row, each column headed by its Thai-formatted date + file count. Leftmost = most recent, consistent with FR-003's "most recent first." `PhotoDateFilter`'s from/to inputs are unchanged and still narrow what's shown before it reaches the grid — the timeline is the default (unfiltered) browsing view the account holder asked for, not a replacement for the filter.

Re-verified after these changes: `tsc --noEmit` clean, `next lint` clean, `npm test` 36/36 passing, dev server compiles `/photos/[roomSlug]/[workTypeSlug]` with no runtime errors (redirects to `/login` as expected, unauthenticated).
