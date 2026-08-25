# Feature Specification: Checklist Detail, Dates, Status, and Room Colors

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "อยากให้ checklist มีหัวข้อก่อน แล้วใส่ detail ด้วยเพื่อขยายหัวข้อ มี startdate duedate เลือก status ว่า todo or in progress ส่วนที่ Show ใน หน้าแต่ละห้องก็ให้ขึ้นด้วยว่า due to? หรือถ้าไม่กำหนดก็ไม่ต้องขึ้น due date อยากได้แต่ละห้องเป็นคนละสีก็ดีนะจะได้ดูง่ายๆ เปลี่ยนสี UI สีโทนพาสเทลๆหน่อยก็ได้ แล้วแต่ละห้องก็แยกสีสันตัวเองได้เลย" — checklist items (and sub-items) gain an optional detail/description, an optional start date and due date, and a three-state status (Todo / In Progress / Done) that fully replaces the existing done/not-done checkbox everywhere. A room's checklist box shows the due date when one is set. Each room gets its own pastel color used throughout the checklist UI (chips, per-room rows, the room's own checklist box).

Clarified with the account holder:
1. Status replaces the checkbox entirely — three states (Todo → In Progress → Done), not an additional field alongside a separate done/not-done toggle.
2. The new fields (detail, start/due date, status) apply to both top-level items and sub-items (specs/029-checklist-subitems) — not top-level-only.
3. The pastel color direction was approved via a live mockup (room-color chips + a sample checklist card + a room checklist box) before implementation began.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Give a task real shape: detail, dates, and a working status (Priority: P1)

**Why this priority**: A bare line of text isn't enough context on its own — a title needs room to explain itself, and "done or not" was never expressive enough for work that's actually in progress.

**Independent Test**: Add a checklist item with a detail note, a start date, and a due date; confirm all three are saved and shown; change its status from Todo to In Progress to Done and confirm each transition persists.

**Acceptance Scenarios**:

1. **Given** the add-form, **When** an item is created with an optional detail note and/or start/due dates, **Then** all of them are saved and shown on `/checklist`.
2. **Given** an item or sub-item with no rooms and no sub-items of its own, **When** its status is changed, **Then** it moves directly between Todo, In Progress, and Done, and the change persists across reload.
3. **Given** an item's own status/detail/dates, **When** it's edited later (pencil icon), **Then** detail and dates can be updated the same way text and room tags already can.

### User Story 2 - A room's box shows what's due there, without clutter (Priority: P2)

**Why this priority**: Due dates matter most exactly where the work happens, but only when one was actually set.

**Independent Test**: Tag an item to a room with a due date set; confirm the room's checklist box shows that due date. Tag another item with no due date; confirm nothing date-related appears for it.

**Acceptance Scenarios**:

1. **Given** an item tagged to a room with a due date set, **When** that room's checklist box is viewed, **Then** the due date is shown alongside the item.
2. **Given** an item with no due date, **When** any room's checklist box is viewed, **Then** no due-date text appears for it at all (no placeholder, no dash).

### User Story 3 - Each room reads as its own color everywhere the checklist shows it (Priority: P2)

**Why this priority**: With per-room checkboxes/rows already in place (specs/031), a consistent color per room makes it fast to tell rooms apart at a glance instead of reading every label.

**Independent Test**: Open `/checklist` and a room's own page; confirm the same room is rendered in the same pastel color in both places (room chip, per-room status row, and the room checklist box itself).

**Acceptance Scenarios**:

1. **Given** any two different rooms, **When** their checklist rows/chips/boxes are viewed, **Then** each room has its own distinct pastel color, consistent everywhere that room appears.
2. **Given** a status badge (Todo/In Progress/Done) shown alongside a room-colored row, **When** it's viewed, **Then** the status badge uses its own fixed status color (not the room's color), so status and room identity stay visually distinguishable.

### Edge Cases

- An item with room tags or sub-items never exposes a directly-editable status control of its own — its status is always the rollup of its rooms' (or sub-items') own statuses, shown as a read-only badge (unchanged mechanism from specs/029/031, now three-way instead of boolean).
- Rollup rule: an item's derived status is Done only if every one of its rooms/sub-items is Done; Todo only if every one of them is still Todo; In Progress otherwise (i.e. anything mixed, or anything actively in progress).
- Neither detail nor dates are required fields — an item with none of them looks exactly as minimal as it does today, just with a status control instead of a checkbox.

## Requirements *(mandatory)*

- **FR-001**: A checklist item or sub-item MUST support an optional detail/description field, shown beneath its title wherever the title is shown.
- **FR-002**: A checklist item or sub-item MUST support optional start and due dates, editable the same way its text is.
- **FR-003**: Status MUST be one of Todo, In Progress, or Done, and MUST fully replace the done/not-done checkbox on every checklist surface (the sitewide page and every room's checklist box).
- **FR-004**: An item/sub-item with no room tags and no sub-items of its own MUST have a directly-editable status control; one with room tags or sub-items MUST show a read-only status badge derived from the rollup rule (see Edge Cases).
- **FR-005**: A room's own status row for a multi-room item (specs/031) MUST have its own directly-editable status control, independent of every other room's.
- **FR-006**: A room's checklist box MUST show an item's due date when one is set, and MUST show nothing date-related when none is set.
- **FR-007**: Every room MUST render with its own distinct, consistent pastel color everywhere the checklist UI shows that room (chips, per-room status rows, that room's own checklist box).
- **FR-008**: A status badge/control's color MUST come from a fixed status palette (one color per Todo/In Progress/Done), never from a room's color, so the two stay visually distinct.

### Key Entities

- **Checklist Item** (extended from specs/028/029/031): gains `detail` (optional text), `start_date`/`due_date` (optional dates), and `status` (Todo/In Progress/Done), which replaces the prior done/not-done flag both at the item level and at the per-room level.

## Success Criteria *(mandatory)*

- **SC-001**: A task's real state — not started, in progress, or done — is visible and settable directly, without a boolean checkbox standing in for something more nuanced.
- **SC-002**: Standing in a room, only the dates that actually matter (ones someone set) are visible — no empty placeholders to scan past.
- **SC-003**: A person can tell which room a row belongs to by color alone, without reading every label, while still being able to tell a task's status apart from its room.

## Assumptions

- The compound case (an item with both room tags and its own sub-items) keeps specs/031's existing scope decision: room-tag rollup takes priority for that item's own derived status; no new cross-cascading between the two rollup sources is introduced here.
- No new "in progress" semantics for rooms/sub-items beyond the three states themselves — no partial-percentage tracking, just Todo/In Progress/Done at every level.
