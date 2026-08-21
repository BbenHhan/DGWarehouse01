---

description: "Task list for Bulk Multi-File Upload with Drag-to-Categorize"

---

# Tasks: Bulk Multi-File Upload with Drag-to-Categorize

**Input**: Design documents from `/specs/015-multi-upload-drag-sort/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: `lib/upload-session.ts`'s pure logic (week-resolution cache, batch chunking) gets Vitest coverage, matching this project's existing pattern of unit-testing pure `lib/*.ts` helpers (`lib/roles.test.ts`, `lib/date-range.test.ts`, etc.). UI/interaction behavior is verified live via quickstart.md, consistent with how this project verifies Server-Action-driven UI elsewhere.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies (research.md Decision 1: native HTML5 drag-and-drop, no library).*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The page shell, the one new Server Action, and the pure session-logic module every user story's UI calls into.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] In `app/actions/photos.ts`, add `resolveWeekForDrop(roomId, workTypeId, startDate, endDate)`: same `assertCanEdit()` gate as the file's other actions, exact-match lookup via existing `getWeeks()` (`lib/data.ts`), falling back to the existing `createWeek()` unchanged for the create path (data-model.md "New Server Action")
- [X] T002 [P] Create `lib/upload-session.ts`: `getOrResolveWeek(cache, key, resolve)` (in-flight promise de-dup keyed by `` `${roomId}::${workTypeId}::${startDate}::${endDate}` ``, research.md Decision 2) and `chunkFiles(files, maxPerChunk)` (research.md Decision 4); add `lib/upload-session.test.ts` covering both — concurrent calls with the same key share one promise, `chunkFiles` splits correctly at the boundary (19/20/21 files)
  **Result**: 9/9 tests pass, including a failed-resolution-isn't-cached case beyond what was originally scoped.
- [X] T003 Create `app/(app)/upload/page.tsx`: server component, `requireRole("editor")` gate using the same try/catch-and-render-denied pattern as `app/(app)/admin/users/page.tsx`, fetches `getRooms()`/`getWorkTypes()` in parallel, renders `BulkUploadWorkspace` with them as props
- [X] T004 [P] In `components/AccountMenu.tsx`, add an "อัปโหลดรูปหลายไฟล์" link to `/upload`, gated by `canEdit(role)` (`lib/roles.ts`), placed using the same conditional-link pattern as the existing `isAdmin(role) &&` admin-users link (research.md Decision 6)

**Checkpoint**: `/upload` route exists, gated, renders an (empty) workspace shell; `resolveWeekForDrop` and the session-logic helpers are ready to be wired up.

---

## Phase 3: User Story 1 - Sort a whole site visit's photos in one sitting (Priority: P1) 🎯 MVP

**Goal**: Full desktop drag-to-categorize flow — date range once, add many files, drag each onto a room tab / work-type bin, immediate per-file upload, correct week resolve-or-create.

**Independent Test**: quickstart.md Scenarios 1, 2, 6.

### Implementation for User Story 1

- [X] T005 [P] [US1] Create `components/UploadDateRangePicker.tsx`: start/end `<Input type="date">` pair, same visual pattern as `AddWeekButton.tsx`'s date inputs, calls back up with `{startDate, endDate}` once both are set
- [X] T006 [US1] Create `components/UnsortedFileTray.tsx`: grid of file chips (image preview via `URL.createObjectURL`, revoked on removal/unmount per research.md Decision 5; video icon for video files), each chip `draggable` with `dragstart` setting the file's client-side id, per-file status badge (waiting/uploading/done/error) (depends on T002 for the `UnsortedFile` shape from data-model.md)
  **Deviation from plan**: a "done" status was planned but turned out unnecessary — a successfully-uploaded file is removed from the tray immediately (per spec.md's own "leaves the unsorted tray" wording) rather than shown briefly as done, so the status union is `waiting | uploading | error` (no `done`), simpler than data-model.md's original 4-state sketch.
- [X] T007 [US1] Create `components/RoomTabBar.tsx`: tabs for the 6 rooms (props from `getRooms()`), `dragover`/`drop` handlers that set the active room without themselves assigning a work type (per spec Acceptance Scenario 3), click also switches tabs
- [X] T008 [US1] Create `components/WorkTypeBinGrid.tsx`: bins for the active room's 7 work types (props from `getWorkTypes()`), `dragover`/`drop` handler that resolves the file id from the drag event, calls `getOrResolveWeek` (T002) → `resolveWeekForDrop` (T001) → on success calls the existing `uploadPhoto(weekId, [file])`, updates the dropped file's status and the bin's count
- [X] T009 [US1] Create `components/BulkUploadWorkspace.tsx`: owns `BulkUploadSession` state (data-model.md), file-add handler wired to both a multi-file `<input>` and a page-level drop zone for dragging files in from the desktop, composes `UploadDateRangePicker` + `UnsortedFileTray` + `RoomTabBar` + `WorkTypeBinGrid`, passes the shared week-resolution cache (T002) down so every bin drop in the session shares one cache instance
- [X] T010 [US1] Wire `app/(app)/upload/page.tsx` (T003) to render the now-complete `BulkUploadWorkspace` (depends on T005-T009)
- [ ] T011 [US1] Live-verify quickstart.md Scenarios 1, 2, and 6 in the browser (dev server, signed in as editor/admin)
  **Blocked on the account holder**: `/upload` correctly redirects to `/login` when unauthenticated (confirmed — the role gate works), but signing in requires real credentials this agent does not have and must not enter (password entry is a prohibited action). Static verification done instead: `tsc --noEmit` and `next lint` both clean, full Vitest suite (42/42) passes. Needs the account holder to sign in and run through Scenarios 1/2/6 themselves.

**Checkpoint**: A full desktop session — date range, batch add, drag-sort into rooms/work-types — works end to end and photos appear correctly on the existing browsing pages.

---

## Phase 4: User Story 2 - Sorting works just as well on a phone (Priority: P1)

**Goal**: Full mobile parity via tap-select-then-assign, no functionality reachable only by drag.

**Independent Test**: quickstart.md Scenario 4, at a phone-sized viewport.

### Implementation for User Story 2

- [X] ~~T012 [US2] Extend `components/UnsortedFileTray.tsx` (T006) with tap-to-toggle multi-select~~
  **Superseded** — see Phase 7 (User Story 2 revision). The tap-select-many mechanism this fed was removed; `UnsortedFileTray` no longer has selection at all.
- [X] ~~T013 [US2] Create `components/MobileAssignSheet.tsx`: two-step bottom sheet~~
  **Superseded** — see Phase 7. `MobileAssignSheet.tsx` was deleted and replaced by `components/MobileSwipeCard.tsx` (research.md Decisions 9-11), after live feedback that this design had no reasonable way to add one photo to more than one room/work-type.
- [X] ~~T014 [US2] In `components/BulkUploadWorkspace.tsx`, render a selection action bar opening `MobileAssignSheet`~~
  **Superseded** — see Phase 7.
- [X] ~~T015 [US2] Live-verify quickstart.md Scenario 4 (original)~~
  **Superseded** — quickstart.md Scenario 4 itself was rewritten for the new flow; see Phase 7's T029.

**Checkpoint**: Superseded by Phase 7's checkpoint below — this phase's original design shipped, was used live, and was replaced before verification tasks (T015) were ever completed.

---

## Phase 5: User Story 3 - A rejected or failed file doesn't block the rest of the batch (Priority: P2)

**Goal**: Confirm per-file isolation of errors (invalid type, overlap rejection, transient upload failure) and add a retry action — the loading/error states themselves already exist from US1/US2 (Constitution V requires them unconditionally), this phase adds the retry affordance and verifies the isolation guarantee specifically.

**Independent Test**: quickstart.md Scenarios 3 and 5.

### Implementation for User Story 3

- [X] T016 [US3] Add a retry action to `components/UnsortedFileTray.tsx`'s error-state chip (T006/T012) — re-attempts the same resolve-week-then-upload sequence for that one file only, without affecting any other file's state
- [ ] T017 [US3] Live-verify quickstart.md Scenario 3 (date-range overlap surfaces as a per-file error, matching `createWeek`'s existing message verbatim) and Scenario 5 (one invalid file's rejection doesn't block the rest of the same batch)
  **Blocked on the account holder** — same reason as T011. Code-level guarantee is in place: `assignFiles` marks only the ids in the current chunk as errored on failure, and `resolveWeekForDrop` returns `createWeek`'s overlap-rejection message unchanged (verified by reading both call paths, not yet exercised live).

**Checkpoint**: A batch with one bad file completes with every good file sorted, and the bad file's error is clear and isolated.

---

## Phase 6: User Story 4 - The tray stays readable and the assignment panel stays reachable in a large batch (Priority: P2)

*Added after initial delivery, from the account holder's own first real use of the page (see spec.md User Story 4) — not part of the original task breakdown.*

**Goal**: Preview-size choice for the tray (FR-013) and a two-column layout that keeps the assignment panel reachable regardless of tray length (FR-014).

**Independent Test**: quickstart.md Scenario 7 (added below).

### Implementation for User Story 4

- [X] T021 [P] [US4] In `components/AccountMenu.tsx` and `app/(app)/layout.tsx`/`components/Sidebar.tsx`/`components/SidebarSwitcher.tsx`, surface the `/upload` entry point in the main sidebar (desktop + mobile switcher), not just the account menu — resolves spec.md's Assumption about nav placement more durably than the account-menu-only original (research.md Decision 6 amendment)
- [X] T022 [US4] In `components/UnsortedFileTray.tsx`, add a 3-mode view toggle (large/medium/list — research.md Decision 7) with `viewMode` as local component state (data-model.md "Tray display preference"); extract `FileGridChip`/`FileListRow` so drag/select/retry behavior is shared across all three modes rather than duplicated
- [X] T023 [US4] In `components/BulkUploadWorkspace.tsx`, restructure into a two-column `lg:grid-cols-[minmax(0,1fr)_320px]` layout (tray left, `lg:sticky` room-tabs+bins panel right), single-column below `lg:` unchanged (research.md Decision 8); adjust `components/WorkTypeBinGrid.tsx` to a fixed 2-column grid since it now lives in a fixed-width column rather than sizing by viewport breakpoint
- [ ] T024 [US4] Live-verify quickstart.md Scenario 7 in the browser
  **Blocked on the account holder** — same reason as T011. Static checks done: `tsc --noEmit` and `next lint` clean after each change; dev server log checked for compile/runtime errors after each change (none found).
- [X] T030 [US4] In `components/RoomTabBar.tsx`, change `overflow-x-auto` to `flex-wrap` inside a bordered box (research.md Decision 12); in `components/BulkUploadWorkspace.tsx`, add "ห้อง"/"หมวดงาน" labels above the desktop room selector and work-type grid, matching `MobileSwipeCard`'s wording
- [ ] T031 [US4] Live-verify quickstart.md Scenario 4b in the browser
  **Blocked on the account holder** — same reason as T011. Static checks done: `tsc --noEmit`/`next lint` clean.

**Checkpoint**: A batch of 30+ files stays legible at at least one preview size, and the assignment panel never requires scrolling past the tray to reach on wide screens.

---

## Phase 7: User Story 2 Revision - One-at-a-time mobile review with multi-bin support

*Added after Phase 4 shipped and was used live — replaces Phase 4's T012-T014 (marked superseded above), not an extension of them. See spec.md User Story 2 (revised) and research.md Decisions 9-11.*

**Goal**: Replace the tap-select-many-then-sheet mobile flow with a one-at-a-time review card large enough to see clearly, where navigating never assigns anything and the same photo can be added to more than one room/work-type.

**Independent Test**: quickstart.md Scenario 4 (rewritten).

### Implementation for User Story 2 Revision

- [X] T025 [P] [US2] In `components/BulkUploadWorkspace.tsx`, add `confirmedFor: Array<{roomId, workTypeId}>` to `UnsortedFile` (data-model.md); add `assignFileKeepInTray(target, roomId, workTypeId)` — same resolve-week-then-upload sequence as `assignFiles`, but on success appends to `confirmedFor` and resets status to `"waiting"` instead of removing the file from `files` (research.md Decision 11)
- [X] T026 [US2] Delete `components/MobileAssignSheet.tsx`; remove `selectedIds`/`onToggleSelect` from `components/UnsortedFileTray.tsx` and from `BulkUploadWorkspace.tsx`'s state (desktop assignment is drag-only; selection had no remaining consumer)
- [X] T027 [US2] Create `components/MobileSwipeCard.tsx`: one file shown at a time (`index` state), room chips + work-type chips below it as local `useState` that navigation never touches (research.md Decision 10), Previous/Next via buttons and pointer-drag swipe, an "add" button calling `onAssignFile` for the current file only — never advances the card and is blocked (with a clear message) if `confirmedFor` already has this exact room/work-type combination (FR-017)
- [X] T028 [US2] In `components/BulkUploadWorkspace.tsx`, render `MobileSwipeCard` under `md:hidden` (phone-only) and the existing grid-tray/drag UI under `hidden md:block` (tablet/desktop unchanged) — replaces the previous `sm:hidden` action-bar/sheet wiring entirely
- [ ] T029 [US2] Live-verify quickstart.md Scenario 4 (rewritten) in the browser at a phone-sized viewport, including the multi-bin case (steps 5-7) and the duplicate-add rejection (step 7)
  **Blocked on the account holder** — same reason as T011. Static checks done: `tsc --noEmit`/`next lint` clean, `npm test` 42/42 (unaffected — this phase touched no `lib/*.ts` files with test coverage).

**Checkpoint**: A phone-sized screen can review a batch one photo at a time, add any photo to more than one room/work-type without losing its place, and never has selection silently reset by browsing.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T018 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T019 [P] Run `npm test`, confirm `lib/upload-session.test.ts` passes and no regressions in the existing suite
  **Result**: 42/42 pass (33 pre-existing + 9 new).
- [ ] T020 Live-verify quickstart.md Scenario 6 end to end (sorted photos indistinguishable from normal single-room uploads) as a final sign-off
  **Blocked on the account holder** — same reason as T011.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories — the route, the Server Action, and the session-logic module are load-bearing for every subsequent task.
- **User Story 1 (Phase 3)**: Depends on Foundational. Builds the full desktop flow, including the shared session state (`BulkUploadWorkspace`) that US2 extends rather than duplicates.
- **User Story 2 (Phase 4, superseded)**: Depends on Phase 3 — its output was replaced by Phase 7, not built upon further.
- **User Story 3 (Phase 5)**: Depends on Phase 3/4's status/error UI already existing — this phase adds retry and verifies isolation, it doesn't introduce the states themselves.
- **User Story 4 (Phase 6)**: Depends on Phase 3's `BulkUploadWorkspace`/`UnsortedFileTray`/`WorkTypeBinGrid` existing — restructures their layout and display, doesn't depend on US2/US3's specific additions. Delivered after all three since it was discovered from using the finished feature, not before it existed.
- **User Story 2 Revision (Phase 7)**: Depends on Phase 3 (reuses `assignFiles`'s sibling `resolveWeek` helper) and supersedes Phase 4's mobile-specific output; independent of Phase 5/6.
- **Polish (Phase 8)**: Depends on US1-US4 and the Phase 7 revision being complete.

### Parallel Opportunities

- T001, T002, T004 (Foundational) touch different files and can run in parallel; T003 depends on nothing else in that phase but is easiest done after T001 exists (it doesn't call it directly, but keeping the route creation last avoids merge noise).
- T005 (Foundational-adjacent date picker) can be built in parallel with T006-T008 — all four are independent files consumed together only by T009.
- T021 (nav placement) is independent of T022/T023 (tray/layout) and can run in parallel.
- T025 (state/logic) can be drafted in parallel with T027 (new component skeleton) before T028 wires them together.
- T018 and T019 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational).
2. Complete Phase 3 (US1 — full desktop drag flow).
3. **STOP and VALIDATE**: quickstart.md Scenarios 1, 2, 6 — this alone delivers real value (bulk sorting, desktop) even before mobile support lands.

### Incremental Delivery

1. Foundational → US1 (desktop MVP) → US2 (mobile parity, equal priority, ship together with US1 before calling the feature done) → US3 (resilience polish) → final Polish.
