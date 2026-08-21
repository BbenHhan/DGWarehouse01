# Feature Specification: Per-Photo Dates (Replace Week Date-Ranges)

**Feature Branch**: `main` (no feature branch — this project ships features directly to `main`, per established repo convention)

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Replace the pre-created 'week' date-range container for photos with a single exact date on each photo, chosen at upload time and defaulting to today. Browsing shows a chronological list with an optional date-range filter instead of week tabs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a photo without creating anything first (Priority: P1)

Someone adding progress photos for a room/work-type today just wants to upload — not first decide what date range a not-yet-existing container should cover, name it, save it, and only then be allowed to add files. They pick (or accept the default of) today's date and upload; the photo is saved with that exact date, done.

**Why this priority**: This removes the single biggest friction point driving the request — the account holder explicitly said the two-step "create a week, then upload into it" flow was hard to manage and prone to confusing date-range conflicts. Without this, nothing else in the feature matters.

**Independent Test**: On a room/work-type page (or the bulk `/upload` page), upload a photo with no pre-existing container of any kind for that room/work-type, confirm it succeeds in one step and the photo is saved with the date that was showing at upload time.

**Acceptance Scenarios**:

1. **Given** a room/work-type with no photos yet, **When** someone opens its page and uploads a photo without changing the date field, **Then** the upload succeeds immediately and the photo is stored with today's date — no separate "create a container" step occurred.
2. **Given** the same situation, **When** the uploader changes the date field to a different date before confirming, **Then** the photo is stored with that chosen date instead of today.
3. **Given** the bulk `/upload` page's multi-file sorting flow, **When** files are sorted into a room/work-type bin with a chosen date, **Then** every file in that bin is saved with that single date — no date-range or overlap check blocks the upload.

---

### User Story 2 - Browse a room/work-type's photos in order, or narrow to a date range (Priority: P1)

Someone checking progress wants to see a room/work-type's photos in the order they were taken, without first picking which "week" to look at. Most of the time they want everything; sometimes they want to narrow to a specific date range (e.g., "what happened between these two dates").

**Why this priority**: This is the other half of the core value — the account holder specifically asked that viewing show "every day, or a chosen date range," replacing the current one-week-at-a-time tab view. Without it, User Story 1's photos would have nowhere sensible to be seen.

**Independent Test**: With several photos at different dates under one room/work-type, open that room/work-type's page with no filter applied and confirm every photo appears in date order; then apply a date-range filter and confirm only photos within that range remain visible.

**Acceptance Scenarios**:

1. **Given** a room/work-type with photos across several different dates, **When** its page is opened with no filter set, **Then** every one of that room/work-type's photos is shown, ordered newest-first (or oldest-first — most recent activity visible without scrolling).
2. **Given** the same page, **When** a viewer sets a start and end date in the filter, **Then** only photos whose date falls within that range (inclusive) remain visible, and the total count shown reflects the filtered set.
3. **Given** a date-range filter is active, **When** the viewer clears it, **Then** the full unfiltered list returns.
4. **Given** a room/work-type with zero photos, **When** its page is opened, **Then** an empty state is shown (not an error), same as today's "no weeks yet" empty state.

---

### User Story 3 - Fix a photo's date or move it after the fact (Priority: P2)

A photo occasionally needs its date corrected (mis-picked at upload time) or needs to move to a different room/work-type, the same way editing already works today.

**Why this priority**: Important for data accuracy but not blocking — the core upload/browse flow (US1/US2) delivers the main value even before this exists, since a wrong date can currently be fixed by deleting and re-uploading.

**Independent Test**: Edit an existing photo's date and confirm it now appears in the correct position/filter range; edit its room/work-type and confirm it now appears under the new location and no longer the old one.

**Acceptance Scenarios**:

1. **Given** an existing photo, **When** an editor changes its date through the existing edit action, **Then** the photo immediately reflects the new date everywhere it's shown (ordering, filter matching).
2. **Given** an existing photo, **When** an editor moves it to a different room/work-type (the existing "move to" capability), **Then** it disappears from the original room/work-type's list and appears in the new one, keeping its date.

---

### Edge Cases

