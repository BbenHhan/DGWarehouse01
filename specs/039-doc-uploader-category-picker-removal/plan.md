# Implementation Plan: Remove the Redundant Category Picker from Document Upload

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

`DocUploader.tsx` drops its category `Select` and `categoryOptions` prop entirely; every upload uses `categoryId` (the current page's own category) directly. `DocList`'s separate per-document "move to a different category" editor (`EditModal`) is untouched — it's a different control for a different scenario (recategorizing after the fact).

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Testing**: No new Vitest coverage — UI simplification.

**Scale/Scope**: `components/DocUploader.tsx` (remove picker + prop), `app/(app)/documents/[categorySlug]/page.tsx` (stop passing `categoryOptions` to it — `categoryMoveOptions` still computed and passed to `DocList` as before).

## Constitution Check

No violations — pure removal of a redundant control.

## Project Structure

```text
specs/039-doc-uploader-category-picker-removal/
├── plan.md
└── tasks.md

components/DocUploader.tsx                        # MODIFIED — category Select + categoryOptions prop removed; uploads always use categoryId
app/(app)/documents/[categorySlug]/page.tsx        # MODIFIED — stops passing categoryOptions to DocUploader
```
