# Data Model: Pixel Mode Palette & Staircase Corners

No database schema — CSS/component-class changes only.

## `app/globals.css`

- `:root` (Minimal), `[data-theme="light"]`, `.dark` (Dark) each gain the same nine room/status variables, set to today's existing hardcoded values (research.md Decision 1) — visually unchanged from before this feature.
- `[data-theme="pixel"]` gains:
  - `--background: #fffbeb` (pastel yellow), `--primary: #3b82f6` (blue), `--primary-foreground: #ffffff`, `--secondary: #facc15` (yellow), `--secondary-foreground: #1a1a1a`.
  - `--room-1-bg: #3b82f6` (ห้องแรก) / `--room-2-bg: #ec4899` (ห้องกลาง) / `--room-3-bg: #a78bfa` (ห้องซอย 1) / `--room-4-bg: #22d3ee` (ห้องซอย 2) / `--room-5-bg: #f87171` (ห้องซอย 3) / `--room-6-bg: #2dd4bf` (ห้องซอย 4) — `--room-N-fg: #1a1a1a` for all six (research.md Decision 1, spec FR-004).
  - `--status-todo-bg: #94a3b8`, `--status-progress-bg: #fb923c`, `--status-done-bg: #4ade80` — `-fg: #1a1a1a` for all three.
  - `--pixel-box-bg: #fde047` (deeper yellow than the page background, for `.checklist-box`).
- The existing Pixel supplementary rule (specs/033) gains `clip-path` (research.md Decision 2): an 8px-step polygon on `.rounded-xl`/`.rounded-2xl`, a 4px-step polygon on `.rounded-full`.
- New: `[data-theme="pixel"] .checklist-box { background-color: var(--pixel-box-bg); }` (research.md Decision 3).

## `lib/room-colors.ts`

- `ROOM_COLORS` (keyed by slug, unchanged keys) — each entry's `chip`/`row`/`select` strings become `bg-[var(--room-N-bg)] text-[var(--room-N-fg)]` (plus `border-[var(--room-N-fg)]` where a border class existed) instead of literal Tailwind palette classes.
- `STATUS_COLORS` — same shape, `badge`/`select` become `bg-[var(--status-X-bg)] text-[var(--status-X-fg)]`.
- `FALLBACK_ROOM_COLOR` unchanged (still the neutral `bg-secondary` fallback — this becomes theme-correct for free, since `--secondary` is already themed per specs/033).

## `components/RoomChecklistBox.tsx`

- Outer container's `className` gains `checklist-box` alongside its existing `colors.row` class (research.md Decision 3) — no other logic change.
