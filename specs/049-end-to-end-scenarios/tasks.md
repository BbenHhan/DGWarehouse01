---
description: "Task list for End-to-End Scenarios in a Real Browser"
---

# Tasks: End-to-End Scenarios in a Real Browser

**Input**: Design documents from `specs/049-end-to-end-scenarios/`

**Tests**: This feature is tests. The three production edits exist only to make a run possible, and must leave today's behaviour unchanged when the new settings are unset (FR-011).

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 checklist · US2 files · US3 rooms · US4 phone width · US5 signed out

---

## Phase 1: Setup

- [X] T001 Add `@playwright/test` as a dev dependency and install the Chromium build
- [X] T002 Add `test:e2e` and `test:e2e:headed` to `package.json`, and ignore `test-results/`, `playwright-report/` and the two build directories the run uses in `.gitignore`

---

## Phase 2: Foundational (blocks every story)

- [X] T003 Make the data source settable in `lib/data-config.ts`: `NEXT_PUBLIC_DATA_SOURCE` when it is one of local/mock/supabase, otherwise `supabase` exactly as today
- [X] T004 Make the sign-in switch settable in `lib/auth-config.ts`: required unless `AUTH_REQUIRED=false` **and** no deployment environment is present (`VERCEL`), so a deployment can never honour it (FR-009, FR-010)
- [X] T005 In `lib/supabase/server.ts`, have `getCurrentUser()` report a local development administrator when sign-in is off, so editing controls render — matching what `requireUser`/`requireRole` already do in that mode (research Decision 7)
- [X] T006 Extend `lib/validation.test.ts`'s neighbours with a check that the switch is refused when a deployment environment is present, and that both settings default to today's values when unset (FR-010, FR-011)
- [X] T007 Create `e2e/fixture.ts`: wipe and rebuild a throwaway data folder (in the system temp directory, out of the dev server's watched tree) through the app's own local-store functions — a category with three sub-groups (one holding a file, one empty, one with a long name), three requirement items covering all three statuses, one document, and one checklist task tagged to two rooms (data-model.md)
- [X] T008 Create `playwright.config.ts`: Chromium; global setup runs the fixture; two web servers — sign-in off on one port for US1–US4, sign-in required on another for US5 — each with `LOCAL_DATA_DIR` pointed at the fixture's folder and its own build directory; retries off so a flake fails rather than hides

---

## Phase 3: User Story 1 — The document checklist survives a real round trip (P1) 🎯 MVP

- [X] T009 [US1] Create `e2e/documents-checklist.spec.ts`: the category page shows each sub-group's items and statuses without expanding any folder
- [X] T010 [US1] In the same file: switch on management, add an item, reload, and confirm it is still listed under that sub-group
- [X] T011 [US1] Set an item from ยังขาด to มีแล้ว, reload, and confirm the new status held — the check that tells a saved change from an optimistic one
- [X] T012 [US1] Delete an item, reload, and confirm it has not come back

---

## Phase 4: User Story 2 — A file goes in and comes out again (P1)

- [X] T013 [US2] Create `e2e/documents-files.spec.ts`: upload a file through the page and confirm it appears under the chosen sub-group
- [X] T014 [US2] In the same file: use the download control, save the archive, open it, and confirm a folder per sub-group with the uploaded file inside its own (FR-003)
- [X] T015 [US2] Delete the uploaded document through the page and confirm it leaves the list
- [X] T016 [P] [US2] Create `e2e/photos.spec.ts`: upload a photo into a room and work type, see it in the grid, then delete it

---

## Phase 5: User Story 3 — Ticking one room leaves the others alone (P2)

- [X] T017 [US3] Create `e2e/room-checklist.spec.ts`: set a two-room task from the first room, confirm it holds there across a reload, and that the second room is unchanged. Marked กำลังทำ rather than เสร็จแล้ว — a finished task leaves the room's box, so there would be nothing left to read back. **The second half found a defect and is held back until it is fixed** (see below)

---

## Phase 6: User Story 4 — The pages work at phone width (P2)

- [X] T018 [US4] Create `e2e/mobile.spec.ts`: at 375px, each main page — documents, a category, photos, a room, the checklist — neither scrolls sideways nor puts a control past the edge
- [X] T019 [US4] In the same file: the sub-group with the long name and the room with the longest name keep their row intact with no text clipped

---

## Phase 7: User Story 5 — Nobody signed in gets in (P1)

- [X] T020 [US5] Create `e2e/signed-out.spec.ts` against the guarded instance: every main page sends a signed-out visitor to the login screen, and the login screen itself loads

---

## Found while writing these

The room checklist box writes a status to the room whose page it is on — the
other room's stored record is untouched — but it *shows* the item's overall
rolled-up status. Stand in the second room and a task somebody started in the
first reads "กำลังทำ" there too, which is the opposite of what a room page is
for, and against specs/032 FR-005 (each room's control independent of every
other's). The scenario that catches it is written and held back with
`test.fixme` in `e2e/room-checklist.spec.ts`; the fix is a decision for the
account holder, not a change this feature makes (FR-013).

---

## Phase 8: Polish & Cross-Cutting

- [X] T021 Confirm each scenario fails when its behaviour is broken — a status change that does not persist, the room tick sending the whole task, the old overflowing header at 375px, and a signed-out visitor let through — restoring each afterwards (FR-013, SC-005)
- [ ] T022 **Not settled on this machine.** Every scenario passes, and each spec file passes on its own in seconds. In a full run, though, one arbitrary step — sometimes a navigation, sometimes a click, in a scenario that has no server call at all — stalls for 10 to 17 minutes and takes that scenario down with it, a different one each time. Ruled out, each by a run that still stalled: the fixture folder sitting inside the watched project, waiting on the Server Action's response body, two development servers watching each other, a built server instead of the development one, and the machine idle-sleeping. Through all of it the process used about 30 seconds of CPU in a quarter of an hour, and the server answered instantly when asked from another shell — so the run looks suspended rather than busy, which is not something the suite can fix from the inside. `.local-data/` is untouched either way: the fixture lives in the system temp directory (FR-006)
- [X] T023 Run the full gate: `npx vitest run` (596 pass; `e2e/` excluded from Vitest, which owns a different `test`), `npx tsc --noEmit`, `npm run lint` (`.next-e2e/` added to the ignore list) and `npm run build` with the dev server stopped
- [X] T024 Strike the manual checks these scenarios replace from features 040–044 and 047, and leave a reason on each one that stays (FR-014)
- [X] T025 Note in `README.md` how to run the suite and what the two settings do, including that a deployment ignores the sign-in switch

---

## Dependencies

```text
T001, T002 → T003-T005 → T006, T007 → T008 → every scenario
US1 (T009-T012), US2 (T013-T016), US3 (T017), US4 (T018-T019), US5 (T020) are independent of each other
all → T021 → T022 → T023 → T024 → T025
```

## Parallel opportunities

- T016 alongside T013–T015 (different files).
- T017, T018–T019 and T020 are three separate files once the foundation exists.

## Implementation strategy

1. Tooling and the three settings, with a check that a deployment cannot switch sign-in off.
2. The fixture and the runner.
3. US1 — the checklist round trip, the MVP.
4. US2, then US3–US5.
5. Break each behaviour to prove the scenarios catch it, run everything twice, then tidy the manual list.
