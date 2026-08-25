# Implementation Plan: Document Group Field & Pixel-Mode Control Polish

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Replace `DocUploader.tsx`'s native `<input list>`/`<datalist>` group field with a fully-styled Base UI Autocomplete (free-text input + filtered, custom-styled suggestion popup, still accepting new values), and extend Pixel mode's staircase-corner treatment (specs/033/034) to `rounded-lg`-scale controls so selects/inputs match the surrounding cards.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: `@base-ui/react/autocomplete` — already installed (same package as the existing `select`/`dialog`/`dropdown-menu` primitives), no new dependency added.

**Storage**: N/A.

**Testing**: No new Vitest coverage — UI-only change.

**Target Platform**: Same app.

**Constraints**: Must keep specs/025's free-text (type-a-new-group) behavior exactly — this is a styling fix, not a behavior change.

**Scale/Scope**: One new `components/ui/autocomplete.tsx` primitive wrapper (matching `select.tsx`'s conventions), one `DocUploader.tsx` edit, one `globals.css` selector addition.

## Constitution Check

- **VI. Tailwind-Only Styling**: ✅ `components/ui/autocomplete.tsx` follows the exact class conventions already used by `select.tsx`; the Pixel-mode fix is one added selector in `globals.css`, no inline styles.
- Others: N/A, unaffected.

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/035-select-dropdown-polish/
├── plan.md
├── research.md (skipped — no new architectural decisions beyond what's stated in spec.md's Input)
└── tasks.md
```

### Source Code (repository root)

```text
components/ui/autocomplete.tsx   # NEW — Root/InputGroup/Input/Popup/Item, styled like select.tsx
components/DocUploader.tsx        # MODIFIED — group field uses the new Autocomplete instead of <input list>/<datalist>
app/globals.css                   # MODIFIED — Pixel's chunky-border/clip-path rule extended to .rounded-lg
```

**Structure Decision**: Small, targeted fix — one new primitive component (following an existing pattern exactly) plus one CSS selector addition.
