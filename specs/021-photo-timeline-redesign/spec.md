# Feature Specification: Photo Timeline Redesign

**Feature Branch**: `main`

**Created**: 2026-08-11 (retroactively documented 2026-08-21)

**Status**: Implemented

**Input**: Direct account-holder feedback on the just-shipped Feature 018 room/work-type page: (1) having both a date-range filter and a separate per-room upload date box on the same page was confusing — "ให้กล่อง upload ออกไปเลย ใช้ upload ได้แค่หน้าอัปโหลดหลายไฟล์" (remove the upload box; uploading should only happen on the dedicated bulk-upload page); (2) the default browsing view should be a horizontal, scrollable timeline mapped across dates — "เส้นเวลาแนวนอนอีกแบบ (scroll ดูตามเส้น)" — not a plain masonry grid, with the existing date-range filter still narrowing it down when used.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload only happens in one place (Priority: P1)

**Why this priority**: Having two different date-entry points on the same screen (a filter for browsing, a picker for uploading) was the account holder's first, clearest complaint — it made the page's purpose ambiguous.

**Independent Test**: Open a room/work-type page; confirm no file-upload control is present; confirm the bulk `/upload` page (Feature 015/018) remains the sole place to add photos, still reachable from the sidebar/account menu.

**Acceptance Scenarios**:

1. **Given** a room/work-type page, **When** it loads, **Then** no "add file" control appears on it.
2. **Given** the sidebar or account menu, **When** an editor looks for how to upload, **Then** the link to `/upload` is still present and unchanged.

### User Story 2 - Photos default to a horizontal, scrollable date timeline (Priority: P1)

**Why this priority**: The core ask — replace the flat masonry grid with a layout that visually reads as a timeline the viewer scrolls sideways through.

**Independent Test**: Open a room/work-type page with photos across several distinct dates; confirm photos are grouped into date columns laid out left-to-right (most recent leftmost, consistent with Feature 018's existing "most recent first" ordering), each column headed by its Thai-formatted date and file count, scrollable horizontally.

**Acceptance Scenarios**:

1. **Given** photos across 3+ distinct dates, **When** the page loads with no filter, **Then** each date appears as its own column, ordered most-recent-first left to right.
2. **Given** the existing date-range filter (Feature 018) is used, **When** a range is set, **Then** the timeline only shows columns for dates within that range — the filter is unchanged, only the layout beneath it changed.
3. **Given** a room/work-type with only one date's worth of photos, **When** the page loads, **Then** a single column renders correctly (no broken layout for the single-group case).

### Edge Cases

- Every existing per-photo action (open/lightbox, edit, delete) must keep working identically inside the new column layout — this is a layout change, not a functional one.

## Requirements *(mandatory)*

- **FR-001**: The room/work-type page MUST NOT include a file-upload control.
- **FR-002**: Photos MUST be grouped into consecutive same-date columns and laid out for horizontal scrolling, ordered most-recent-first.
- **FR-003**: The existing date-range filter (Feature 018) MUST continue to narrow what's shown, applied before the grouping/layout step.
- **FR-004**: Every existing photo-level action (preview/lightbox, edit, delete) MUST be unaffected by the layout change.

## Success Criteria *(mandatory)*

- **SC-001**: A room/work-type page never shows more than one place to start an upload (zero, specifically — the page itself has none).
- **SC-002**: A viewer can visually scan which dates have photos by scrolling sideways, without opening any filter.

## Assumptions

- Constitution VIII ("every data-bearing module needs a working add-file control") is still satisfied at the module level via `/upload`, which already lets an editor pick any room/work-type — removing the room-page-local control is not a removal of upload capability, only a relocation of its single entry point.
