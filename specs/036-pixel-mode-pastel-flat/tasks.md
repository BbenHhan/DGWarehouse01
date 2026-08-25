---

description: "Task list for Pixel Mode — Pastel Palette, Flat Fills"

---

# Tasks: Pixel Mode — Pastel Palette, Flat Fills

**Input**: Design documents from `/specs/036-pixel-mode-pastel-flat/`

**Tests**: No new Vitest coverage — pure CSS change.

---

## Phase 1: User Story 1 - Pixel mode's colors read as flat, distinct, pastel hues (Priority: P1) 🎯 MVP

- [X] T001 [US1] In `app/globals.css`, replace `[data-theme="pixel"]`'s `--primary`/`--primary-foreground`/`--secondary`/`--accent`/`--ring`/`--primary-2`/`--gold` with pastel values
- [X] T002 [US1] In `app/globals.css`, replace `[data-theme="pixel"]`'s nine `--room-N-bg`/`--status-X-bg` (and `--pixel-box-bg`) with pastel equivalents of the same nine hue assignments
- [X] T003 [US1] In `app/globals.css`, add `[data-theme="pixel"] .bg-gradient-to-r, [data-theme="pixel"] .bg-gradient-to-br { background-image: none; background-color: var(--primary); }` — explicitly excluding `.bg-gradient-to-t` (`PhotoGrid`'s unrelated hover scrim)

**Checkpoint**: Pixel mode shows flat pastel colors everywhere a primary-color gradient used to appear; photo hover captions are unaffected.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T004 [P] Run `npx tsc --noEmit`
- [X] T005 [P] Run `npx next lint`
- [X] T006 [P] Run `npm test`
- [X] T007 Dev-server visual check via `getComputedStyle` on a public page: confirm all pastel values resolve correctly and that `PhotoGrid`'s `.bg-gradient-to-t` class is untouched by the new rule
