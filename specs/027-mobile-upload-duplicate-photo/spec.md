# Feature Specification: Mobile Upload Duplicate Photo

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: "Mobile Upload เพิ่มปุ่ม duplicate ข้างๆปุ่มถังขยะ ด้วยนะ" — the mobile swipe-card review flow (Feature 026 just added a remove/trash button to it) should also offer a duplicate action next to it, matching the desktop tray's existing duplicate capability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Duplicate a photo on mobile the same way desktop already can (Priority: P2)

**Why this priority**: A convenience/parity feature, not a bug or blocker — desktop already has this exact capability (`components/UnsortedFileTray.tsx`'s duplicate button, wired to `BulkUploadWorkspace.tsx`'s existing `duplicateFile`), mobile just never got the same button.

**Independent Test**: On the mobile swipe-card view, open a card for any not-yet-sorted file; confirm a duplicate action is available next to the remove action; use it; confirm a second, independent copy of that file now exists in the tray.

**Acceptance Scenarios**:

1. **Given** the current card in the mobile swipe view, **When** its duplicate action is used, **Then** a new copy of that file appears in the tray as its own independent entry.
2. **Given** a duplicated file, **When** the original is later added to a room/work-type bin or removed, **Then** the duplicate is unaffected (and vice versa) — they're fully independent from that point on, same as desktop's existing duplicate behavior.
3. **Given** the duplicate and remove actions are both visible, **When** either is used, **Then** the other remains available and correctly targets whichever file is currently shown.

## Requirements *(mandatory)*

- **FR-001**: The mobile swipe-card view MUST offer a duplicate action for the currently-shown file, positioned next to the existing remove action.
- **FR-002**: Duplicating a file MUST create a fully independent copy in the tray — no shared state with the original beyond the underlying file content.

## Success Criteria *(mandatory)*

- **SC-001**: A photo can be duplicated on mobile in one action, with the resulting copy behaving identically to a duplicate made on desktop.

## Assumptions

- Reuses `BulkUploadWorkspace.tsx`'s existing `duplicateFile` function unchanged (already used by desktop, already wired to Feature 022's IndexedDB persistence) — no new duplication logic needed, only a new call site on mobile.
