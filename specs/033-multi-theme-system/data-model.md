# Data Model: Multi-Theme System

No database schema — this feature is entirely client-side CSS/DOM state.

## `app/globals.css`

- `:root` — redefined to Minimal's palette (warm cream/peach/pink pastel), replacing the current warm-brown default. `--radius` increases to match Minimal's rounder mockup.
- `[data-theme="light"]` — Clean Slate: off-white background, indigo `--primary`, neutral gray borders/text, smaller `--radius`.
- `.dark` — Site Ops: dark navy background, cyan `--primary`/`--ring`, light text — replaces the existing warm-brown `.dark` block's values (selector/mechanism unchanged).
- `[data-theme="pixel"]` — same palette family as Minimal, plus a supplementary rule (research.md Decision 4) thickening borders and swapping soft shadows for flat offset shadows on `.rounded-xl`/`.rounded-2xl`/`button`.
- `[data-theme="minimal"] body, [data-theme="pixel"] body { font-family: var(--font-mitr); }` (research.md Decision 3).

## `app/layout.tsx`

- Adds a second `next/font/google` loader: `Mitr` (weights 400/500/600, subsets `thai`/`latin`), variable `--font-mitr`, alongside the existing `Noto_Sans_Thai` (`--font-sans`).
- Adds an inline, synchronous `<script>` before `children` that reads `localStorage.getItem("dg-theme")` (`"light" | "dark" | "minimal" | "pixel"`, default `"minimal"`) and sets `document.documentElement.dataset.theme` and `document.documentElement.classList` (`dark` class iff mode is `"dark"`) before hydration.

## `components/ThemeSwitcher.tsx` (NEW, client component)

- Reads the current mode from `document.documentElement.dataset.theme` on mount (falls back to `"minimal"`).
- Renders a `DropdownMenu` (reusing `components/ui/dropdown-menu.tsx`, same pattern as `AccountMenu`) with 4 items — Light/Dark/Minimal/Pixel — the active one marked.
- On selection: writes `localStorage.setItem("dg-theme", mode)`, updates `document.documentElement.dataset.theme` and the `dark` class directly (no reload/navigation needed — FR-004's "no partially-updated flash" is satisfied by this being a synchronous DOM update covering the whole document at once, since every component's colors resolve from the same CSS variables).

## `components/Header.tsx`

- Renders `<ThemeSwitcher />` immediately before `<AccountMenu />` (FR-003's placement).
