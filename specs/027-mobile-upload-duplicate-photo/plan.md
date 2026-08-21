# Implementation Plan: Mobile Upload Duplicate Photo

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

`MobileSwipeCard.tsx` gains an `onDuplicate: (fileId: string) => void` prop (`BulkUploadWorkspace.tsx`'s existing `duplicateFile`, already passed to desktop's `UnsortedFileTray`) and a duplicate button rendered next to Feature 026's remove button.

## Technical Context

**Language/Version**: TypeScript / React 19.

**Primary Dependencies**: `lucide-react`'s `Copy` icon (already used by `UnsortedFileTray.tsx`'s desktop duplicate button, for visual consistency).

**Testing**: No new Vitest coverage — pure prop/callback wiring, no new logic (`duplicateFile` itself is unchanged, already exercised by desktop usage).

## Constitution Check

No principle implicated — client-side tray operation, same shape as Feature 026.

No violations.

## Project Structure

```text
components/
├── MobileSwipeCard.tsx        # MODIFIED — new onDuplicate prop, duplicate button next to remove button
└── BulkUploadWorkspace.tsx    # MODIFIED — pass existing duplicateFile to MobileSwipeCard's new onDuplicate prop
```
