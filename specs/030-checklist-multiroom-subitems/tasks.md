---

description: "Task list for Auto Per-Room Checklist Sub-Items"

---

# Tasks: Auto Per-Room Checklist Sub-Items

**Input**: Design documents from `/specs/030-checklist-multiroom-subitems/`

**Tests**: No new Vitest coverage — see plan.md Testing.

**Organization**: Tasks grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

*None — no schema change, no new dependencies.*

---

## Phase 2: User Story 1 - Adding an item to multiple rooms automatically breaks it down by room (Priority: P1) 🎯 MVP

**Independent Test**: spec.md User Story 1's Independent Test.

- [X] T001 [US1] In `app/actions/checklist.ts`, factor the existing single-row checklist-item creation (both `local`/`supabase` branches) out of `addChecklistItem` into a private helper `createChecklistItemRow(text, roomIds, parentId?)`
- [X] T002 [US1] In `addChecklistItem`, add the `parentId === undefined && roomIds.length >= 2` branch: fetch `getRooms()`, call the helper once for an untagged parent, once per room for a sub-item labelled `` `${text} #${room.name_th}` `` tagged to that room, and return the parent with `sub_items` populated (depends on T001)

**Checkpoint**: Adding an item with 2+ rooms selected on `/checklist` produces a parent with one sub-item per room, exactly as the account holder's worked example describes.

---

## Phase 3: User Story 2 - Finishing every room's part finishes the item (Priority: P1)

**Independent Test**: spec.md User Story 2's Independent Test.

- [X] T003 [US2] Verify (no code change expected): the generated sub-items are ordinary sub-items, so `toggleChecklistItem`'s existing auto-sync (specs/029 T010) already makes the parent done only once every one of them is done — confirm via `tsc`/manual trace, not new logic
  Confirmed by trace: `createChecklistItemRow` inserts each per-room row as a plain `checklist_items` row with `parent_id` set — `toggleChecklistItem` treats it identically to any manually-created sub-item, no special-casing needed.

**Checkpoint**: No new toggle logic needed; specs/029's mechanism already covers this once T001/T002 land.

---

## Phase 4: User Story 3 - A room's checklist box shows and lets you tick only that room's part (Priority: P1)

**Independent Test**: spec.md User Story 3's Independent Test.

- [X] T004 [US3] In `lib/data.ts`, extend `getRoomChecklistItems(roomId)`: union direct-tagged parents with parents reachable only via a not-done, room-tagged sub-item (research.md Decision 3, data-model.md's 4-step algorithm)
- [X] T005 [US3] In `lib/local/store.ts`, give `localGetRoomChecklistItems(roomId)` the equivalent union logic over the in-memory array (depends on T004 for the shared algorithm shape)
- [X] T006 [US3] In `components/RoomChecklistBox.tsx`: render a parent's own checkbox only when `item.room_ids.includes(roomId)`; otherwise render its text as a plain label (research.md Decision 4)
- [X] T007 [US3] In `components/RoomChecklistBox.tsx`'s per-parent quick-add-sub form, change `addChecklistItem(text, [], parentId)` to `addChecklistItem(text, [roomId], parentId)` (research.md Decision 5)
- [ ] T008 [US3] Live-verify: add a 2-room item, open each room's page, confirm each shows only its own part checkable and ticking one never affects the other's page (spec User Story 3, all 3 Acceptance Scenarios)
  **Blocked on the account holder** — requires the specs/028/029 migrations applied + sign-in.

**Checkpoint**: Every room's box shows exactly its own part of a multi-room item, with no control there able to affect any other room.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T010 [P] Run `npx next lint` — no warnings or errors
- [X] T011 [P] Run `npm test` (no regressions expected) — 6 files, 36 tests, all passed
- [~] T012 Dev-server compile check of `/checklist` and `/photos/[roomSlug]/[workTypeSlug]`
  Same auth-wall caveat as specs/028 T025 / specs/029 T018 — both routes redirect to `/login` before Next.js compiles them. **Blocked on the account holder** (needs sign-in). T009's `tsc --noEmit` (0 errors) is the strongest check available without a session.

---

## Dependencies & Execution Order

- **US1 (Phase 2)**: No dependencies beyond existing specs/028/029 code. Delivers the MVP (multi-room add explodes into sub-items).
- **US2 (Phase 3)**: Depends on US1 existing; pure verification, no new code expected.
- **US3 (Phase 4)**: Depends on US1 (parents can now be untagged with room-tagged subs, which is exactly the case US3's query/UI changes need to handle).
- **Polish (Phase 5)**: Depends on everything else.

## Implementation Strategy

1. Complete US1 (Phase 2) — the add-time explosion, testable purely via `/checklist` (a multi-room item's sub-items are visible there even before US3's room-box fix lands, since specs/029's existing "explicit tag" sub-filter partially works — just not yet the "parent not directly tagged" case).
2. Complete US2 (Phase 3) — verification only.
3. Complete US3 (Phase 4) — the room-box-specific fix that makes the whole feature actually usable at the room level, which was the account holder's real motivation.
4. Polish (Phase 5).
