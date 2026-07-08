---

description: "Task list for Week Date-Range Input & Card-Style Week UI"

---

# Tasks: Week Date-Range Input & Card-Style Week UI

**Input**: Design documents from `/specs/002-week-date-range-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions-delta.md, quickstart.md

**Tests**: Not included — project has no automated test runner configured (per plan.md Technical Context); verification is via `tsc --noEmit`, `next lint`, and the live scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js project — all paths are repo-root-relative, per plan.md's Project Structure.

---

## Phase 1: Setup

No new setup required — this feature reuses the existing Next.js/TypeScript/Tailwind
project, existing shadcn/ui `Dialog`/`Input`/`Button` primitives, and existing
`DATA_SOURCE="local"` backend. Nothing to initialize.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Change the `Week` data shape and the `createWeek` contract that every
user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Add optional `start_date: string | null` and `end_date: string | null` fields to the `Week` type in `lib/types.ts` (per data-model.md — optional so `lib/mock/source.ts`'s existing week objects remain valid without modification)
- [X] T002 [P] Add `createWeekSchema` to `lib/validation.ts`: `roomId`/`workTypeId` as `foreignKeyId`, `startDate`/`endDate` as required ISO date strings, with a `.refine()` rejecting `endDate < startDate` (Thai error message per contracts/server-actions-delta.md)
- [X] T003 [P] Add a small date-range formatting helper (e.g. `lib/week-format.ts`): given `start_date`/`end_date` (ISO strings), returns a Thai Buddhist-year display string (e.g. "8 มิ.ย. 2569 – 15 มิ.ย. 2569"); given `null`/`null`, returns `null` so callers know to fall back to the legacy `label` parsing
- [X] T004 Update `localCreateWeek` in `lib/local/store.ts` to accept `(roomId, workTypeId, startDate, endDate)`, store them on the created `Week`, and auto-derive `label` from the date range via the T003 helper (internal `week_number` bookkeeping unchanged, not exposed)
- [X] T005 Update `localGetWeeks`/`localGetAllWeeks` in `lib/local/store.ts` to sort by `start_date` ascending when present (falls back to existing `week_number` sort — unaffected since mock backend weeks never pass through this file)
- [X] T006 Update `createWeek` Server Action in `app/actions/photos.ts`: new signature `(roomId, workTypeId, startDate, endDate)`, validates via T002's `createWeekSchema`, returns the Thai error messages from contracts/server-actions-delta.md on failure

**Checkpoint**: `tsc --noEmit` passes; `createWeek` can be called with dates and stores/sorts correctly (verifiable via a direct call or the still-unbuilt UI in US1).

---

## Phase 3: User Story 1 - Create a week by date range instead of order number (Priority: P1) 🎯 MVP

**Goal**: Replace the single-click "add week" button with a small form requesting a
start date and end date, with no order/number field anywhere.

**Independent Test**: Click "add week", confirm no order-number field exists, submit
valid dates, confirm a new week appears; submit invalid/missing dates, confirm
rejection with a clear error (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T007 [US1] Rewrite `components/AddWeekButton.tsx` to open a shadcn/ui `Dialog` (matching `EditModal.tsx`'s existing dialog pattern) containing two `<input type="date">` fields (start date, end date) instead of triggering `createWeek` directly on click
- [X] T008 [US1] Wire the dialog's submit handler to call `createWeek(roomId, workTypeId, startDate, endDate)` inside the existing `useTransition`/`toast` pattern already used by `AddWeekButton`, surfacing the Server Action's Thai error messages (missing dates / end-before-start) via `toast.error`
- [X] T009 [US1] Disable the dialog's submit button until both date fields are filled, as an immediate client-side affordance (server-side validation from T002/T006 remains the source of truth)

**Checkpoint**: A week can be created end-to-end by entering a date range only — no order-number field exists anywhere in the flow.

---

## Phase 4: User Story 2 - Weeks always appear in date order automatically (Priority: P1)

**Goal**: Confirm and finish the automatic chronological ordering so weeks display
correctly regardless of creation order.

**Independent Test**: Create a later-dated week, then an earlier-dated week; confirm
the timeline shows them in date order, not creation order (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T010 [US2] Verify (and adjust if needed) that `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`'s week-fetching (`getWeeks`, `getAllWeeks`) renders the already-sorted order from T005 without re-sorting or re-deriving order client-side
- [X] T011 [US2] Update the default-selected-week logic on the same page (`weeksWithPhotos[weeksWithPhotos.length - 1]` fallback) to confirm it still resolves to the most recently-dated week now that sort order is date-driven (no code change expected if T005 is correct — this task is the explicit verification/adjustment point)

**Checkpoint**: Weeks always display in chronological order regardless of the order they were created in.

---

## Phase 5: User Story 3 - Week timeline shows info cards instead of small circles (Priority: P2)

**Goal**: Replace the circular "W{N}" dot timeline with rectangular info cards
showing the date range, has-files signal, and selected state.

**Independent Test**: Open a timeline with weeks, confirm each renders as a
rectangular card with its date range as primary text, confirm has-files and
selected states are visually distinguishable (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T012 [US3] Rewrite the week-rendering portion of `components/WorkTypeWeekNav.tsx`: replace the circular `<span className="... rounded-full ...">W{number}</span>` dot with a rectangular card (`rounded-xl` or similar, matching the work-type selector chips' visual family per Constitution VI), using the T003 formatting helper for `start_date`/`end_date` when present
- [X] T013 [US3] In the same rewrite, fall back to the existing `splitWeekLabel(week.label)` parsing when `start_date`/`end_date` are `null` (mock backend weeks — per research.md Decision 3), so mock mode's display is unaffected
- [X] T014 [US3] Preserve the existing has-files (gold/highlight) and selected/active visual states on the new card shape, re-using the same color tokens already used by the circular dots (no new design tokens)

**Checkpoint**: All three user stories are independently functional; the timeline is fully card-based for local/Supabase weeks and unchanged for mock weeks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Keep documentation/schema in sync and confirm no regressions across
already-working functionality (FR-008).

- [X] T015 [P] Update the `weekMoveOptions` label construction in `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx` (used by `EditModal`'s "ย้ายไปสัปดาห์" picker) to show the new date-range format via the T003 helper, falling back to `week.label` when dates are absent
- [X] T016 [P] Update the `weeks` table definition in `supabase/migrations/0001_schema.sql`: add nullable `start_date DATE`, `end_date DATE` columns, so the (not-yet-live) Supabase backend's schema matches the new contract
- [X] T017 [P] Update the `Week` entity table in `specs/001-progress-tracker-migration/data-model.md` to reference the amendment in `specs/002-week-date-range-ui/data-model.md` (avoid duplicating the full field table in two places)
- [X] T018 Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
- [X] T019 Run all 5 scenarios in `specs/002-week-date-range-ui/quickstart.md` against the live dev server (via the Claude Preview browser tool), including Scenario 4 (existing upload/edit/delete regression check) and Scenario 5 (mock-backend unaffected check)
- [X] T020 [post-clarify] Reject overlapping date ranges (FR-009 flipped from "allow" to "must reject" via `/speckit-clarify` 2026-07-07): add an overlap check in `createWeek` (`app/actions/photos.ts`) using `getWeeks` to fetch existing weeks in the same room/work-type before creating, returning a clear Thai error on overlap; verified live (creating a week 06-12–06-20 while 06-08–06-15 exists in the same work-type is rejected, no second week written to `.local-data/db.json`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — nothing to do.
- **Foundational (Phase 2)**: No dependencies — BLOCKS all user stories (T001–T006 change the shared `Week` type and `createWeek` contract every story builds on).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational (T005's sort logic). Independent of US1's UI and US3's card UI — testable via any means of creating weeks (even directly through the Server Action) once T001–T006 exist, though in practice it's verified through the US1 UI once built.
- **User Story 3 (Phase 5)**: Depends on Foundational (T003's formatting helper, T001's type fields). Independent of US1/US2's completion, but practically verified after US1 exists (need a way to create a week with dates to see its card).
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T002 and T003 (Phase 2) touch different new files and can run in parallel.
- T015, T016, T017 (Phase 6) touch three unrelated files and can run in parallel.
- US2 (Phase 4) and US3 (Phase 5) can be implemented in parallel once Phase 2 is done, since T010/T011 (data-fetching verification) and T012–T014 (rendering) touch different files (`page.tsx` vs `WorkTypeWeekNav.tsx`).

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T001 (Week type) completes, these two can run together:
Task: "Add createWeekSchema to lib/validation.ts"
Task: "Add date-range formatting helper to lib/week-format.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (nothing to do) + Phase 2 (Foundational — T001–T006).
2. Complete Phase 3 (US1 — the create-by-date-range form).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently.
4. This alone already satisfies the user's core ask ("no order field, enter dates").

### Incremental Delivery

1. Foundational → US1 (MVP: can create weeks by date, though they'll still render
   as circles until US3 lands) → US2 (confirms correct chronological order) → US3
   (card UI) → Polish.
2. Each story adds value without breaking the previous ones — US1 alone is usable
   even before US3's visual change lands.
