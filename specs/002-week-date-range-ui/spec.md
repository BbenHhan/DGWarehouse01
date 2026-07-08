# Feature Specification: Week Date-Range Input & Card-Style Week UI

**Feature Branch**: `002-week-date-range-ui`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Feature: Week date-range input and card-style week UI. When adding a new week, the user must input the date range the week covers (start date and end date) — NOT a manual week order/number. There is no 'week order' field in the add-week form at all. The system determines display/sort order automatically from the date range (earliest start date first) — the user never manually assigns or edits an order number. The week timeline UI changes from small circular 'W{N}' dots to rectangular card/box elements — each box is a self-contained info card showing that week's date range (and existing info like photo count / has-photos signal), styled consistently with the app's existing card/selector components rather than a tiny circle."

## Clarifications

### Session 2026-07-07

- Q: Should two weeks in the same room/work-type be allowed to have overlapping date ranges (e.g. a re-inspection or extended period), or must the system reject overlapping submissions? → A: Must reject — overlapping/duplicate date ranges within the same room/work-type are not allowed.
- Q: Should a week have a separate free-text title/name field in addition to its date range? → A: No separate title field — the date range remains the week's whole identity in the UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a week by date range instead of order number (Priority: P1)

As the site's single user, when I add a new week to a room/work-type's progress timeline, I want to enter the date range the week covers (e.g. "8 มิ.ย. 2569 – 15 มิ.ย. 2569") instead of being asked for a week number, since the number was never meaningful to me — the date range is what I actually track progress against.

**Why this priority**: This is the core behavior change requested — without it, the rest of the feature (auto-sort, card UI) has nothing to display.

**Independent Test**: Click "add week", fill in a start date and end date (no order-number field is shown), submit, and confirm the new week appears in the timeline labeled with that date range.

**Acceptance Scenarios**:

1. **Given** a room/work-type with zero or more existing weeks, **When** I click "add week", **Then** I see a form asking only for a start date and an end date — no week-order/number input is present anywhere in the form.
2. **Given** I filled in a start date and an end date where the end date is on or after the start date, **When** I submit, **Then** a new week is created and appears in the timeline showing that date range.
3. **Given** I filled in an end date earlier than the start date, **When** I submit, **Then** the system rejects the submission with a clear error and creates nothing.
4. **Given** an existing week already covers a date range in this room/work-type, **When** I submit a new week whose date range overlaps (even partially, or exactly matches) that existing week's range, **Then** the system rejects the submission with a clear error and creates nothing.

---

### User Story 2 - Weeks always appear in date order automatically (Priority: P1)

As the user, I want the weeks in a timeline to always be ordered by the dates they cover, earliest first, without me ever having to specify or fix an order — so that adding a week "out of order" (e.g. backfilling an earlier week after later ones already exist) still displays correctly.

**Why this priority**: This is the direct replacement for the removed manual "week order" concept — without automatic ordering, the timeline would be unusable as soon as more than one week exists.

**Independent Test**: Create a week for a later date range first, then create a second week for an earlier date range, and confirm the timeline displays the earlier-dated week before the later-dated one, without any manual reordering step.

**Acceptance Scenarios**:

1. **Given** a timeline with weeks covering various date ranges, **When** the timeline is displayed, **Then** weeks are ordered by start date ascending (earliest first), regardless of the order they were created in.
2. **Given** I add a new week whose date range falls between two existing weeks, **When** the timeline re-renders, **Then** the new week appears in its correct chronological position between them.

---

### User Story 3 - Week timeline shows info cards instead of small circles (Priority: P2)

As the user, I want each week in the timeline to be shown as its own rectangular info card (showing the date range and whether it has photos/files), rather than a small circular dot with just a number in it, so the timeline is easier to read and matches the visual style of the other selector cards already used in the app (e.g. the work-type selector).

**Why this priority**: This is a visual refinement of an already-functional timeline (User Stories 1–2 must work first); it improves readability but the app is usable without it.

**Independent Test**: Open a work-type's timeline with at least one week and visually confirm each week renders as a rectangular card showing its date range and file-count/has-files signal, in the same visual family (rounded corners, border, spacing) as the work-type selector chips above it — not as a small circle.

**Acceptance Scenarios**:

1. **Given** a timeline with at least one week, **When** it renders, **Then** each week is shown as a rectangular card (not a circle) displaying that week's date range.
2. **Given** a week that has at least one uploaded photo/PDF/video, **When** its card renders, **Then** the card visibly signals "has files" (the existing gold/highlight treatment), consistent with the current has-photos indicator.
3. **Given** the currently-selected week's card, **When** the timeline renders, **Then** the selected card is visually distinguished from the others (the existing active-state treatment), matching how the currently-active work-type is distinguished among its siblings.

