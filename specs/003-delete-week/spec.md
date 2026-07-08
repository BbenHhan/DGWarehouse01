# Feature Specification: Delete Week

**Feature Branch**: `003-delete-week`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Feature: Delete Week. Add a delete button for weeks, alongside the existing per-file delete (photos/PDFs/videos already have delete buttons) and the existing 'add week' button. A week may contain zero or more uploaded files at the time of deletion. Deleting must go through the same confirm-before-destructive-action pattern already used for deleting an individual photo/document. If the week being deleted is the one currently selected/being viewed, the UI must not end up in a broken state — some other week (or the empty-state view) must become the new selection after deletion. Must work for the currently-active 'local' storage backend and remain consistent with the (not-yet-live) Supabase backend's contract."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete an empty week (Priority: P1)

As the site's single user, when I've created a week by mistake (e.g. wrong dates) and it has no files in it yet, I want to delete it so my timeline doesn't accumulate junk entries I can never remove.

**Why this priority**: This is the simplest, most common case (a just-created week with nothing in it yet) and delivers the core capability on its own.

**Independent Test**: Create a week, don't upload anything to it, delete it, confirm it disappears from the timeline and the site's week count decreases.

**Acceptance Scenarios**:

1. **Given** a week with no uploaded files, **When** I click its delete control, **Then** I see a confirmation dialog asking me to confirm before anything is deleted.
2. **Given** the confirmation dialog is open, **When** I confirm, **Then** the week is removed from the timeline immediately.
3. **Given** the confirmation dialog is open, **When** I cancel instead, **Then** nothing is deleted and the week remains exactly as it was.

---

### User Story 2 - Delete a week that has files in it (Priority: P1)

As the user, I want to be able to delete a week even if it already has photos/PDFs/videos in it (e.g. an entire week of a room/work-type that turned out to be irrelevant or was logged under the wrong week), with a clear warning that its files will be removed too — not just blocked from deleting it.

**Why this priority**: Without this, any week that ever received an upload becomes permanent, which defeats the purpose of a delete feature for a tool that's actively used to log progress and will inevitably contain mistakes.

**Independent Test**: Create a week, upload at least one file into it, delete the week, confirm both the week and its files are gone (the file no longer appears anywhere and the site's total file count decreases).

**Acceptance Scenarios**:

1. **Given** a week containing one or more files, **When** I click its delete control, **Then** the confirmation dialog clearly states that the files in this week will also be deleted (not just the week entry).
2. **Given** I confirm deletion of a week containing files, **When** the deletion completes, **Then** the week and every file that was in it are both gone — no orphaned files remain accessible anywhere in the app.

---

### User Story 3 - Deleting the currently-viewed week doesn't break the page (Priority: P2)

As the user, when I delete the week I'm currently looking at, I want the page to automatically show me a sensible week afterward (or a clear empty state if none are left), instead of showing a broken or blank screen.

**Why this priority**: This is a robustness/UX-continuity requirement on top of the core delete capability (US1/US2) — the delete action itself is more critical than what happens to the view immediately after.

**Independent Test**: Select a specific week (so it's the one currently displayed), delete that same week, confirm the page automatically switches to showing another remaining week (or the "no weeks yet" empty state if it was the last one) without any error.

**Acceptance Scenarios**:

1. **Given** the week I am currently viewing is not the only week in this room/work-type, **When** I delete it, **Then** the page automatically displays another remaining week afterward.
2. **Given** the week I am currently viewing is the only week in this room/work-type, **When** I delete it, **Then** the page shows the existing "no weeks yet" empty state afterward, with the "add week" control still available.

---

### Edge Cases

- What happens if I try to delete a week that was already deleted (e.g. a stale page open in two tabs, one deletes it, the other tries again)? The action reports that the week could not be found rather than crashing.
- What happens to the "add week" overlap rule (from 002-week-date-range-ui) after a week is deleted? Its date range becomes available again — a new week can reuse the same or an overlapping range as one that was deleted, since the deleted week's range no longer exists to overlap with.
- What happens in "mock" mode (the read-only legacy v7 snapshot)? No delete control is shown at all, matching every other mutation control (upload, edit, add-week) already hidden in that mode.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to delete a week directly from the timeline, via a control placed alongside the existing per-file delete controls and the "add week" control.
- **FR-002**: The system MUST show a confirmation dialog before deleting a week, and MUST NOT delete anything until the user explicitly confirms.
- **FR-003**: The confirmation dialog MUST indicate whether the week being deleted currently contains any files, and if so, MUST make clear that those files will be deleted along with the week.
- **FR-004**: Deleting a week MUST also delete every file (photo/PDF/video) that belonged to it — no orphaned file references may remain after deletion.
- **FR-005**: If the deleted week was the one currently being viewed, the system MUST automatically select another remaining week in the same room/work-type afterward, or show the existing empty-state view if none remain.
- **FR-006**: The delete-week control MUST NOT be shown in read-only ("mock" snapshot) mode, consistent with every other mutation control in that mode.
- **FR-007**: Attempting to delete a week that no longer exists MUST return a clear "not found" result rather than an unhandled error.
- **FR-008**: Deleting a week MUST free up its date range so a future week can be created covering the same or an overlapping range (the overlap rule only considers weeks that currently exist).

### Key Entities

- **Week**: Unchanged shape from 002-week-date-range-ui (room, work type, date range). This feature adds a delete operation on it; no new attributes.
- **Photo**: Existing entity — deleting a week now deletes every Photo whose `week_id` points at that week, alongside its underlying file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can remove an unwanted week (including all its files) in under 10 seconds from deciding to delete it to it being gone.
- **SC-002**: 100% of files belonging to a deleted week are also removed — no file from a deleted week remains viewable or accessible anywhere in the app afterward.
- **SC-003**: Deleting the currently-viewed week never leaves the page in a broken or blank state — a valid week or the empty-state view is always shown immediately after.
- **SC-004**: 0% of accidental single-click deletions occur — every week deletion requires an explicit confirmation step.

## Assumptions

- **Cascade behavior**: Deleting a week always deletes its files too (there is no "delete week but keep its files elsewhere" option) — matching how the existing Supabase schema already cascades photo deletion when a week is deleted, and how deleting a photo already deletes its underlying stored file today.
- **No soft delete / undo**: Deletion is immediate and permanent once confirmed, consistent with how photo/document deletion already works in this app (no trash/recovery feature exists for any entity today).
- **Placement**: The delete control lives on each week's card in the timeline (the same rectangular cards from 002-week-date-range-ui), not in a separate menu — matching how photo/document delete controls are already inline on their respective cards.
- **Post-delete selection order**: When the currently-viewed week is deleted, the next-selected week follows the same "most recent remaining week" default rule already used when no week is explicitly selected (from 002-week-date-range-ui).
