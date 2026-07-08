---

description: "Task list for Delete Week"

---

# Tasks: Delete Week

**Input**: Design documents from `/specs/003-delete-week/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions-delta.md, quickstart.md

**Tests**: Not included — project has no automated test runner configured; verification is via `tsc --noEmit`, `next lint`, and the live scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

No new setup required — reuses the existing shadcn/ui `AlertDialog`/`Button`
primitives already used by `PhotoGrid`/`DocList`'s delete confirmation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the delete-with-cascade capability at the data layer and Server
Action boundary that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Add `localDeleteWeek(weekId: string): Promise<Week | null>` to `lib/local/store.ts`: find and remove the week from `db.weeks`; for every `Photo` in `db.photos` whose `week_id` matches, remove it from `db.photos` and delete its underlying file via the existing `deleteUploadedFile` helper (same per-file deletion `localDeletePhoto` already uses); persist once; return the removed week or `null` if not found
- [X] T002 Add `deleteWeek(weekId: string): Promise<ActionResult<{ weekId: string }>>` Server Action to `app/actions/photos.ts`: "local" branch calls `localDeleteWeek`, returning `"ไม่พบสัปดาห์นี้"` on `null`; Supabase branch (not live) fetches the week's photos, removes their Storage objects via `supabase.storage.from("photos").remove(...)`, then deletes the `weeks` row (FK cascade removes the photo rows); both branches call the existing `revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page")` on success

**Checkpoint**: `tsc --noEmit` passes; `deleteWeek` can be invoked directly and correctly removes a week's photos (rows + files) and the week itself.

---

## Phase 3: User Story 1 - Delete an empty week (Priority: P1) 🎯 MVP

**Goal**: A visible delete control on each week card, gated by a confirmation
dialog, that removes an empty week.

**Independent Test**: Create a week with no files, delete it via the new control + confirm, confirm it disappears and the week count decreases (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T003 [US1] Create `components/DeleteWeekButton.tsx` (new client component): trash-icon `Button` (`size="icon-sm"`, `variant="destructive"`) wrapped in the existing shadcn/ui `AlertDialog` pattern (mirrors `PhotoGrid`'s per-photo delete `AlertDialog`), accepting `weekId` and `photoCount` props; on confirm, calls `deleteWeek(weekId)` inside `useTransition`, surfacing errors via `toast.error` (matches `AddWeekButton`'s existing pattern)
- [X] T004 [US1] For `photoCount === 0`, render the same generic "การลบนี้ไม่สามารถย้อนกลับได้" wording already used by `PhotoGrid`/`DocList`'s delete confirmations
- [X] T005 [US1] Restructure the week card markup in `components/WorkTypeWeekNav.tsx`: wrap the existing full-card `<Link>` and the new `DeleteWeekButton` in a `relative` container, positioning `DeleteWeekButton` absolutely on top with `onClick={(e) => e.stopPropagation()}` on its wrapper (mirrors `PhotoGrid`'s tile structure), gated by `!USE_MOCK_DATA` (needs a `showActions` prop passed down from the page, since `WorkTypeWeekNav` doesn't currently import `USE_MOCK_DATA` itself)

**Checkpoint**: An empty week can be deleted end-to-end via the new control with a confirmation step.

---

## Phase 4: User Story 2 - Delete a week that has files in it (Priority: P1)

**Goal**: The confirmation dialog makes the file-cascade consequence explicit, and
deletion actually removes every file that belonged to the week (already implemented
in Foundational — this phase adds the UI copy and verifies the cascade live).

**Independent Test**: Create a week, upload a file, delete it, confirm both the week and its file are gone with no orphan left behind (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T006 [US2] In `components/DeleteWeekButton.tsx`, branch the `AlertDialogDescription` on `photoCount > 0`: show an explicit Thai warning stating the file count that will also be deleted (e.g. `` `สัปดาห์นี้มี ${photoCount} ไฟล์ — ไฟล์ทั้งหมดจะถูกลบไปด้วย` ``) instead of the generic wording from T004
- [X] T007 [US2] Pass `photoCount` into `DeleteWeekButton` from `components/WorkTypeWeekNav.tsx`'s existing per-week `photoCount` value (already computed in the page and passed into `WorkTypeWeekNav`'s `weeks` prop — no new data fetch needed)

**Checkpoint**: Deleting a week with files shows an explicit warning and leaves no orphaned photo rows or files (verified against `.local-data/db.json` and `.local-data/files/` directly).

---

## Phase 5: User Story 3 - Deleting the currently-viewed week doesn't break the page (Priority: P2)

**Goal**: Confirm the existing default-selection fallback in the room/work-type
page correctly takes over when the viewed week is deleted — no new logic expected.

**Independent Test**: Delete the currently-selected week; confirm the page shows another week or the empty state, never a broken screen (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T008 [US3] Verify (live, via Claude Preview) that `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`'s existing `weeksWithPhotos.find((entry) => entry.week.id === weekIdParam) ?? weeksWithPhotos[weeksWithPhotos.length - 1]` fallback correctly resolves to another remaining week (or `undefined`, triggering the existing empty-state render) once the previously-selected `weekIdParam` no longer matches any week — no code change expected; if a gap is found, fix it in this same file

**Checkpoint**: Deleting the viewed week never leaves a broken page.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
- [X] T010 [P] Confirm the delete-week control does not render at all when `DATA_SOURCE = "mock"` (quickstart.md Scenario 4, second part)
- [X] T011 Run all 5 scenarios in `specs/003-delete-week/quickstart.md` against the live dev server (via the Claude Preview browser tool), including the not-found check (Scenario 4, first part) and the freed-up-date-range check (Scenario 5, confirms FR-008 from 002-week-date-range-ui still holds once a week is deleted)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None.
- **Foundational (Phase 2)**: No dependencies — BLOCKS all user stories (T001–T002 add the delete+cascade capability every story's UI calls into).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational and on US1's `DeleteWeekButton` existing (T006/T007 extend the component T003 created) — not independently buildable before US1's component exists, but its *cascade behavior* (T001) was already verifiable in Foundational.
- **User Story 3 (Phase 5)**: Depends on Foundational only — the reselection fallback already exists in the page from 002-week-date-range-ui; this phase is a verification checkpoint against the new `deleteWeek` action, not new logic.
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T009 and T010 (Phase 6) touch different concerns (typecheck/lint vs. a live UI check) and can run in parallel.
- US3 (Phase 5) can be verified in parallel with US2 (Phase 4) once US1's button exists, since T008 only touches the page file while T006/T007 only touch `DeleteWeekButton.tsx`/`WorkTypeWeekNav.tsx`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (nothing to do) + Phase 2 (Foundational — T001–T002).
2. Complete Phase 3 (US1 — delete an empty week).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently.
4. This alone already satisfies "must have a delete-week button" for the common case.

### Incremental Delivery

1. Foundational → US1 (empty-week delete, MVP) → US2 (file-count-aware warning +
   cascade verification) → US3 (reselection verification) → Polish.
2. Each story adds value without breaking the previous ones.