---

### Edge Cases

- What happens when the user leaves the start date or end date empty? The form must block submission and indicate both fields are required.
- What happens when a new week's date range overlaps with an existing week's in the same room/work-type? The submission is rejected with a clear error (see Clarifications) — no two weeks in the same room/work-type may cover overlapping or identical dates.
- What happens when a week's date range spans a very long period (e.g. a full month) or a single day (start = end)? Both must be accepted; there is no minimum or maximum span.
- What happens to weeks created before this feature existed (which have a week number and generic label but no date range)? See Assumptions — out of scope; this feature only governs newly-created weeks going forward, since no live data exists yet to migrate (the app currently starts with zero photos and zero weeks).
- What happens when the timeline has enough weeks that the cards would overflow the visible width? The existing horizontal-scroll behavior of the timeline continues to apply to the new card layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "add week" action MUST present a form requesting only a start date and an end date; it MUST NOT present any field for a manual week order, sequence number, or index.
- **FR-002**: The system MUST reject an "add week" submission where the end date is earlier than the start date, and MUST show a clear error explaining why.
- **FR-003**: The system MUST reject an "add week" submission where either the start date or end date is missing.
- **FR-004**: The system MUST determine each week's display position automatically, ordering weeks by start date ascending (earliest first), without requiring or accepting a user-supplied order value at any point (creation or edit).
- **FR-005**: The week timeline MUST render each week as a rectangular card/box (not a small circular element), and that card MUST display the week's date range as its primary content.
- **FR-006**: Each week card MUST continue to show whether that week has any uploaded files (photo/PDF/video), using the same visual signal concept the current circular dots use today (a distinct highlight state for "has files" vs "no files yet").
- **FR-007**: The week card for the currently-selected week MUST be visually distinguished from non-selected week cards.
- **FR-008**: Every capability that exists today on a week (upload photo/PDF/video into it, edit/move/delete its files, view its file count) MUST continue to work unchanged after weeks are keyed by date range instead of by order number.
- **FR-009**: The system MUST reject creation of a week whose date range overlaps (including exact duplicates) with any existing week's date range within the same room/work-type, with a clear error explaining why (see Clarifications).
- **FR-010**: Each week MUST NOT require a separate free-text title beyond its date range — the date range is the week's whole identity in the UI (see Assumptions).

### Key Entities

- **Week**: Represents a tracked period of construction progress for a specific room + work type. Key attributes: the room and work type it belongs to, a start date, an end date, and whatever files (photos/PDFs/videos) have been attached to it. No longer has a user-facing "order number" — chronological position is derived from its start date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a new week by entering only a start and end date, with zero additional required fields, in under 15 seconds.
- **SC-002**: When weeks are created in a non-chronological order (e.g. a later week before an earlier one), 100% of the time the timeline displays them in correct chronological order without any manual correction step.
- **SC-003**: Users can visually identify, within 2 seconds of looking at the timeline, which weeks have files attached versus which do not, and which week is currently selected.
- **SC-004**: 100% of existing week-scoped actions (upload, edit, move, delete) continue to succeed after this change, with no regression in any of them.

## Assumptions

- **No separate title field**: A week is identified purely by its date range in the UI; no additional free-text "week name" field is introduced (confirmed via Clarifications). If the user wants a short label in addition to dates later, that is a separate, additive change.
- **Overlap check scope**: The overlap rejection (FR-009, confirmed via Clarifications) is scoped to weeks within the same room + work-type combination only — the same date range is fine across different rooms or different work-types, since those are independent timelines.
- **No migration needed**: The app currently starts with zero photos and zero weeks (per the prior "start empty" pivot), so there is no existing week data using the old order-number scheme that needs to be migrated or reinterpreted as date ranges.
- **Default selection**: When a timeline loads without a specific week selected, the most recently-dated week (latest start date) is selected by default, matching today's "last item" default behavior.
- **Tie-breaking**: If two weeks somehow share the exact same start date, they are secondarily ordered by creation time (oldest first), purely as a stable, deterministic tie-break — not a user-facing concept.
- **Date input mechanism**: Standard date-picker inputs are used for start/end date entry; no custom calendar widget is required beyond what the platform provides.
- **Existing storage backend behavior is out of scope**: This feature only changes what a "week" contains and how it's ordered/displayed — it does not change which storage backend (local/mock/Supabase) is active or how files are uploaded/stored.
