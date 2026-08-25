# Implementation Plan: Multi-Theme System

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Four selectable visual modes (Light/Dark/Minimal/Pixel) implemented entirely as CSS custom-property overrides on the app's existing shadcn-style token layer, switched via a new header control and persisted to `localStorage`, with an inline pre-hydration script to avoid a flash of the wrong mode.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 / Tailwind CSS v4.

**Primary Dependencies**: None new — `next/font/google` (already used) for the added Mitr font; existing `components/ui/dropdown-menu.tsx`.

**Storage**: `localStorage` only (spec Assumptions — no server-side/account-level persistence).

**Testing**: No new Vitest coverage — this is CSS/DOM behavior with no pure logic to unit test; verified via `tsc`/`lint`/dev-server visual check across all 4 modes.

**Target Platform**: Same Next.js app, every existing page (theming is global, not page-specific).

**Constraints**: Must not require touching every component file's className (research.md Decision 1) — the whole point is that the existing token architecture already makes this a CSS-only change.

**Scale/Scope**: One CSS file rewrite (4 theme blocks + 1 supplementary Pixel rule), one new font loader, one new client component, one Header edit.

## Constitution Check

- **I. App Router Only**: ✅ No new routes.
- **II. Server Actions & Supabase Client Boundary**: N/A — no server mutation involved (client-only preference).
- **IV. Thai-First, Mobile-First**: ✅ Mitr/Noto Sans Thai both cover the `thai` subset; switcher labels in Thai.
- **V. Resilient Async UX**: N/A — synchronous, no network round-trip.
- **VI. Tailwind-Only Styling**: ✅ Every theme is CSS-variable-driven through Tailwind's existing token classes; the one supplementary Pixel rule (research.md Decision 4) is global CSS in `globals.css`, not a component inline style.
- **VII. Multi-User Auth with RBAC**: N/A — theme is a device preference, not an authorization concern; available to every role including viewers.
- **VIII. Universal File Attachments**: N/A.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/033-multi-theme-system/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── globals.css      # MODIFIED — 4 theme blocks replace the current :root/.dark pair
└── layout.tsx        # MODIFIED — adds the Mitr font loader + anti-flash inline script

components/
├── ThemeSwitcher.tsx  # NEW — header dropdown, 4 modes
└── Header.tsx          # MODIFIED — renders ThemeSwitcher before AccountMenu
```

**Structure Decision**: Minimal-footprint change leaning entirely on the app's existing CSS-variable architecture — no other component files need edits.
