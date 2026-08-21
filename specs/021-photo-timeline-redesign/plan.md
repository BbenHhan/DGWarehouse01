# Implementation Plan: Photo Timeline Redesign

**Branch**: `main` | **Date**: 2026-08-11 (retroactive) | **Spec**: [spec.md](spec.md)

## Summary

Two changes to the room/work-type page delivered together since they were requested in the same feedback message: (1) `PhotoUploader` removed from `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx` and the component itself deleted (nothing else referenced it); (2) `PhotoGrid.tsx`'s layout changed from a CSS-columns masonry grid to a horizontal-scrolling flex row of date columns, built by a single-pass `groupByDate` over the already date-sorted `photos` array (no re-sort needed — the server query already orders by `date desc`). Per-photo rendering (`PhotoTileMedia`, edit/delete actions, lightbox open) was extracted into a `PhotoTile` sub-component reused unchanged inside each column, so no per-photo behavior changed — only the outer layout.

## Technical Context

**Language/Version**: TypeScript / React 19 (Next.js 15), client component.

**Primary Dependencies**: None new — reuses `lib/date-format.ts`'s `formatThaiDate` (Feature 018) for column headers.

**Testing**: No new Vitest coverage — `groupByDate` is a simple single-pass grouping over pre-sorted data, not complex enough to warrant isolated unit testing versus this project's convention of reserving tests for date-math/logic-heavy modules; verified via `tsc`/`lint`/dev-server compile.

**Constraints**: Must preserve every existing photo-level interaction (lightbox index must still map correctly across the now-grouped layout — implemented via a running index counter across columns, not a per-column-reset index).

## Constitution Check

- **IV. Thai-First, Mobile-First**: ✅ Column headers use `formatThaiDate`; horizontal scroll works via native touch scroll on mobile with no extra JS.
- **VIII. Universal File Attachments**: ✅ Satisfied at the module level via `/upload`, not per-page — see spec.md Assumptions.
- Everything else: N/A.

No violations.

## Project Structure

```text
app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx   # MODIFIED — PhotoUploader usage removed
components/
├── PhotoUploader.tsx    # DELETED — no longer referenced anywhere
└── PhotoGrid.tsx         # MODIFIED — masonry grid → horizontal date-column timeline; PhotoTile extracted as a reusable sub-component
```
