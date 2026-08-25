# Implementation Plan: Pixel Mode Palette & Staircase Corners

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Pixel mode (specs/033) gets its final, mockup-approved look: staircase clip-path corners on cards/badges, a bold blue/yellow palette with a pastel-yellow page background, and nine mutually-distinct colors (3 status + 6 rooms) that now vary by theme instead of being fixed everywhere — all through CSS variables and one new stable class, no per-component color logic.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 / Tailwind CSS v4.

**Primary Dependencies**: None new.

**Storage**: N/A — CSS/component-class only.

**Testing**: No new Vitest coverage — pure CSS/visual change.

**Target Platform**: Same app, Pixel mode specifically (other 3 modes get the same room/status colors they already had, just now expressed as variables).

**Constraints**: Must not change Light/Dark/Minimal's existing room/status colors (spec FR-007) — this is additive/Pixel-scoped only.

**Scale/Scope**: One CSS file edit (new variables + clip-path + one new selector), one `lib/room-colors.ts` rewrite (same shape, new class strings), one small `RoomChecklistBox.tsx` className addition.

## Constitution Check

- **I. App Router Only**: ✅ No new routes.
- **VI. Tailwind-Only Styling**: ✅ Arbitrary-value Tailwind classes (`bg-[var(--room-1-bg)]`) reference CSS variables, not inline styles; `clip-path` lives in `globals.css`, not a component `style` prop.
- **VII. Multi-User Auth with RBAC**: N/A — visual only.
- Others: N/A, unaffected by this feature.

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/034-pixel-mode-refresh/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (repository root)

```text
app/globals.css                     # MODIFIED — 9 room/status vars per theme, clip-path on Pixel's shared selectors, .checklist-box override
lib/room-colors.ts                  # MODIFIED — class strings now reference the new CSS variables
components/RoomChecklistBox.tsx     # MODIFIED — outer container gains the `checklist-box` class
```

**Structure Decision**: Same minimal-footprint, CSS-variable-driven approach as specs/033 — no new component files.
