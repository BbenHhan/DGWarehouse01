# Tasks: Complete Loading States

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-03

**Tests**: Included. The repository already carries a component test suite and feature 040
was built with one; these tasks keep that convention rather than introducing an untested
component tree.

---

## Phase 1: Setup

- [X] T001 Record the pre-change baseline by running `npx vitest run` and noting the passing count, so a regression in the checklist components in Phase 3 is attributable

---

## Phase 2: Foundational (blocking — every user story depends on these)

**These three pieces are shared by all eleven call sites. Getting the timers or the icon
slot wrong here is wrong everywhere at once, so they land first and with their own tests.**

- [X] T002 [P] Create the delayed-visibility hook in `lib/use-delayed-busy.ts` per [contracts/loading-primitives.md](./contracts/loading-primitives.md): returns false until the wait has lasted ~150 ms, then stays true for a floor of ~400 ms after the wait ends, and never sets state after unmount (FR-013, FR-013a)
- [X] T003 [P] Write unit tests for `useDelayedBusy` in `lib/use-delayed-busy.test.ts` using fake timers — a wait shorter than the delay never shows, a longer one shows and then persists for the floor, and an unmount mid-wait produces no state update (SC-008)
- [X] T004 [P] Create the streaming download helper in `lib/fetch-with-progress.ts`: reports bytes received and total, passes null for total when `Content-Length` is absent, resolves the downloaded blob so the file is fetched exactly once (FR-014, FR-014a, FR-014b)
- [X] T005 [P] Write unit tests for `fetchWithProgress` in `lib/fetch-with-progress.test.ts` covering a response with a declared length, one without, and a rejected fetch
- [X] T006 Add a `busy?: boolean` prop to `SelectTrigger` in `components/ui/select.tsx` that replaces its `ChevronDownIcon` with the existing `Spinner` in the same slot at the same size, leaving today's behaviour untouched when the prop is absent (FR-012a, SC-010)
- [X] T007 Write a component test for the `busy` trigger in `components/ui/select.test.tsx` asserting the spinner replaces the chevron and the trigger's rendered width is unchanged

---

## Phase 3: User Story 1 — Every button says when it is working (P1) 🎯 MVP

**Goal**: No control that writes to the server is silent while it does.

**Independent test**: With the connection throttled, tap each control listed below once and
confirm a busy state appears on the control that was touched and clears when the write
settles — quickstart Scenarios 1, 3 and 5.

### Correctness first — per-row scoping (FR-004)

- [X] T008 [US1] Replace the single shared `useTransition` in `components/RoomChecklistBox.tsx` with a tracked in-flight item id, so writing one row does not mark every row busy
- [X] T009 [US1] Do the same in `components/ChecklistList.tsx` for its status, add and delete paths
- [X] T010 [US1] Run the existing checklist tests and confirm they still pass before any indicator is added, so a later failure is attributable to the indicator and not the scoping change

### Indicators

- [X] T011 [US1] Pass `busy` (via `useDelayedBusy`) and `disabled` to the status `SelectTrigger` in `components/RoomChecklistBox.tsx` for both top-level and sub-item controls (FR-001, FR-002, FR-012a)
- [X] T012 [US1] Do the same for the status control in `components/ChecklistList.tsx`, and add spinners to its add and delete controls
- [X] T013 [P] [US1] Pass `busy` to the role `SelectTrigger` in `components/UserRoleTable.tsx`, replacing the bare `disabled` it has today
- [X] T014 [P] [US1] Show a busy state on both the approve and the deny control of the row being resolved in `components/PendingRequestsList.tsx` — today the deny button only greys out (US1 scenario 4)
- [X] T015 [P] [US1] Add spinners to the sign-out and request-edit-access items in `components/AccountMenu.tsx`, keeping their existing Thai wording
- [X] T016 [P] [US1] Confirm `components/PhotoGrid.tsx` delete keeps its immediate removal and gains no indicator that outlives the removed tile (FR-009)

### Tests

- [X] T017 [P] [US1] Test in `components/RoomChecklistBox.test.tsx` that changing one row's status marks only that row busy
- [X] T018 [P] [US1] Test in `components/PendingRequestsList.test.tsx` that resolving a row marks both of its buttons busy and leaves other rows alone
- [X] T019 [P] [US1] Test in `components/UserRoleTable.test.tsx` that a failed role change clears the busy state and restores the previous role (FR-003)

**Checkpoint**: Every writing control shows its own state. This alone satisfies Constitution
V for the app's daily actions and is a shippable increment.

---

## Phase 4: User Story 2 — Signing in shows it is checking (P2)

**Goal**: The first screen a user meets never looks frozen.

**Independent test**: quickstart Scenario 6 — submit each of the three forms throttled.

- [X] T020 [US2] Add a spinner and Thai busy wording to the sign-in submit button in `app/login/page.tsx`, and stop clearing its loading state on success so it stays busy through the navigation that follows (FR-005, FR-012b)
- [X] T021 [US2] Do the same for the sign-up form in `app/login/page.tsx`
- [X] T022 [US2] Add a spinner to the password-reset form in `app/login/page.tsx` — this one does **not** navigate, so it keeps clearing on success and reports its result in place (research §7)
- [X] T023 [US2] Test in `app/login/page.test.tsx` that a rejected sign-in clears the busy state and shows the reason in Thai, and that a successful one leaves the button busy

