# Tasks: Checklist Items Always Name Their Room

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-04

**Tests**: Included, matching the repository's existing convention.

---

## Phase 1: Foundational

- [X] T001 Confirm `room_statuses` is populated for an item tagged to exactly one room, by reading the checklist data layer in `lib/` — the new rendering is driven by it, and if one-room items carry an empty list the plan's approach shows nothing at all — **confirmed populated**: `lib/data.ts` builds it one-to-one from `checklist_item_rooms`, and `lib/local/store.ts` falls back to deriving it from `room_ids`

---

## Phase 2: User Story 1 — A one-room item says which room (P1) 🎯 MVP

**Goal**: The number of rooms changes how many are listed and nothing else.

**Independent test**: quickstart Scenario 1.

- [X] T002 [US1] Remove the `multiRoom` split in `components/ChecklistList.tsx` so a single rendering covers every item that has rooms: the overall-status badge, then one tinted row per room with its icon, name, and status control (FR-001, FR-002, FR-005, FR-008)
- [X] T003 [US1] Keep the no-room cases in `components/ChecklistList.tsx` exactly as they are — a directly-settable item keeps its bare control, a derived one keeps its badge (FR-004)
- [X] T004 [US1] Name the room on each row of `components/RoomChecklistBox.tsx`, using the same icon-and-name presentation (FR-009)
- [X] T005 [US1] Test in `components/ChecklistList.test.tsx` that a one-room item names its room, and that changing its status still calls the action with that same room id (FR-001, FR-003)
- [X] T006 [P] [US1] Test that a multi-room item still names every room, and that a no-room item gains nothing (FR-004, FR-005)
- [X] T007 [P] [US1] Test in `components/RoomChecklistBox.test.tsx` that each row names its room (FR-009)

---

## Phase 3: Polish

- [X] T008 Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, then `npm run build` with the dev server stopped
- [ ] T009 **[needs a signed-in editor]** Open the checklist and confirm a one-room and a multi-room item differ only in how many rooms are listed (SC-002, SC-005)
- [ ] T010 **[needs a signed-in editor]** Check the same at 375 px with the longest room name in the system (SC-004, FR-007)

---

## Dependencies

```text
T001 → T002 → T003, T004 → T005, T006, T007 → T008 → T009, T010
```

T001 comes first because the whole approach depends on its answer.

## Parallel opportunities

- T006 and T007 are separate files from T005's assertions
- T004 is a different component from T002/T003

## Implementation strategy

There is one user story and it is the whole feature. T002 is the fix; everything else
protects it or extends it to the second component.
