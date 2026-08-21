# Implementation Plan: Mobile Upload Remove Photo

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

`MobileSwipeCard.tsx` gains an `onRemove: (fileId: string) => void` prop (`BulkUploadWorkspace.tsx`'s existing `removeFile`, already passed to desktop's `UnsortedFileTray`) and a remove button rendered near the card's navigation controls. Removing the current card clamps the visible index the same way navigation already does (the component's existing `clampedIndex` logic already handles the list shrinking out from under the current index — no new index-management logic needed beyond calling the existing clamp effect after a removal).

## Technical Context

**Language/Version**: TypeScript / React 19.

**Primary Dependencies**: `lucide-react`'s `Trash2` icon (already used elsewhere, e.g. `PhotoGrid.tsx`'s delete button) for visual consistency with the desktop remove affordance.

**Testing**: No new Vitest coverage — this is a prop/callback wiring change with no new pure logic (the index-clamping logic already exists and is already exercised by navigation).

**Constraints**: Must not disturb the existing swipe/drag-to-navigate gesture handling — the remove button must be a distinct tap target, not overlapping the swipe area.

## Constitution Check

- **V. Resilient Async UX**: N/A directly (removal here is a pure client-side tray operation, not a network mutation — no loading state needed, matching the desktop tray's identical remove button).
- Everything else: N/A.

No violations.

## Project Structure

```text
components/
├── MobileSwipeCard.tsx        # MODIFIED — new onRemove prop, remove button
└── BulkUploadWorkspace.tsx    # MODIFIED — pass existing removeFile to MobileSwipeCard's new onRemove prop
```