**Checkpoint**: All three forms report their state.

---

## Phase 5: User Story 3 — Files and images show they are arriving (P3)

**Goal**: No blank rectangle without an explanation.

**Independent test**: quickstart Scenarios 4, 7 and 8.

### Document preview

- [X] T024 [US3] Introduce the four preview states from [data-model.md](./data-model.md) — loading, ready, error, unsupported — in the `DocumentPreview` component in `components/DocList.tsx`, so every previewed file is in exactly one and none can sit outside them (FR-007)
- [X] T025 [US3] Load a PDF preview through `fetchWithProgress`, show the share and the size arriving while it streams, and hand the resulting blob URL to the existing `<object>`; revoke the URL when the preview closes or unmounts (FR-014, FR-014b)
- [X] T026 [US3] Fall back to the direct file URL if the streaming fetch fails, so a preview is never less capable than it is today (research §4)
- [X] T027 [US3] Confirm the `<object>` download fallback still appears for a browser that will not render the file inline, and that no indicator remains when it does (Story 3 scenario 4)

### Video

- [X] T028 [US3] Report video progress from the player's own `buffered` ranges via its `progress` event in `components/DocList.tsx`, leaving the `<video>` pointed at the direct URL so playback can start early and stay seekable (FR-014c, FR-014d, SC-011)

### Images

- [X] T029 [P] [US3] Show a skeleton in the image's own box until `load` fires, and a Thai message on `error`, in the preview image in `components/DocList.tsx` (FR-006, FR-008)
- [X] T030 [P] [US3] Do the same for the tiles in `components/PhotoGrid.tsx`
- [X] T031 [P] [US3] ~~Do the same for the thumbnails in `components/UnsortedFileTray.tsx` (three separate image elements)~~ — **not applicable**: these render `URL.createObjectURL` blobs of files already on the user's own disk, so there is no arrival to wait for. A skeleton here would be decoration that never shows.
- [X] T032 [P] [US3] ~~Do the same for the thumbnail in `components/DocumentUploadWorkspace.tsx`~~ — **not applicable**, same reason: a local blob URL.
- [X] T033 [P] [US3] ~~Do the same for the thumbnail in `components/MobileSwipeCard.tsx`~~ — **not applicable**, same reason: a local blob URL.

### Tests

- [X] T034 [P] [US3] Test in `components/DocList.test.tsx` that a preview reports progress while loading and that no placeholder remains once the file is ready
- [X] T035 [P] [US3] Test that an image that fails to load shows the Thai error rather than a permanent placeholder

**Checkpoint**: Every wait for content is explained.

---

## Phase 6: Polish & cross-cutting

- [X] T036 [P] Give every in-place indicator an `aria-live="polite"` status with Thai text and keep spinner glyphs `aria-hidden`, matching the pattern the existing `LoadingRegion` established (FR-010, research §8)
- [X] T037 Walk the full coverage list in the spec's Assumptions and confirm each of the eleven places shows something while it waits (SC-001)
- [X] T038 Run `npx vitest run`, `npx tsc --noEmit`, and `npm run lint`, then `npm run build` with the dev server stopped
- [ ] T039 **[needs a signed-in editor]** Run quickstart Scenarios 1–5 throttled to Slow 4G
- [ ] T040 **[needs a signed-in editor]** Run quickstart Scenario 6 (sign-in, sign-up, reset)
- [ ] T041 **[needs a signed-in editor]** Run quickstart Scenario 7 and confirm a video still plays before it has fully arrived and can still be scrubbed (SC-011) — this is the check that FR-014d has not been quietly traded away
- [ ] T042 **[needs a signed-in editor]** Run quickstart Scenario 9 at 375 px and confirm no row changes size when its indicator appears (SC-005, SC-010)
- [ ] T043 **[needs a signed-in editor]** Run quickstart Scenario 10 with a screen reader (SC-006)

---

## Dependencies

```text
Phase 1 (T001)
   └─> Phase 2 (T002–T007)  ← blocks everything
          ├─> Phase 3 US1 (T008–T019)   ← MVP
          ├─> Phase 4 US2 (T020–T023)   ← independent of US1
          └─> Phase 5 US3 (T024–T035)   ← independent of US1 and US2
                 └─> Phase 6 (T036–T043)
```

Within Phase 3, T008–T010 come before T011–T012: the scoping fix lands before the
indicator that depends on it.

Within Phase 5, T024 precedes T025–T028 (the states must exist before they are driven),
and T025 precedes T026.

## Parallel opportunities

- Phase 2: T002, T003, T004, T005 are four separate files
- Phase 3: T013, T014, T015, T016 touch four different components; T017–T019 likewise
- Phase 5: T029–T033 are five different components; T034–T035 are separate tests
- Across phases: once Phase 2 is done, US1, US2 and US3 can proceed independently

## Implementation strategy

**MVP is Phase 3 (US1)** — the controls staff touch every day, and the ones where a silent
button invites a second tap on a write that changes real records. It is shippable on its
own.

US2 and US3 each add a further slice and neither depends on the other. US3 is the largest
and the only one that changes how a file reaches the screen, so it is worth landing last
even though its story priority alone would not demand it.

Eight of the forty-three tasks (T039–T043 plus the throttled parts of T037) need a
signed-in editor and are the account holder's to run — the same constraint that left nine
of feature 040's tasks open.
