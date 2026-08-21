# Feature Specification: Mobile Upload Remove Photo

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: "version mobile upload รูป ไม่มีให้กดลบรูปอ่ะ เผื่อ user เลือกผิดรูป" — the mobile swipe-card review flow on the bulk `/upload` page has no way to discard a wrongly-picked file; the equivalent desktop flow (`UnsortedFileTray.tsx`) already has a remove/trash button per file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discard a wrongly-picked photo on mobile (Priority: P1)

**Why this priority**: Picking the wrong photo from a camera roll is a routine, expected mistake — without a way to remove it, the only workaround is uploading it anyway into some bin and deleting it afterward from the room/work-type page, which is both extra work and briefly puts a wrong photo live.

**Independent Test**: On the mobile swipe-card view, open a card for any not-yet-sorted file; confirm a remove/discard action is available; use it; confirm the file disappears from the tray without being uploaded anywhere.

**Acceptance Scenarios**:

1. **Given** the current card in the mobile swipe view, **When** its remove action is used, **Then** that file is discarded from the tray (not uploaded to any room/work-type).
2. **Given** a file is removed, **When** the swipe view re-renders, **Then** it shows the next remaining file (or the previous one if the removed file was last), never a blank/broken state.
3. **Given** the tray becomes empty after removing the last file, **When** the view re-renders, **Then** the existing "ยังไม่มีไฟล์" empty state shows, same as when the tray starts empty.

### Edge Cases

- Removing a file that was already added to one or more room/work-type bins (via the "เพิ่มรูปนี้เข้าห้อง/หมวดนี้" action) only removes it from the tray going forward — it does not undo any already-completed upload to those bins (consistent with desktop's existing remove behavior, which has the same non-retroactive semantics).

## Requirements *(mandatory)*

- **FR-001**: The mobile swipe-card view MUST offer a way to remove the currently-shown file from the tray without uploading it.
- **FR-002**: Removing a file MUST NOT affect any room/work-type bin it was already successfully added to before removal.
- **FR-003**: After a removal, the view MUST show a valid remaining card (or the empty state if none remain) — never an out-of-bounds or blank card.

## Success Criteria *(mandatory)*

- **SC-001**: A wrongly-picked photo can be discarded on mobile in one action, with zero photos ever uploaded as a result of that mistake.

## Assumptions

- Reuses `BulkUploadWorkspace.tsx`'s existing `removeFile` function (already used by the desktop tray, already wired to `lib/upload-tray-db.ts`'s persistence from Feature 022) — no new removal logic needed, only a new call site on mobile.
