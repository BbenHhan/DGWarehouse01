# Tasks: A Room Sees the Sub-Items That Belong to It

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-04

**Tests**: Included.

---

## Phase 1: User Story 1 — Work assigned through a sub-item reaches its room (P1) 🎯

- [X] T001 Write a failing test in `lib/local/checklist-store.test.ts` for the reported case: an entry with no room tag, two sub-items tagged to two different rooms, and each room's list expected to contain the entry with only its own sub-item (FR-001, FR-002, SC-005)
- [X] T002 Widen `getRoomChecklistItems` in `lib/data.ts` to include a top-level entry when the entry carries the room's tag **or** any of its sub-items does, leaving the existing sub-item filter alone (FR-001, FR-002, FR-005)
- [X] T003 Make the same change in `localGetRoomChecklistItems` in `lib/local/store.ts`, so both backends answer identically (Constitution III, FR-001)
- [X] T004 In `components/RoomChecklistBox.tsx`, show a rollup status for an entry that carries no tag for this room instead of a control that would write nowhere, and keep the control for an entry that does carry one (FR-003, FR-004, FR-010, SC-003)
- [X] T005 [P] Test that an entry with no sub-item in this room and no tag of its own stays off the page (FR-005)
- [X] T006 [P] Test that finished work still drops off, both when the entry is finished and when its sub-items for this room are (FR-006)
- [X] T007 [P] Test that a sub-item with no room tag still inherits its parent's rooms (FR-007)
- [X] T008 [P] Test in `components/RoomChecklistBox.test.tsx` that an untagged parent shows a status but offers no control, while a tagged one still offers its control (FR-004, FR-010, SC-003, SC-006)

---

## Phase 2: Polish

- [X] T009 Confirm the sitewide checklist is unaffected by running its existing tests (FR-008, SC-004)
- [X] T010 Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, then `npm run build` with the dev server stopped
- [X] T011 Re-run the live probe against Supabase and confirm the two rooms holding a tagged sub-item now each return one entry, where both returned none before (SC-001, SC-005) — **confirmed**: hong-raek and hong-klang each return "testchecklist" carrying only their own sub-item; the other four rooms correctly return nothing
- [ ] T012 **[needs a signed-in editor]** Open both room pages and confirm each shows the entry with only its own sub-item

---

## Dependencies

```text
T001 → T002, T003 → T004 → T005, T006, T007, T008 → T009 → T010 → T011 → T012
```

T001 first: the test should fail for the reported reason before anything is changed, so the
fix is shown to address the actual defect rather than merely coinciding with it.

## Parallel opportunities

- T005, T006, T007, T008 are independent assertions once the fix is in

## Implementation strategy

One user story, and T002/T003 are the fix. Everything else either proves it or follows from
it. The local-store test in T001 is what makes the defect reproducible without a signed-in
session, which is what has blocked verification on this project throughout.
