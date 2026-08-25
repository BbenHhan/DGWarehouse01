---

description: "Task list for Per-Room Checklist Completion"

---

# Tasks: Per-Room Checklist Completion

**Input**: Design documents from `/specs/031-checklist-room-completion/`

**Tests**: No new Vitest coverage — see plan.md Testing.

**Organization**: Tasks grouped by user story (US1–US2 from spec.md).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational (Blocking Prerequisites)

- [X] T001 Create `supabase/migrations/0012_checklist_room_completion.sql` per data-model.md's exact SQL (`checklist_item_rooms.is_done`)
- [ ] T002 Apply the migration to the live Supabase project (manual, Supabase SQL Editor)
  **Blocked on the account holder** — nothing in this feature works live until this runs (also still blocked on specs/028/029's own migrations, if not yet applied).
- [X] T003 [P] Update `lib/types.ts`: `ChecklistItem` gains `room_completions: { room_id: string; is_done: boolean }[]`
- [X] T004 [P] Update `lib/database.types.ts`: `checklist_item_rooms` Row/Insert/Update gain `is_done`
- [X] T005 In `app/actions/checklist.ts`, remove specs/030's `addChecklistItem` explosion branch (`parentId === undefined && roomIds.length >= 2`) — revert to always calling `createChecklistItemRow` once, with all given `roomIds` attached directly
- [X] T006 In `app/actions/checklist.ts`, add `toggleChecklistItemRoom(itemId, roomId, isDone)`: write the room-tag row's `is_done`, recompute+write the item's own derived `is_done` from all its room-tag rows, then re-sync the parent from siblings if the item has a `parent_id` (research.md Decision 5) — both `local`/`supabase` backends
- [X] T007 In `lib/local/store.ts`, add the local equivalent: room completion state alongside each record's `room_ids`, and `localToggleChecklistItemRoom` implementing T006's same three steps

**Checkpoint**: Schema live (once T002 runs); a room tag's completion can be read/written independently of the item's own state.

---

## Phase 2: User Story 1 - See and tick each room's part right on the checklist page (Priority: P1) 🎯 MVP

**Independent Test**: spec.md User Story 1's Independent Test.

- [X] T008 [US1] In `lib/data.ts`, update `getChecklistItems()`'s joined select to `checklist_item_rooms(room_id, is_done)` and populate each returned item's `room_completions`
- [X] T009 [US1] In `components/ChecklistList.tsx`: when `item.room_ids.length >= 2`, render no checkbox next to the item's text — instead render one labelled checkbox per `room_completions` entry underneath, each calling `toggleChecklistItemRoom`; when `room_ids.length === 1`, keep the existing single inline checkbox but wire it to `toggleChecklistItemRoom` instead of `toggleChecklistItem`; when `room_ids.length === 0`, unchanged (`toggleChecklistItem`)

**Checkpoint**: `/checklist` shows and lets you tick each room's part of a multi-room item; single/zero-room items are visually unchanged.

---

## Phase 3: User Story 2 - A room's own page only ever affects that room's part (Priority: P1)

**Independent Test**: spec.md User Story 2's Independent Test.

- [X] T010 [US2] In `lib/data.ts`, simplify `getRoomChecklistItems(roomId)`: filter top-level items (and, for sub-items, the existing inherit/override rule) on the room-tag row's own `is_done`, not the item's — remove specs/030's union-with-extra-parents logic entirely (data-model.md)
- [X] T011 [US2] In `lib/local/store.ts`, apply the equivalent simplification to `localGetRoomChecklistItems`
- [X] T012 [US2] In `components/RoomChecklistBox.tsx`: every shown item's checkbox always calls `toggleChecklistItemRoom(item.id, roomId, true)`; remove specs/030's `parentDirectlyTagged` checkbox-suppression logic (no longer applicable — every item shown is directly tagged by construction)
- [X] T013 [US2] In `components/RoomChecklistBox.tsx`'s per-parent "add sub" quick-form, keep tagging the new sub-item to the current room (unchanged from specs/030 Decision 5 — still correct under this design)
- [ ] T014 [US2] Live-verify: tag an item to Room A and Room B, tick it from Room A's box, confirm Room B's box and `/checklist`'s overall state are unaffected (spec User Story 2, all 3 Acceptance Scenarios)
  **Blocked on the account holder** — requires T002 + sign-in.

**Checkpoint**: Every room's box only ever writes that room's own completion state.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `npx tsc --noEmit`
- [X] T016 [P] Run `npx next lint`
- [X] T017 [P] Run `npm test` (no regressions expected)
- [~] T018 Dev-server compile check of `/checklist` and `/photos/[roomSlug]/[workTypeSlug]` (same auth-wall caveat as specs/028/029/030 — best-effort via `tsc`/`lint`)

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: BLOCKS everything else.
- **US1 (Phase 2)**: Depends on Foundational. Delivers the MVP (per-room checkboxes visible/toggleable on `/checklist`).
- **US2 (Phase 3)**: Depends on Foundational + US1 (`toggleChecklistItemRoom` already exists).
- **Polish (Phase 4)**: Depends on everything else.
