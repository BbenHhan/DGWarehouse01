---

description: "Task list for Room Checklist"

---

# Tasks: Room Checklist

**Input**: Design documents from `/specs/028-room-checklist/`

**Tests**: No new Vitest coverage — CRUD/UI wiring, not pure logic (see plan.md Testing).

**Organization**: Tasks grouped by user story (US1–US4 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies.*

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Create `supabase/migrations/0010_checklist.sql` per data-model.md's exact SQL (`checklist_items`, `checklist_item_rooms`, index, RLS policies)
- [ ] T002 Apply the migration to the live Supabase project (manual, Supabase SQL Editor)
  **Blocked on the account holder** — nothing in this feature works live until this runs.
- [X] T003 [P] Update `lib/types.ts`: add `ChecklistItem` type
- [X] T004 [P] Update `lib/database.types.ts`: add `checklist_items`/`checklist_item_rooms` table type blocks
- [X] T005 [P] Update `lib/validation.ts`: `addChecklistItemSchema`, `editChecklistItemSchema`, `toggleChecklistItemSchema`, `deleteChecklistItemSchema`
- [X] T006 Update `lib/data.ts`: add `getChecklistItems()` and `getRoomChecklistItems(roomId)`, branching by `DATA_SOURCE` (depends on T003, T004)
- [X] T007 [P] Update `lib/local/store.ts`: add `checklistItems: ChecklistItem[]` to `LocalDb`, plus `localGetChecklistItems`, `localGetRoomChecklistItems`, `localAddChecklistItem`, `localToggleChecklistItem`, `localEditChecklistItem`, `localDeleteChecklistItem` (room_ids embedded directly on the record, no junction file)
- [X] T008 [P] Update `lib/mock/source.ts`: add `mockGetChecklistItems`/`mockGetRoomChecklistItems`, both returning `[]`

**Checkpoint**: Schema live (once T002 runs); types/validation/data-layer ready for Server Actions and UI.

---

## Phase 3: User Story 1 - Add a task on the spot (Priority: P1) 🎯 MVP

**Goal**: Free-text item creation, with optional multi-room tagging, from the sitewide page.

**Independent Test**: quickstart.md Scenario 1 (add portion).

### Implementation for User Story 1

- [X] T009 [US1] Create `app/actions/checklist.ts`: `addChecklistItem(text, roomIds)` — `requireRole("editor")`, validates via `addChecklistItemSchema`, inserts the `checklist_items` row then the `checklist_item_rooms` rows (or calls `localAddChecklistItem` for the local backend) (depends on T005, T006/T007)
- [X] T010 [US1] Create `app/(app)/checklist/page.tsx`: server component, fetches `getChecklistItems()` + `getRooms()` + current user role, renders `ChecklistList`
- [X] T011 [US1] Create `components/ChecklistList.tsx`: add-form (text input + room multi-select checkboxes), calls `addChecklistItem`, shows the new item in the list on success
- [X] T012 [US1] Update `components/Sidebar.tsx`: add a "เช็คลิสต์" nav link (Overview section, alongside "รายการเอกสาร")
- [X] T013 [US1] Update `components/SidebarSwitcher.tsx`: recognize `/checklist` for the mobile current-page label/emoji

**Checkpoint**: An item can be created, with or without room tags, from `/checklist`.

---

## Phase 4: User Story 2 - Check items off (Priority: P1)

**Goal**: Reversible done/not-done toggle, persisted, reflected everywhere the item appears.

**Independent Test**: quickstart.md Scenario 1 (toggle portion).

### Implementation for User Story 2

- [X] T014 [US2] In `app/actions/checklist.ts`, add `toggleChecklistItem(id, isDone)` — `requireRole("editor")`, updates `is_done`
- [X] T015 [US2] In `ChecklistList.tsx`, add a checkbox per item wired to `toggleChecklistItem`, with optimistic UI (`useOptimistic`, same pattern as `PhotoGrid`/`DocList`)

**Checkpoint**: Toggling on `/checklist` works and persists across reload.

---

## Phase 5: User Story 3 - See a room's outstanding tasks on-site (Priority: P1)

**Goal**: Room-scoped, not-done-only checklist box on every room/work-type page, with its own add + toggle (no navigation required).

**Independent Test**: quickstart.md Scenarios 2, 3, 4.

### Implementation for User Story 3

- [X] T016 [US3] Create `components/RoomChecklistBox.tsx`: quick-add input (calls `addChecklistItem(text, [roomId])`), list of passed-in items with checkbox toggle (`toggleChecklistItem`), empty state when the list is empty
- [X] T017 [US3] Update `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`: fetch `getRoomChecklistItems(currentRoom.id)`; restructure the layout into a responsive two-column shape (`flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px]`) with the existing nav/filter/grid content at `order-2 lg:order-1` and `RoomChecklistBox` at `order-1 lg:order-2`, so the box sits above the work-type tabs on mobile and beside the content on desktop (depends on T016)

**Checkpoint**: Every room/work-type page shows that room's pending tasks, addable/toggleable in place, correctly placed on both mobile and desktop.

---

## Phase 6: User Story 4 - Untagged items stay sitewide-only (Priority: P2)

**Goal**: Confirm untagged items never leak into a room box.

**Independent Test**: quickstart.md Scenario 2 step 4 — this is verification of behavior T006/T016 already implement correctly by construction (an untagged item has no `checklist_item_rooms` rows, so it can never match a room-scoped query), not new code.

### Implementation for User Story 4

- [ ] T018 [US4] Live-verify: add an untagged item, confirm it's absent from every room's box while present on `/checklist`
  **Blocked on the account holder** — requires T002 + sign-in.

---

## Phase 7: Editing & Deletion (FR-007)

- [X] T019 [P] In `app/actions/checklist.ts`, add `editChecklistItem({ id, text?, roomIds? })` — full-replace semantics for room tags (delete existing junction rows, insert the new set)
- [X] T020 [P] In `app/actions/checklist.ts`, add `deleteChecklistItem(id)`
- [X] T021 In `ChecklistList.tsx`, add a pencil-icon edit affordance (small dedicated dialog: text + room checkboxes) and a delete button with the same confirm-dialog pattern `PhotoGrid`/`DocList` already use (depends on T019, T020)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T022 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T023 [P] Run `npx next lint` — no warnings or errors
- [X] T024 [P] Run `npm test` (no regressions expected) — 6 files, 36 tests, all passed
- [~] T025 Dev-server compile check of `/checklist` and `/photos/[roomSlug]/[workTypeSlug]`
  Attempted live: both routes sit behind the auth middleware (DATA_SOURCE is hardcoded `"supabase"` in this environment, see `lib/data-config.ts`), so an unauthenticated request redirects to `/login` before Next.js resolves either route's module — no compile ever happens server-side to check. **Blocked on the account holder** (needs sign-in) same as T002/T018/T026. T022's `tsc --noEmit` (0 errors) already type-checks every new file's full import graph, which is the strongest check available without a session.
- [ ] T026 Live-verify quickstart.md Scenario 5 (viewer role sees read-only)
  **Blocked on the account holder** — requires T002 + sign-in as both an editor and a viewer account.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS everything else.
- **US1 (Phase 3)**: Depends on Foundational. Delivers the MVP (create items).
- **US2 (Phase 4)**: Depends on Foundational + US1 existing (needs items to toggle).
- **US3 (Phase 5)**: Depends on Foundational + US1/US2's Server Actions (reuses `addChecklistItem`/`toggleChecklistItem` unchanged).
- **US4 (Phase 6)**: Pure verification, depends on US1/US3 being live.
- **Editing & Deletion (Phase 7)**: Independent of US1-US4's read paths, can be done any time after Foundational.
- **Polish (Phase 8)**: Depends on everything else.

### Parallel Opportunities

- T003-T005, T007-T008 (Foundational) are mostly `[P]` — different files.
- T019-T020 (Phase 7) are `[P]` — same file but independent functions, can be drafted together.
- T022-T024 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational).
2. Complete Phase 3 (US1 — create items, sitewide page exists).
3. **STOP and VALIDATE**: quickstart.md Scenario 1's add portion confirms the core capability exists.

### Incremental Delivery

1. Foundational → US1 (create) → US2 (toggle) → US3 (room boxes, the actual point of the feature) → US4 (verification) → Editing/Deletion (completeness) → Polish.
