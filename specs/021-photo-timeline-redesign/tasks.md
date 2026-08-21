---

description: "Task list for Photo Timeline Redesign"

---

# Tasks: Photo Timeline Redesign

**Input**: Design documents from `/specs/021-photo-timeline-redesign/`

**Status**: Retroactively documented — already implemented and verified.

## Phase 1: User Story 1 - Upload only in one place (Priority: P1)

- [X] T001 [US1] Remove `<PhotoUploader roomId={...} workTypeId={...} />` and its import from `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`
- [X] T002 [US1] Delete `components/PhotoUploader.tsx` (confirmed zero remaining references repo-wide before deleting)

## Phase 2: User Story 2 - Horizontal date timeline (Priority: P1)

- [X] T003 [US2] In `PhotoGrid.tsx`, implement `groupByDate(photos)`: single pass over the already date-sorted array, collapsing consecutive same-`date` photos into `{ date, photos }` groups
- [X] T004 [US2] Extract `PhotoTile` (icon/media, edit modal, delete dialog — previously inline per-photo markup) into its own component, parameterized by `onOpen` so lightbox indexing stays correct across the new grouped layout
- [X] T005 [US2] Replace the `columns-2 ... sm:columns-3 ...` masonry wrapper with a `flex gap-4 overflow-x-auto` row of fixed-width (`w-[220px]`) date columns, each headed by `formatThaiDate(group.date)` + file count
- [X] T006 [US2] Wire a running `columnStartIndex` counter across columns so `Lightbox`'s `initialIndex` still points at the correct photo in the flat `optimisticPhotos` array regardless of which column it's opened from

## Phase 3: Polish

- [X] T007 [P] `npx tsc --noEmit` — clean
- [X] T008 [P] `npx next lint` — clean
- [X] T009 [P] `npm test` — 36/36 passing, unaffected
- [X] T010 Dev-server compile check of `/photos/[roomSlug]/[workTypeSlug]` — no server errors

## Summary

10/10 tasks complete. Full authenticated visual/interaction verification remains
account-holder-only, same standing limitation as every feature this session.
