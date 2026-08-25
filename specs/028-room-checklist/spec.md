# Feature Specification: Room Checklist

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "อยากให้ user สามารถ add checklist -> user พิมพ์เองได้ แล้วก็ให้แท็คได้ด้วยว่าของห้อง เพื่อเวลากรมโรงงานมาตรวจ จะได้ add checklist เพิ่มได้เลย ตอนอยู่หน้างานจริง เพื่อที่ user ทุกคนรู้ทั่วกันว่า Task มีอะไร" — a free-text, checkable task list, optionally tagged to one or more rooms, so that during a Department of Industrial Works (กรมโรงงานอุตสาหกรรม) inspection, a to-do item can be added on the spot and every team member sees the same shared list.

Clarified with the account holder:
1. Each item has a done/not-done checkbox state.
2. Room tagging is optional; when used, an item can be tagged to more than one room at once.
3. There's a dedicated `/checklist` page listing everything, **plus** each room/work-type page shows a sidebar box of that room's not-yet-done items (positioned as a side box on desktop where space allows, and above the work-type category tabs on mobile, since that's the most useful spot to catch it before diving into photos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a task on the spot, in plain language (Priority: P1)

**Why this priority**: This is the entire point — being able to jot down an inspector's requirement immediately, in the account holder's own words, without any rigid template getting in the way.

**Independent Test**: Open `/checklist`, type a new item's text, optionally tag it to one or more rooms, save; confirm it appears in the list immediately as not-done.

**Acceptance Scenarios**:

1. **Given** the checklist page, **When** free text is typed and saved with no room tag, **Then** a new, untagged, not-done item appears in the list.
2. **Given** the same page, **When** text is typed and one or more rooms are selected before saving, **Then** the new item appears tagged with exactly those rooms.
3. **Given** an attempt to save with empty text, **When** save is attempted, **Then** it's rejected with a clear message — an item must have text.

### User Story 2 - Check items off, and see them disappear from what's still pending (Priority: P1)

**Why this priority**: A checklist that can't be marked done isn't a checklist — this is as core as adding items.

**Independent Test**: On `/checklist`, toggle an item's checkbox; confirm its state flips immediately and persists across a page reload.

**Acceptance Scenarios**:

1. **Given** a not-done item, **When** its checkbox is toggled, **Then** it becomes done immediately, with no page reload needed to see the change.
2. **Given** a done item, **When** its checkbox is toggled again, **Then** it becomes not-done again (toggling is reversible, not one-way).
3. **Given** an item is marked done, **When** a room/work-type page's checklist sidebar box is viewed for a room that item was tagged to, **Then** that item no longer appears there (the sidebar box only ever shows not-done items).

### User Story 3 - See a room's outstanding tasks right where the work happens (Priority: P1)

**Why this priority**: The whole motivation was visibility "ตอนอยู่หน้างานจริง" (right at the job site) — a checklist that only lives on a separate page defeats that purpose.

**Independent Test**: Tag an item to a specific room; open that room's `/photos/[roomSlug]/[workTypeSlug]` page (any work-type tab); confirm a checklist box appears showing that item, and that it does NOT appear on a different room's page. Separately, add a new item directly from that box without leaving the page; confirm it's automatically tagged to that room.

**Acceptance Scenarios**:

1. **Given** an item tagged to Room A only, **When** Room A's page (any work-type) is viewed, **Then** the item appears in that page's checklist box.
2. **Given** the same item, **When** Room B's page is viewed, **Then** the item does NOT appear there.
3. **Given** an item tagged to multiple rooms, **When** any of those rooms' pages are viewed, **Then** the item appears on each of them.
4. **Given** a room with zero outstanding (not-done) items, **When** its page is viewed, **Then** the checklist box either shows a clear "nothing pending" state or is hidden — never an empty confusing gap.
5. **Given** a viewport too narrow for a side-by-side layout, **When** a room's page is viewed, **Then** the checklist box appears above the work-type category tabs, not buried below the photo timeline.
6. **Given** the room checklist box itself, **When** text is typed into its own quick-add field and saved, **Then** a new item is created already tagged to that room, with no need to navigate to the sitewide `/checklist` page — this is the primary scenario the whole feature was requested for (adding a task on the spot, at the room being inspected).
7. **Given** an item shown in a room's checklist box, **When** its checkbox is toggled there directly, **Then** it's marked done without needing to visit `/checklist` first.

### User Story 4 - Untagged items are still visible to everyone, sitewide (Priority: P2)

**Why this priority**: "ทุกคนรู้ทั่วกัน" (everyone knows together) — an item with no room tag still needs a home so it isn't lost, just not on any specific room's page.

**Independent Test**: Add an item with no room tag; confirm it appears on `/checklist` but not on any room's sidebar box.

**Acceptance Scenarios**:

1. **Given** an untagged item, **When** `/checklist` is viewed, **Then** it appears there.
2. **Given** the same item, **When** any room's page is viewed, **Then** it does not appear in that room's checklist box (room boxes only show items tagged to that specific room).

### Edge Cases

- Deleting an item removes it everywhere it was shown (the main page and every room box it was tagged to) — no orphaned references.
- Editing an item's text or room tags after creation is supported the same way editing already works for photos/documents (pencil-icon edit), so a mistake or a scope change doesn't require delete-and-recreate.

## Requirements *(mandatory)*

- **FR-001**: A checklist item MUST consist of free text (required, non-empty) and an optional set of tagged rooms (zero, one, or many).
- **FR-002**: Every checklist item MUST have a done/not-done state, toggleable at any time by an editor, persisting across reloads.
- **FR-003**: A dedicated page MUST list every checklist item sitewide, regardless of room tags or done state.
- **FR-004**: Each room/work-type page MUST show a checklist box scoped to that room, listing only that room's not-done, room-tagged items, and MUST let an editor add a new item and toggle an existing item's done state directly from that box — without navigating to the sitewide page. A new item added from a room's box MUST be automatically tagged to that room.
- **FR-005**: On narrow viewports, the room checklist box MUST appear above the work-type category tabs.
- **FR-006**: Untagged items MUST appear on the sitewide list but MUST NOT appear on any room's checklist box.
- **FR-007**: Editors MUST be able to edit an existing item's text and room tags, and delete an item entirely.
- **FR-008**: Viewers MUST be able to see checklist items (sitewide page and room boxes) but MUST NOT be able to add, edit, toggle, or delete them — consistent with the existing role model (Constitution VII).

### Key Entities

- **Checklist Item**: Free text, a done/not-done flag, and a set of zero-or-more tagged rooms. Not tied to a work-type — only to rooms (or nothing).

## Success Criteria *(mandatory)*

- **SC-001**: An inspector-driven task can go from "spoken out loud" to "visible to the whole team" in well under a minute, with no setup beyond typing it.
- **SC-002**: Standing on any room's page, a person can see that room's outstanding tasks without navigating anywhere else.
- **SC-003**: Once resolved, a task visibly leaves the "still pending" view (room box) while remaining discoverable in the full sitewide history if needed.

## Assumptions

- No due dates, priorities, or assignees in this version — plain text + done state + room tags only, matching what was actually requested; can be extended later if needed.
- "Room" tagging only (not work-type) — matches the account holder's explicit wording ("แท็คได้ด้วยว่าของห้อง") and the inspection use case, which is naturally room-scoped (a physical space DIW walks through), not work-type-scoped.
