# Implementation Plan: Per-Photo Dates (Replace Week Date-Ranges)

**Branch**: `main` (no feature branch — established repo convention) | **Date**: 2026-08-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-per-photo-dates/spec.md`

## Summary

Remove the `weeks` table and every "create a date-range container, then upload into it" flow. `photos` gains `room_id`, `work_type_id`, and `date` columns directly (no longer inherited via a parent week row). Uploading (both the room/work-type page's uploader and the bulk `/upload` page) becomes a single step: pick files + one date (default today) + room/work-type, upload. Browsing a room/work-type replaces the week-tab timeline with a single reverse-chronological photo list plus an optional start/end date filter. Feature 016's cadence/recurring-period system (`week_cadences` table, `lib/period-generator.ts`, `app/actions/cadence.ts`, `/admin/cadence`) is removed outright — it only ever existed to make picking a week date **range** easier and conflict-free, and both the range and the conflict go away with this change.

No production data migration is needed: `weeks`/`photos` are both empty (confirmed live-queried this session, following an earlier full data reset), so this ships as a clean schema replacement.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 App Router — same stack, no new dependencies.

**Primary Dependencies**: No new packages. Reuses `lib/validation.ts` (extended with a `date` field), `lib/database.types.ts` (hand-written, updated to match the new schema), existing shadcn/ui primitives (`Input type="date"`, `Button`).

**Storage**: Supabase Postgres (`photos` table gains columns, `weeks`/`week_cadences` tables dropped) + Supabase Storage (bucket/path convention for photo files is unchanged — still `${roomWorkTypeContext}/${randomUUID()}-${fileName}`, just keyed by the photo's own `room_id`/`work_type_id` instead of a week's).

**Testing**: Vitest. `lib/date-range.test.ts` (rangesOverlap) and `lib/period-generator.test.ts` (9 tests) are deleted along with the modules they cover. New coverage: a date-range-filter predicate (pure function, easy to unit test) replacing the deleted overlap logic as this feature's "highest-value pure logic to test" per this project's established testing pattern.

**Target Platform**: Same Next.js 15 app (Vercel), same Supabase project.

**Project Type**: Single Next.js project — a schema/behavior change plus UI rework, not a new project.

**Performance Goals**: N/A — no new performance-sensitive path; a plain indexed date filter on an already-small photos table.

**Constraints**: MUST NOT reintroduce any date-range-overlap validation (spec FR-008 — that concept is gone). MUST NOT touch the documents module (FR-009). MUST keep the "local" backend (`lib/local/store.ts`) and the read-only "mock" backend (`lib/mock/source.ts`) on the same `Photo` shape so `DATA_SOURCE` stays a drop-in switch (Constitution III) — mock mode's source data has no real per-photo dates (it's a frozen v7 folder snapshot), so its photos get a best-effort date derived from its existing week-label text; this is a display-only concession specific to that already-legacy, read-only mode, documented in research.md.

**Scale/Scope**: Touches ~20 files (Server Actions, 6 components deleted, 3 components reworked, `lib/data.ts`, both storage backends, `lib/database.types.ts`, one new migration dropping/adding columns, one migration dropping `week_cadences`/`weeks`, deletion of Feature 016's admin screen and its dedicated library code).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: N/A — no router change; `/admin/cadence` route directory is deleted, no new route pattern introduced.
- **II. Server Actions & Supabase Client Boundary**: ✅ `uploadPhoto`/`editPhoto`/`deletePhoto` remain Server Actions using `createServiceClient()`; no new client-side direct writes.
- **III. Storage-Agnostic File Persistence**: ✅ The storage abstraction (`lib/storage.ts`) itself is untouched — only the DB-side key used to build a photo's storage path changes (from `weekId` to a `room_id`/`work_type_id` pairing), a Server Action-level change, not a storage-layer one. Both "local" and "supabase" backends keep implementing the same `Photo`-shaped contract.
- **IV. Thai-First, Mobile-First UI**: ✅ New date filter UI and single-date upload picker follow the same Thai-label, mobile-first conventions as the components they replace (`WeekPeriodPicker`, `UploadDateRangePicker` already were).
- **V. Resilient Async UX**: ✅ Upload/delete/edit keep their existing loading/error states and optimistic-delete pattern (`PhotoGrid`'s `useOptimistic`) — unaffected by this change.
- **VI. Tailwind-Only Styling**: ✅ No new styling approach.
- **VII. Multi-User Auth with RBAC**: N/A — role checks (`requireRole("editor")` on mutations) are unchanged; only the data being mutated changes shape.
- **VIII. Universal File Attachments**: ✅ Photo upload keeps using `lib/validation.ts`'s `PHOTO_MIME_TYPES`/`validateFile`/`MAX_FILE_SIZE_BYTES` unchanged — only the non-file fields accompanying an upload change (date instead of a week id).

No violations — Complexity Tracking is not needed. This is a large *removal* (weeks, cadence) plus a moderate rework (upload, browse), not new architectural surface.

## Project Structure

### Documentation (this feature)

```text
specs/018-per-photo-dates/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by /speckit-plan)
```

No `contracts/` directory — the interface surface here is Server Actions and Next.js pages internal to this one app, already documented via `data-model.md`'s Server Action signatures; no external API/CLI contract exists.

### Source Code (repository root)

```text
supabase/migrations/
├── 0009_photo_dates.sql       # NEW — photos gains room_id/work_type_id/date; weeks + week_cadences dropped

