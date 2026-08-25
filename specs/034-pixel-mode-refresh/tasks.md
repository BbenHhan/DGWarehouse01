---

description: "Task list for Pixel Mode Palette & Staircase Corners"

---

# Tasks: Pixel Mode Palette & Staircase Corners

**Input**: Design documents from `/specs/034-pixel-mode-refresh/`

**Tests**: No new Vitest coverage — see plan.md Testing.

---

## Phase 1: User Story 1 - Genuine pixel-art corners (Priority: P1) 🎯 MVP

- [X] T001 [US1] In `app/globals.css`, add `clip-path` staircase polygons to the existing Pixel supplementary rule: 8px-step on `.rounded-xl`/`.rounded-2xl`, 4px-step on `.rounded-full` (research.md Decision 2)

**Checkpoint**: Every card and badge in Pixel mode shows stepped corners.

---

## Phase 2: User Story 2 - Nine distinct status/room colors, Pixel-only (Priority: P1)

- [X] T002 [US2] In `app/globals.css`, add the nine room/status CSS variables to `:root`/`[data-theme="light"]`/`.dark`, set to today's existing values (no visual change for those three modes)
- [X] T003 [US2] In `app/globals.css`, add the same nine variables to `[data-theme="pixel"]` with the new distinct palette (data-model.md's exact values)
- [X] T004 [US2] Update `lib/room-colors.ts`: `ROOM_COLORS`/`STATUS_COLORS`/`FALLBACK_ROOM_COLOR` class strings reference the new variables instead of literal Tailwind palette classes (depends on T002/T003)

**Checkpoint**: Pixel mode shows 9 mutually-distinct colors; Light/Dark/Minimal are visually unchanged.

---

## Phase 3: User Story 3 - Pastel-yellow background and a consistently-yellow checklist box (Priority: P2)

- [X] T005 [US3] In `app/globals.css`, set `[data-theme="pixel"]`'s `--background` to pastel yellow and add `--pixel-box-bg`
- [X] T006 [US3] Update `components/RoomChecklistBox.tsx`: add the `checklist-box` class to the outer container; add `[data-theme="pixel"] .checklist-box { background-color: var(--pixel-box-bg); }` to `app/globals.css` (research.md Decision 3)

**Checkpoint**: Pixel mode's page background is pastel yellow; every room's checklist box is yellow regardless of room.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T007 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T008 [P] Run `npx next lint` — no warnings or errors
- [X] T009 [P] Run `npm test` — 7 files, 42 tests, all passed
- [X] T010 Dev-server visual check via `getComputedStyle` on `/login`: all nine Pixel variables (`--room-1-bg` … `--room-6-bg`, `--status-todo-bg`, `--status-progress-bg`, `--status-done-bg`) plus `--background`/`--pixel-box-bg` resolved exactly to the designed hex values; Minimal's `--room-1-bg` (#f0f9ff) and `--status-todo-bg` (resolves through `var(--secondary)` to #ffe8d6) confirmed unchanged from before this feature

---

## Dependencies & Execution Order

- **US1 (Phase 1)**: Independent — corners don't depend on the color work.
- **US2 (Phase 2)**: Independent of US1.
- **US3 (Phase 3)**: Independent of US1/US2.
- **Polish (Phase 4)**: Depends on everything else.
