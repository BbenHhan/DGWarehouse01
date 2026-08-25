# Implementation Plan: Pixel Mode — Pastel Palette, Flat Fills

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Two CSS-only changes to `[data-theme="pixel"]`: replace specs/034's bold-saturated nine-color palette (plus `--primary`/`--secondary`) with pastel equivalents, and add a targeted rule flattening the app's `from-primary`-style gradient classes to a flat `--primary` fill in Pixel mode only — carefully excluding the one same-family gradient class (`bg-gradient-to-t`) that's actually an unrelated photo-caption scrim, not a primary-color accent.

## Technical Context

**Language/Version**: CSS only (`app/globals.css`).

**Primary Dependencies**: None.

**Storage**: N/A.

**Testing**: No new Vitest coverage — pure CSS value/selector change.

**Constraints**: Must not affect `PhotoGrid`'s hover caption scrim (`bg-gradient-to-t from-black/70 …`), and must not affect Light/Dark/Minimal.

**Scale/Scope**: One `app/globals.css` edit (palette values + one new selector rule).

## Constitution Check

- **VI. Tailwind-Only Styling**: ✅ Selector-based override in `globals.css`, no inline styles, no component changes.
- Others: N/A.

No violations.

## Project Structure

```text
specs/036-pixel-mode-pastel-flat/
├── plan.md
└── tasks.md

app/globals.css   # MODIFIED — pixel palette → pastel; gradient-flattening rule added (excludes bg-gradient-to-t)
```