lib/
├── database.types.ts          # MODIFIED — photos Row/Insert/Update gets room_id/work_type_id/date, loses week_id; weeks + week_cadences table types removed
├── types.ts                   # MODIFIED — Photo gets room_id/work_type_id/date, loses week_id; Week type removed
├── validation.ts              # MODIFIED — uploadPhotoSchema/editPhotoSchema take roomId+workTypeId+date instead of weekId; createWeekSchema removed
├── data.ts                    # MODIFIED — getWeeks/getAllWeeks removed; getPhotos takes (roomId, workTypeId, dateRange?) instead of (weekId); getRoomPhotoCounts/getSiteStats query photos directly instead of joining weeks
├── date-format.ts             # RENAMED from lib/week-format.ts — formatThaiDate(date) replaces formatWeekDateRange as the primary export; formatThaiDateRange kept for the filter bar's "showing X–Y" display
├── date-range.ts               # DELETED — rangesOverlap had no purpose beyond week-overlap checking
├── date-range.test.ts          # DELETED — covered the deleted rangesOverlap
├── date-filter.ts              # NEW — pure predicate: does a photo's date fall within an optional [start, end] range (spec Edge Case: invalid/reversed range = no filter)
├── date-filter.test.ts         # NEW — unit coverage for date-filter.ts (this feature's "highest-value pure logic to test")
├── period-generator.ts         # DELETED (Feature 016 removed)
├── period-generator.test.ts    # DELETED
├── room-groups.ts              # UNCHANGED
├── upload-session.ts           # MODIFIED — weekResolutionKey/getOrResolveWeek/WeekResolutionCache removed (no more async "resolve a container" step); chunkFiles kept as-is
└── upload-session.test.ts      # MODIFIED — drop the removed exports' tests, keep chunkFiles tests

app/actions/
├── photos.ts                   # MODIFIED — uploadPhoto(roomId, workTypeId, date, files) instead of uploadPhoto(weekId, files); createWeek/deleteWeek/resolveWeekForDrop removed; editPhoto accepts a date field
├── documents.ts                # UNCHANGED
└── cadence.ts                  # DELETED (Feature 016 removed)

app/(app)/
├── photos/[roomSlug]/[workTypeSlug]/page.tsx   # MODIFIED — reads searchParams.from/to instead of ?week=, fetches all-or-filtered photos directly, no per-week fetch loop
└── admin/cadence/                               # DELETED (route + page.tsx)

components/
├── AddWeekButton.tsx           # DELETED
├── DeleteWeekButton.tsx        # DELETED
├── WorkTypeWeekNav.tsx         # DELETED, replaced by WorkTypePhotoNav.tsx (work-type tabs only, no week strip) + PhotoDateFilter.tsx (new start/end filter bar)
├── WorkTypePhotoNav.tsx        # NEW — the work-type tab strip WorkTypeWeekNav used to also contain, minus the week strip
├── PhotoDateFilter.tsx         # NEW — start/end date inputs + count + clear button, mirrors DocList/other filter-bar conventions
├── WeekPeriodPicker.tsx        # DELETED (Feature 016 removed)
├── CadenceForm.tsx             # DELETED (Feature 016 removed)
├── CadenceSettingsClient.tsx   # DELETED (Feature 016 removed)
├── PhotoUploader.tsx           # MODIFIED — takes (roomId, workTypeId) instead of (weekId); adds an inline date input (default today) alongside the existing file picker
├── PhotoGrid.tsx                # MODIFIED — moveOptions become room/work-type pairs instead of weeks; nothing else changes
├── EditModal.tsx                # MODIFIED — photo kind gets a date input; "move to" select for photos lists room/work-type pairs instead of weeks
├── UploadDateRangePicker.tsx    # DELETED, replaced by UploadDatePicker.tsx
├── UploadDatePicker.tsx         # NEW — single date input (default today) for the bulk /upload page, replacing the two-field range picker
├── BulkUploadWorkspace.tsx      # MODIFIED — drops resolveWeek/weekCacheRef entirely; assignFiles/assignFileKeepInTray call uploadPhoto(roomId, workTypeId, date, files) directly, no async resolution round-trip
├── AccountMenu.tsx              # MODIFIED — remove the "รอบเวลาสัปดาห์" (cadence) menu entry
└── (Sidebar.tsx, SidebarSwitcher.tsx, RoomTabBar.tsx, WorkTypeBinGrid.tsx, UnsortedFileTray.tsx, MobileSwipeCard.tsx, RoomTabBar.tsx)  # UNCHANGED — room/work-type structure and the bulk-upload bin-sorting UI are untouched

lib/local/store.ts              # MODIFIED — localGetWeeks/localCreateWeek/localDeleteWeek/localGetAllWeeks removed; localGetPhotos takes (roomId, workTypeId, dateRange?); localSavePhotoFile/localUpdatePhoto take room/workType/date instead of weekId; localGetRoomPhotoCounts queries photos directly
lib/local/store.test.ts         # MODIFIED — same shift in test setup

lib/mock/source.ts              # MODIFIED — mockGetWeeks/mockGetAllWeeks removed; mockGetPhotos takes (roomId, workTypeId, dateRange?); each mock photo gets a best-effort `date` parsed from its legacy week-label text (documented fallback, see research.md); Week-index building collapses into a Photo-index keyed by room+work-type
```

**Structure Decision**: In-place modification of the existing single Next.js project — no new top-level directories. The bulk of the diff is deletions (weeks UI/actions, Feature 016 in full) plus targeted reshaping of the photo upload/browse/edit path across both storage backends, matching Constitution III's requirement that all three `DATA_SOURCE` modes keep the same contract.

## Complexity Tracking

*No violations — this section is intentionally empty.*