- What happens when someone picks a date in the future? Allowed — the same as today's week date-range picker already permits future dates (e.g., planning ahead); no new restriction is introduced.
- What happens when a date-range filter's start is after its end? Treated as no valid range — behave as if no filter is applied, rather than showing an error or an empty result the viewer didn't intend.
- What happens to the "move to" list that today shows every existing week across every room/work-type (for moving a photo)? It becomes a room/work-type picker instead (no week to choose, since none exist anymore) — the photo keeps its own date when moved.
- What happens to admin cadence configuration (Feature 016, `/admin/cadence`) and the recurring-period generator it was built on? Removed entirely — it existed solely to make picking a week date **range** easier and to avoid range-overlap conflicts, both of which stop being relevant once each photo has one exact date and there is no range/overlap concept left to conflict.
- What happens to the bulk `/upload` page's existing per-file room/work-type "bin" sorting? Unchanged — files still get dragged/swiped into room+work-type bins; only what happens *after* a bin is chosen changes (a date is attached directly instead of a week being resolved/created).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every photo MUST have exactly one date, chosen at the moment it is uploaded, defaulting to the current date if the uploader doesn't change it.
- **FR-002**: Uploading a photo MUST NOT require creating, selecting, or resolving any separate date-range container beforehand — a room and work-type (already required today) plus a date are sufficient.
- **FR-003**: A room/work-type's photo view MUST, by default, show every photo belonging to that room/work-type, ordered by date (most recent first).
- **FR-004**: A room/work-type's photo view MUST offer an optional date-range filter (start date, end date, both optional/clearable) that, when set, narrows the shown photos to those whose date falls within the range (inclusive of both ends).
- **FR-005**: Clearing an active date-range filter MUST restore the full, unfiltered photo list for that room/work-type.
- **FR-006**: An editor MUST be able to change an existing photo's date after upload, with the change reflected immediately in ordering and any active filter.
- **FR-007**: An editor MUST be able to move an existing photo to a different room/work-type, same as today, without needing to also resolve or pick a week/container in the destination.
- **FR-008**: The system MUST NOT perform any date-range overlap validation when saving a photo's date — overlap conflicts were a property of the removed week-container model and have no equivalent here.
- **FR-009**: The document module (categories/documents, unrelated to photos) MUST be unaffected by this change — no date field, behavior, or UI is added to it.
- **FR-010**: Every existing capability that isn't specifically about week date-ranges (room/work-type navigation, photo upload validation limits, photo delete, photo edit's note/rename, role-based edit permissions) MUST continue to work exactly as it does today.
- **FR-011**: The admin-only cadence/recurring-period configuration screen and its underlying settings MUST be removed, since it configured a capability (week date-range generation) that no longer exists.

### Key Entities

- **Photo**: An existing concept, now carrying its own single date (in addition to its existing room, work type, storage path, file name, and note) instead of belonging to a week. The date is the sole date/time-organizing attribute going forward.
- **Room / Work Type**: Unchanged — the fixed lookup lists photos are organized under; this feature only changes how photos *within* a room+work-type are organized and browsed, not the room/work-type structure itself.
- **Week** *(removed)*: The pre-created date-range container this feature eliminates. Nothing in the new model replaces it as a stored entity — a "week" going forward is purely a way of describing a date range when filtering, not a thing that is created, named, or referenced by id.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can upload a photo to any room/work-type in one step (choose files, confirm date, upload) with zero prerequisite setup steps, versus today's two-step "create a week, then upload" flow.
- **SC-002**: Zero upload attempts fail due to a date-range conflict, since no such conflict can exist in the new model (previously a recurring source of confusing errors, per the account holder's direct feedback this session).
- **SC-003**: A viewer can go from "open a room/work-type" to "see every one of its photos in date order" with no additional clicks, and can narrow to a specific date range in at most two field entries (start, end).
- **SC-004**: 100% of a room/work-type's photos remain reachable through either the unfiltered view or some date-range filter — none become permanently hidden or orphaned by the removal of week containers.

## Assumptions

- No production photo/week data exists to migrate at the time of this change (confirmed: both tables are empty following an earlier full data reset this session) — this is a schema replacement, not a data migration exercise.
- "Today" for the default upload date means the account holder's local calendar date in their own timezone, consistent with how date fields already behave elsewhere in the app (e.g., `WeekPeriodPicker`'s existing local-date handling).
- A date-range filter with only a start date (no end) means "from that date onward, through today/whatever is latest"; only an end date (no start) means "up through that date, from the earliest available." Both-empty means unfiltered.
- Removing the cadence/recurring-period admin screen (`/admin/cadence`) is acceptable data loss for its own settings, since those settings only ever configured week date-range generation, which no longer exists; the account holder was not asked to separately confirm discarding that specific screen's data because it has no purpose independent of weeks.
- The existing role model (viewer/editor/admin) and its permissions around who can upload/edit/delete photos are unchanged by this feature.
