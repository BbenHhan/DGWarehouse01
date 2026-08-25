---

description: "Task list for Dark Mode Contrast Fix"

---

# Tasks: Dark Mode Contrast Fix

**Input**: Design documents from `/specs/038-dark-mode-contrast/`

**Tests**: No new Vitest coverage.

---

## Phase 1: User Story 1 - Every room/status color is legible and comfortable in Dark mode (Priority: P1) 🎯 MVP

- [X] T001 [US1] In `app/globals.css`, replace `.dark`'s nine `--room-N-bg`/`--room-N-fg`/`--room-N-border` and `--status-X-bg`/`-fg`/`-border` values with dark-appropriate tones (deep-toned hue-900-ish backgrounds, hue-300-ish text) instead of Light's pastel values
- [X] T002 [US1] In `app/globals.css`, brighten `.dark`'s `--muted-foreground` and `--border` slightly for general text/outline legibility

**Checkpoint**: Dark mode's colors are legible and calm, not glaring.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T003 [P] Run `npx tsc --noEmit`
- [X] T004 [P] Run `npx next lint`
- [X] T005 [P] Run `npm test`
- [X] T006 Dev-server visual check via `getComputedStyle`: computed WCAG contrast ratios for all 8 room/status pairs plus `--muted-foreground` on `--secondary` — all between 5.06:1 and 6.47:1 (comfortably above the 4.5:1 minimum for normal text), using deep jewel-tone backgrounds (not neon), confirming both FR-002 (contrast) and FR-003 (no glare) at once
