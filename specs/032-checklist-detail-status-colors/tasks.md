---

description: "Task list for Checklist Detail, Dates, Status, and Room Colors"

---

# Tasks: Checklist Detail, Dates, Status, and Room Colors

**Input**: Design documents from `/specs/032-checklist-detail-status-colors/`

**Tests**: `rollupChecklistStatus` gets a focused unit test (plan.md Testing) — everything else follows specs/028-031's `tsc`/`lint`/dev-compile verification.

---

## Phase 1: Foundational (Blocking Prerequisites)

- [X] T001 Create `supabase/migrations/0013_checklist_status_detail_dates.sql` per data-model.md's exact SQL
- [ ] T002 Apply the migration to the live Supabase project (manual, Supabase SQL Editor)
  **Blocked on the account holder.** Live-confirmed via a dev-server error while implementing this feature: the real Supabase project's `checklist_item_rooms` table already exists (so at least migrations 0010-0012 are live) but has no `status` column yet (`column checklist_item_rooms_1.status does not exist`) — 0013 genuinely needs to run before this feature works live.
- [X] T003 [P] Create `lib/checklist-status.ts`: `ChecklistStatus`-consuming `rollupChecklistStatus`
- [X] T004 [P] Create `lib/checklist-status.test.ts` (co-located with source, matching this repo's existing test convention rather than a separate `tests/` dir): cover all-todo→todo, all-done→done, any-mixed→in_progress, single-in_progress→in_progress, empty→todo
- [X] T005 [P] Create `lib/room-colors.ts`: slug-keyed Tailwind class lookup (chip/row/select per real room + fallback) and a fixed `STATUS_COLORS` map for todo/in_progress/done
- [X] T006 [P] Update `lib/types.ts`: add `ChecklistStatus`; `ChecklistItem` gains `detail`, `status`, `start_date`, `due_date`, `room_statuses` (replaces the old boolean `is_done` role, room_ids stays)
- [X] T007 [P] Update `lib/database.types.ts`: both checklist tables' `is_done` → `status`; `checklist_items` gains `detail`/`start_date`/`due_date`
- [X] T008 Update `lib/validation.ts`: `addChecklistItemSchema` gains optional `detail`, `startDate`, `dueDate` (as an input-object shape matching data-model.md); new `setChecklistItemStatusSchema`/`setChecklistItemRoomStatusSchema` validating `status` against the 3 allowed values

**Checkpoint**: Schema live (once T002 runs); shared status/color modules ready.

---

## Phase 2: User Story 1 - Give a task real shape: detail, dates, and a working status (Priority: P1) 🎯 MVP

- [X] T009 [US1] In `app/actions/checklist.ts`: change `addChecklistItem` to a single input-object param carrying `detail`/`startDate`/`dueDate`; replace `toggleChecklistItem` with `setChecklistItemStatus` (cascades to sub-items, syncs parent via `rollupChecklistStatus`); replace `toggleChecklistItemRoom` with `setChecklistItemRoomStatus` (recomputes item status via rollup, syncs parent); `editChecklistItem` gains `detail`/`startDate`/`dueDate` updates
- [X] T010 [US1] In `lib/local/store.ts`: mirror T009's three actions, using `rollupChecklistStatus`; `LocalDb` records gain `detail`/`status`/`start_date`/`due_date`/`room_statuses`; add backward-compat normalization in `loadDb()` for pre-existing records
- [X] T011 [US1] In `lib/data.ts`: `getChecklistItems()`/`getRoomChecklistItems()` read `status` (not `is_done`) from the join, populate `room_statuses`, filter "not done" as `status !== 'done'`
- [X] T012 [US1] In `components/ChecklistList.tsx`: add-form gains a detail `<textarea>` and start/due `<input type="date">`; each row shows detail (if set) and a formatted date line (only set parts, via `formatThaiDate`); 0-room/0-sub rows get a directly-editable status `<select>`; edit dialog gains detail/date fields
- [X] T013 [US1] Run `npx tsc --noEmit`, `npx next lint`, `npm test` — 0 errors/warnings; 42 tests pass (36 existing + 6 new `rollupChecklistStatus` tests)

**Checkpoint**: Detail/dates/status fully work on `/checklist` for 0-room, 0-sub items — the MVP.

---

## Phase 3: User Story 2 - A room's box shows what's due there, without clutter (Priority: P2)

- [X] T014 [US2] In `components/RoomChecklistBox.tsx`: show an item's due date (formatted) only when set; wire status controls to `setChecklistItemRoomStatus`/`setChecklistItemStatus` per specs/031's existing untagged-sub fallback rule

**Checkpoint**: Room boxes show due dates correctly, never a placeholder for an unset one.

---

## Phase 4: User Story 3 - Each room reads as its own color everywhere (Priority: P2)

- [X] T015 [US3] In `components/ChecklistList.tsx`: apply `lib/room-colors.ts` classes to room chips, per-room status rows (2+ rooms), and the single-room inline status control; status badges/controls use `STATUS_COLORS`, never a room color
- [X] T016 [US3] In `components/RoomChecklistBox.tsx`: tint the box/each row with the current room's color from `lib/room-colors.ts`

**Checkpoint**: Every room renders consistently in its own color across `/checklist` and every room's own box; status color stays independent of room color.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T017 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T018 [P] Run `npx next lint` — no warnings or errors
- [X] T019 [P] Run `npm test` — 7 files, 42 tests, all passed
- [~] T020 Dev-server compile check of `/checklist` and `/photos/[roomSlug]/[workTypeSlug]`
  Live-confirmed (see T002): a request reached the real Supabase query and returned `column checklist_item_rooms_1.status does not exist` — proves the new code path compiles and runs correctly against the live schema shape, and pinpoints migration 0013 as the only missing piece before it fully works. **Blocked on the account holder** for the actual migration.

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: BLOCKS everything else.
- **US1 (Phase 2)**: Depends on Foundational. Delivers the MVP.
- **US2 (Phase 3)**: Depends on US1 (`setChecklistItemRoomStatus` already exists).
- **US3 (Phase 4)**: Independent of US2, depends on Foundational's `lib/room-colors.ts`.
- **Polish (Phase 5)**: Depends on everything else.
