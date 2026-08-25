---

description: "Task list for Checklist Sub-Items"

---

# Tasks: Checklist Sub-Items

**Input**: Design documents from `/specs/029-checklist-subitems/`

**Tests**: No new Vitest coverage — see plan.md Testing.

**Organization**: Tasks grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies.*

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Create `supabase/migrations/0011_checklist_subitems.sql` per data-model.md's exact SQL (`parent_id` column + index)
- [ ] T002 Apply the migration to the live Supabase project (manual, Supabase SQL Editor)
  **Blocked on the account holder** — nothing in this feature works live until this runs (also still blocked on specs/028's own T002, if that hasn't run yet either).
- [X] T003 [P] Update `lib/types.ts`: `ChecklistItem` gains `parent_id: string | null` and `sub_items: ChecklistItem[]`
- [X] T004 [P] Update `lib/database.types.ts`: `checklist_items` Row/Insert/Update gain `parent_id`, Relationships gains the self-referencing FK entry
- [X] T005 [P] Update `lib/validation.ts`: `addChecklistItemSchema` gains optional `parentId: z.string().uuid().optional()`
- [X] T006 Update `lib/local/store.ts`: `LocalDb`'s checklist records already carry arbitrary fields (JSON) — add `parent_id: string | null` to new records, a `localGetSubItems`-style grouping helper, and update `localGetChecklistItems`/`localGetRoomChecklistItems` to nest `sub_items` per data-model.md's rules (depends on T003)
- [X] T007 Update `lib/data.ts`: `getChecklistItems()` returns only `parent_id === null` items with **all** sub-items nested (done or not); `getRoomChecklistItems(roomId)` keeps its existing top-level query and additionally fetches+filters each parent's not-done sub-items per research.md Decision 4 (depends on T003, T004, T006)

**Checkpoint**: Schema live (once T002 runs); types/validation/data-layer ready for Server Actions and UI.

---

## Phase 3: User Story 1 - Break a task into steps (Priority: P1) 🎯 MVP

**Goal**: Add a sub-item under an existing top-level item, with its own optional room tags.

**Independent Test**: spec.md User Story 1's Independent Test.

### Implementation for User Story 1

- [X] T008 [US1] In `app/actions/checklist.ts`, extend `addChecklistItem(text, roomIds, parentId?)` — validates via the extended `addChecklistItemSchema`, inserts with `parent_id` when provided (or calls the extended `localAddChecklistItem` for the local backend) (depends on T005, T006/T007)
- [X] T009 [US1] In `components/ChecklistList.tsx`, add a per-row "+ เพิ่ม sub" quick-add affordance (small inline form: text + room chip picker, same `RoomChipPicker` already used) that calls `addChecklistItem(text, roomIds, item.id)`, and render `item.sub_items` as nested rows beneath their parent

**Checkpoint**: A sub-item can be created under any top-level item from `/checklist`, with its own optional room tags.

---

## Phase 4: User Story 2 - Checking off every step finishes the task automatically (Priority: P1)

**Goal**: Parent/sub-item done-state stays consistent in both directions.

**Independent Test**: spec.md User Story 2's Independent Test.

### Implementation for User Story 2

- [X] T010 [US2] In `app/actions/checklist.ts`, extend `toggleChecklistItem(id, isDone)`: after writing the toggled row, if it has a `parent_id` re-read siblings and sync the parent's `is_done` (`true` iff every sibling done); if it has sub-items instead, write the same `is_done` to all of them — both backends (depends on T007)
- [X] T011 [US2] In `components/ChecklistList.tsx`, wire each nested sub-item row's checkbox to `toggleChecklistItem` (same optimistic-UI pattern already used for top-level rows), and make sure a parent's optimistic state also updates when its last sub-item is optimistically checked (client-side mirror of T010's server logic, so the UI doesn't wait for a revalidate to show the parent flip)

**Checkpoint**: Toggling a sub-item on `/checklist` keeps its parent in sync immediately, in both directions; toggling a parent cascades to its sub-items.

---

## Phase 5: User Story 3 - A room's checklist box shows the steps that matter there (Priority: P1)

**Goal**: `RoomChecklistBox` shows each parent's room-relevant sub-items, addable/toggleable in place.

**Independent Test**: spec.md User Story 3's Independent Test.

### Implementation for User Story 3

- [X] T012 [US3] In `components/RoomChecklistBox.tsx`, render each parent's `sub_items` (already server-filtered by `getRoomChecklistItems`, T007) as nested checkable rows, plus a per-parent "+ เพิ่ม sub" quick-add that calls `addChecklistItem(text, [], parentId)` (no room picker — inherits the parent's rooms, data-model.md's UI contract)
- [ ] T013 [US3] Live-verify: tag a sub-item to a different room than its parent's other room-tags and confirm room-box narrowing (spec User Story 3, Acceptance Scenario 2)
  **Blocked on the account holder** — requires T002 + sign-in.

**Checkpoint**: Every room/work-type page's checklist box shows that room's relevant sub-items nested under their parent, addable/toggleable in place.

---

## Phase 6: Editing & Deletion (FR-007)

- [X] T014 In `components/ChecklistList.tsx`, confirm the existing `EditChecklistDialog`/delete-confirm affordances work unmodified on a nested sub-item row (same `ChecklistItem` shape, no parent_id editing exposed — spec's Edge Cases) — adjust only if the dialog assumed a top-level-only context
  Confirmed: `ChecklistRow` passes `nested` only to suppress the "+ เพิ่ม sub" button and the sub-items block; `EditChecklistDialog` and the delete `AlertDialog` render identically for a nested row, no changes needed. The delete confirmation text is adjusted to warn about cascading sub-item loss only when deleting a top-level item that actually has sub-items.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T016 [P] Run `npx next lint` — no warnings or errors
- [X] T017 [P] Run `npm test` (no regressions expected) — 6 files, 36 tests, all passed
- [~] T018 Dev-server compile check of `/checklist` and `/photos/[roomSlug]/[workTypeSlug]`
  Same auth-wall caveat as specs/028 T025 — both routes redirect to `/login` before Next.js compiles them (DATA_SOURCE hardcoded to `"supabase"` in this environment). **Blocked on the account holder** (needs sign-in) same as T002/T013. T015's `tsc --noEmit` (0 errors) is the strongest check available without a session.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS everything else.
- **US1 (Phase 3)**: Depends on Foundational. Delivers the MVP (create sub-items).
- **US2 (Phase 4)**: Depends on Foundational + US1 existing (needs sub-items to toggle).
- **US3 (Phase 5)**: Depends on Foundational + US1/US2's Server Action (`addChecklistItem`/`toggleChecklistItem` unchanged signatures, reused as-is).
- **Editing & Deletion (Phase 6)**: Independent, can be done any time after US1.
- **Polish (Phase 7)**: Depends on everything else.

### Parallel Opportunities

- T003-T005 (Foundational) are `[P]` — different files.
- T015-T017 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational).
2. Complete Phase 3 (US1 — sub-items can be created and seen nested).
3. **STOP and VALIDATE**: spec.md User Story 1's Independent Test confirms the core capability exists.

### Incremental Delivery

1. Foundational → US1 (create) → US2 (auto-sync toggle) → US3 (room box) → Editing/Deletion (completeness) → Polish.
