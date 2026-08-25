---

description: "Task list for Multi-Theme System"

---

# Tasks: Multi-Theme System

**Input**: Design documents from `/specs/033-multi-theme-system/`

**Tests**: No new Vitest coverage — see plan.md Testing.

---

## Phase 1: User Story 1 - Pick a look that actually feels put together (Priority: P1) 🎯 MVP

- [X] T001 [US1] Update `app/layout.tsx`: add the `Mitr` `next/font/google` loader (`--font-mitr`, weights 400/500/600, subsets `thai`/`latin`); add the inline anti-flash `<script>` reading `localStorage["dg-theme"]` (default `"minimal"`) and setting `data-theme`/`class="dark"` on `<html>` before children render; added `suppressHydrationWarning` on `<html>` (expected mismatch for a client-injected pre-hydration attribute)
- [X] T002 [US1] Rewrite `app/globals.css`: `:root` becomes Minimal's palette (default); add `[data-theme="light"]` (Clean Slate), update `.dark` to Site Ops's palette, add `[data-theme="pixel"]` (inherits Minimal's colors, overrides only `--border`/`--radius`); add the `[data-theme="minimal"] body, [data-theme="pixel"] body` Mitr font rule; add the Pixel-mode supplementary chunky-border/hard-shadow rule scoped to `.rounded-xl`/`.rounded-2xl` (research.md Decision 4)

**Checkpoint**: All 4 themes exist and are selectable by manually setting `data-theme`/`class` in devtools; visuals match the approved mockups.

---

## Phase 2: User Story 2 - Switch modes from the header, next to the account menu (Priority: P1)

- [X] T003 [US2] Create `components/ThemeSwitcher.tsx`: `DropdownMenu` (reusing `components/ui/dropdown-menu.tsx`, same pattern as `AccountMenu`) listing all 4 modes, current one marked, writing `localStorage["dg-theme"]` and updating `<html>`'s `data-theme`/`dark` class on selection
- [X] T004 [US2] Update `components/Header.tsx`: render `<ThemeSwitcher />` immediately before `<AccountMenu />`

**Checkpoint**: The header control switches all 4 modes live, with the choice surviving a reload.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T005 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T006 [P] Run `npx next lint` — no warnings or errors
- [X] T007 [P] Run `npm test` — 7 files, 42 tests, all passed
- [X] T008 Dev-server visual check: confirmed via live `getComputedStyle` on `/login` (public, no auth needed) that all 4 `data-theme` values resolve the exact designed `--background`/`--primary`/`--border`/`--radius`/body font pairs with no console errors from this feature's own code (an unrelated stale error in the tab's console buffer, from an earlier mid-edit moment on `components/RoomChecklistBox.tsx`, was confirmed gone by re-reading the current file and by clean `GET` 200s in the dev-server access log — not a real regression)

---

## Dependencies & Execution Order

- **US1 (Phase 1)**: No dependencies — the theme system itself must exist before it can be switched.
- **US2 (Phase 2)**: Depends on US1 (the CSS blocks/attributes it toggles must already exist).
- **Polish (Phase 3)**: Depends on everything else.
