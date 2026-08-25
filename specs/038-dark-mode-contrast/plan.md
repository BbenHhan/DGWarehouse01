# Implementation Plan: Dark Mode Contrast Fix

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Give `.dark`'s nine room/status CSS variables (specs/032/034/036) their own dark-appropriate values (deep-toned backgrounds, lighter-but-muted text) instead of the Light-mode pastel values they currently duplicate, plus a small brightening pass on `--muted-foreground`/`--border` for general text legibility.

## Technical Context

**Language/Version**: CSS only (`app/globals.css`).

**Testing**: No new Vitest coverage — visual/contrast tuning.

**Constraints**: Must stay muted/dark, not introduce neon colors (spec FR-003); must not affect Light/Minimal/Pixel.

**Scale/Scope**: One `app/globals.css` edit (`.dark` block's room/status variables + two general tokens).

## Constitution Check

No violations — CSS-variable-only change, same architecture as specs/033/034/036.

## Project Structure

```text
specs/038-dark-mode-contrast/
├── plan.md
└── tasks.md

app/globals.css   # MODIFIED — .dark's room/status vars get dark-appropriate values; --muted-foreground/--border brightened slightly
```
