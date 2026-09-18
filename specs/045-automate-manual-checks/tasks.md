# Tasks: Automate the Checks Nobody Can Run

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-04

---

## Phase 1: User Story 1 & 2 — the security boundary and the delete guards (P1) 🎯

- [X] T001 [US1] Create `app/actions/document-taxonomy.test.ts` running the actions against the local backend, with the rights check mocked and the Supabase client stubbed to throw if constructed (research §1, §2)
- [X] T002 [US1] Check every management action is refused for someone without edit rights, and separately for someone not signed in (FR-001, FR-002)
- [X] T003 [US1] Check a refused action leaves the stored state untouched (FR-001)
- [X] T004 [US1] Check the gate asks for edit rights rather than administrator rights (FR-003, Constitution VII)
- [X] T005 [US2] Check deletion is refused when it claims a target is empty and the target still holds documents, and that the count is stated (FR-004)
- [X] T006 [US2] Check a destructive deletion is refused when the file count no longer matches what was agreed to (FR-004)
- [X] T007 [US2] Check a move destination inside the group, and inside the category, being deleted is refused (FR-004)
- [X] T008 [US2] Check a valid move relocates every document and destroys none, for both a group and a cross-category move (FR-005)
- [X] T009 [US2] Check deleting a category takes its sub-groups with it in one action (FR-006)
- [X] T010 [US2] Check rejected writes — duplicate name, blank name, first-row move-up — state a reason and leave the store as it was (FR-007)
- [X] T011 [US2] Check renaming keeps a group's documents and keeps a category's slug (FR-007)

---

## Phase 2: User Story 3 — the interaction rules (P2)

- [X] T012 [US3] Create `components/ManageModeProvider.test.tsx` and check unsubmitted typing survives leaving and re-entering management mode (FR-008)
- [X] T013 [US3] Check a burst of reorder requests settles in the order requested, each applied in turn rather than overlapping, using fake timers (FR-009, FR-012)
- [X] T014 [US3] Extend `components/DocList.test.tsx` to check a video reports how much has arrived and does not withhold playback until complete (FR-010)
- [X] T020 [US3] Cover the remaining ways into the app, so specs/041 Scenario 6 can leave the manual list: sign-up and the forgotten-password form in `app/login/page.test.tsx`, and the new `app/reset-password/page.test.tsx`

---

## Phase 3: User Story 4 — an honest manual list (P3)

- [X] T015 [US4] Remove from the tasks lists of features 040–044 every manual entry now covered by an automated check (FR-014)
- [X] T016 [US4] Give each surviving manual entry the reason a person is required — phone-width layout, screen-reader output, and a real download from production storage (FR-013)

---

## Phase 4: Verification

- [X] T017 Confirm each new check fails when the behaviour it protects is reverted, rather than passing regardless (SC-005) — the criterion that decides whether this feature was worth doing
- [X] T018 Run the suite several times and confirm no intermittent failures (FR-012, SC-004)
- [X] T019 Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, then `npm run build` with the dev server stopped

---

## Dependencies

```text
T001 → T002..T011 → T012..T014, T020 → T015, T016 → T017 → T018 → T019
```

## Parallel opportunities

- T002–T011 are independent assertions once T001 exists
- T012/T013 and T014 are separate files

## Implementation strategy

Phase 1 is the whole point: it is the only outstanding check whose failure would be a
security hole, and the only one guarding against permanent loss of the account holder's
documents. It is worth landing on its own.

---

## Outcome

The manual list across features 040–044 went from 16 entries to 7. Each survivor
now states what makes a person necessary: phone-width layout (040 T053, 041 T042,
042 T010), screen-reader output (041 T043), a real file coming back from
production storage (040 T032, T050), and one judgement about whether nesting
reads clearly (044 T007).

T017 was carried out by reverting each protected behaviour in turn and confirming
the checks went red: the rights gate made to always allow (18 of 36 failed), the
draft store made to forget (2 failed), the reorder queue made to fire in parallel
(1 failed), and the video held back until fully downloaded (3 failed). Every
revert was undone afterwards.
