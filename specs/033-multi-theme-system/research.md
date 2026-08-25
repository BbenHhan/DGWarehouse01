# Research: Multi-Theme System

## Decision 1: Four CSS-variable theme blocks over the app's existing shadcn-style token set — no per-component changes needed

**Decision**: `app/globals.css` already defines every surface (`--background`, `--card`, `--primary`, `--border`, etc.) as CSS custom properties, and every component consumes them exclusively through Tailwind's semantic classes (`bg-card`, `text-foreground`, `border-border`, …) — never a raw hex or a hardcoded Tailwind palette color for chrome. Four theme blocks are added: `:root` (redefined as Minimal — the default, no attribute needed so the very first paint is already correct), `[data-theme="light"]` (Clean Slate), `.dark` (Site Ops — reusing the `.dark` class + `@custom-variant dark` mechanism already wired for Base UI's own `dark:` variants), and `[data-theme="pixel"]` (the cuter Soft Studio variant).

**Rationale**: Because the whole app already routes through this token layer, a full-app "reskin" is a CSS-only change — no component file needs to touch its own colors. Keeping `.dark` (rather than inventing a fifth mechanism for dark) means Base UI's pre-built `dark:` variants (already present in `components/ui/avatar.tsx`, `select.tsx`, `button.tsx`, etc.) activate correctly for free. Making `:root` itself the Minimal palette (rather than a `[data-theme="minimal"]` block) guarantees FR-002's "no flash of the wrong mode before JS runs" — the server-rendered HTML is already right by default.

## Decision 2: Theme choice lives in `localStorage`, applied by an inline pre-hydration script — not `next-themes`, not a server-stored preference

**Decision**: A small inline `<script>` in the root layout reads `localStorage.getItem("dg-theme")` and sets `data-theme`/`class="dark"` on `<html>` before React hydrates, mirroring the standard anti-flash pattern. `ThemeSwitcher` (a client component) reads/writes the same key and updates the DOM attributes directly on change.

**Rationale**: No new dependency needed for a 4-value preference this small (spec's own Assumptions rule out cross-device sync, so nothing server-side is required). An inline blocking script is the only way to guarantee FR-002/Edge Cases' "no flash" on a first paint that happens before any React code runs.

## Decision 3: A new Mitr font (Minimal/Pixel) alongside the existing Noto Sans Thai (Light/Dark) — swapped via a `body`-level rule, not by fighting over `--font-sans`

**Decision**: `Mitr` is loaded via `next/font/google` (same mechanism as the existing `Noto_Sans_Thai`) and exposed as `--font-mitr` on `<html>`. Rather than trying to override the existing `--font-sans` variable per theme (which next/font's own generated class also sets, at equal CSS specificity — a source-order race not worth depending on), `[data-theme="minimal"] body, [data-theme="pixel"] body { font-family: var(--font-mitr); }` targets `body` directly, a strictly higher-specificity selector than next/font's single-class rule, so it deterministically wins regardless of stylesheet order.

**Rationale**: Matches the approved mockups (Mitr's soft, rounded letterforms read as the "warm/cute" register for Minimal and Pixel; Light/Dark keep the app's existing Noto Sans Thai, matching Clean Slate/Site Ops's crisper mockup feel) without the fragility of racing two rules for the same custom property.

## Decision 4: Pixel mode's chunky borders/hard shadows are one small supplementary rule block, not per-component edits

**Decision**: `[data-theme="pixel"]` additionally gets a broad rule thickening borders and replacing soft shadows with a flat offset shadow on the app's common rounded-surface classes (`.rounded-xl`, `.rounded-2xl`, and `button`), rather than editing every card/button in every component file to add pixel-specific classes.

**Rationale**: Every card/button across the app already shares the same handful of Tailwind radius classes (confirmed by inspection — `rounded-xl border border-border/60 bg-card p-3` is the dominant card shape repeated across `ChecklistList`, `DocList`, `PhotoGrid`, etc.). A global rule keyed off those shared classes gets Pixel mode's chunky look everywhere at once, accepting that it's an approximation (some surfaces may look slightly different from the hand-tuned mockup) rather than a pixel-perfect per-component treatment, which the account holder's request didn't ask for at that level of polish.
