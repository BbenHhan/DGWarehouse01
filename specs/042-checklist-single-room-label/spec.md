# Feature Specification: Checklist Items Always Name Their Room

**Feature Branch**: `042-checklist-single-room-label`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "ในหน้าเช็คลิสต์ รายการที่ผูกกับห้องเดียวไม่แสดงว่าเป็นห้องอะไร แสดงแค่ dropdown สถานะที่ย้อมสีห้องเท่านั้น ในขณะที่รายการที่ผูกหลายห้องแสดง emoji และชื่อห้องครบทุกห้อง ต้องการให้ไม่ว่าจะผูกกี่ห้อง ก็ต้องแสดงว่าเป็นห้องอะไรเสมอ"

## Clarifications

### Session 2026-09-04

- Q: How should a one-room item show its room? → A: Exactly as a multi-room item does — a tinted row carrying the icon, the name, and the status control
- Q: Should a one-room item also carry the overall-status badge that multi-room items have? → A: Yes — every item with rooms is presented the same way
- Q: Does the per-room page's own checklist box need this too? → A: Yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A one-room item says which room (Priority: P1)

Someone reads the sitewide checklist. An item tagged to two or more rooms names each of
them, with its icon, on its own line. An item tagged to exactly one room names none: the
only trace of the room is a colour tint on the status control. Colour alone does not say
*which* room, and a reader who has not memorised the palette — or who cannot distinguish
those colours — has no way to tell.

**Why this priority**: It is the whole of the request, and it affects the most common kind
of item. A checklist entry whose room is unstated is ambiguous in exactly the situation the
checklist exists for: knowing what is outstanding and where.

**Independent Test**: Open the checklist with one item tagged to a single room and one
tagged to several, and confirm both name their rooms in the same way.

**Acceptance Scenarios**:

1. **Given** a checklist item tagged to exactly one room, **When** the checklist is shown, **Then** that room's name is visible on the item
2. **Given** a checklist item tagged to several rooms, **When** the checklist is shown, **Then** every room is named, exactly as it is today
3. **Given** a one-room item, **When** its room is named, **Then** it is presented the same way as a room on a multi-room item, so the two do not look like different kinds of thing
4. **Given** a one-room item, **When** the reader changes its status, **Then** the change still applies to that room, exactly as it does today

---

### Edge Cases

- An item tagged to no room at all: there is no room to name, and its status control stays as it is
- A room that has been deleted while an item still references it: the item must still render, showing what it knows of the room rather than breaking the row
- A very long room name on a 375 px screen: the row must not overflow horizontally or push the status control off-screen
- An item with sub-items, whose status is derived rather than directly set: naming the room must not imply the status can be set where it cannot

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A checklist item tagged to exactly one room MUST name that room
- **FR-002**: The room on a one-room item MUST be presented the same way as each room on a multi-room item, so that the number of rooms changes how many are listed and nothing else
- **FR-003**: Naming the room MUST NOT change which room a status change is written to
- **FR-004**: An item tagged to no room MUST be unaffected
- **FR-005**: Multi-room items MUST keep their current presentation
- **FR-008**: An item tagged to at least one room MUST carry the overall-status badge that
  multi-room items carry today, so the badge's presence is not itself a signal about how
  many rooms an item has
- **FR-009**: The checklist box on a room's own page MUST also name the room on each row
- **FR-006**: Colour MUST NOT be the only thing that identifies a room, on any item
- **FR-007**: A room name MUST remain legible at 375 px without horizontal scrolling and without displacing the status control

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every checklist item that is tagged to at least one room names every room it is tagged to — zero items rely on colour alone
- **SC-002**: A reader can name the room of any tagged checklist item without opening it, using a screenshot alone
- **SC-003**: Status changes continue to reach the same room as before, verified on both a one-room and a multi-room item
- **SC-004**: The change is legible at 375 px with no horizontal scrolling
- **SC-005**: A one-room item and a multi-room item, side by side, differ only in how many
  rooms are listed — no other visible difference distinguishes them

## Assumptions

- The per-room checklist box is in scope by the account holder's decision (FR-009). It was
  raised that every row there belongs to the same room, so the name repeats down the
  column and carries no information the page heading does not already give. The decision
  stands and is recorded here rather than quietly narrowed
- Every item with rooms carries the overall-status badge (FR-008), including one-room
  items where it duplicates the room's own status. Uniformity was chosen over removing
  the duplicate
- Room colour tinting stays; this feature adds a name beside it rather than replacing it
- No data changes: which rooms an item is tagged to, and how status is stored, are untouched
