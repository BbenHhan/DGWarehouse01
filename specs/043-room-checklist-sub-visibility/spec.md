# Feature Specification: A Room Sees the Sub-Items That Belong to It

**Feature Branch**: `043-room-checklist-sub-visibility`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "เช็คลิสต์ในหน้าห้องไม่แสดงรายการเลย ถ้ารายการแม่ไม่ได้ผูกกับห้องนั้นแต่ sub ของมันผูกอยู่ เพราะ query หาเฉพาะรายการแม่ที่ผูกกับห้อง ต้องการให้หน้าห้องแสดงรายการแม่เป็นตัวครอบ แล้วข้างในแสดงเฉพาะ sub ที่เป็นของห้องนั้น ไม่ว่ารายการแม่จะผูกกับห้องนั้นเองหรือไม่ก็ตาม"

## Clarifications

### Session 2026-09-04

- Q: Should an entry that reaches a room only through its sub-items look different from one tagged to the room? → A: No. Every entry and every sub-item shows its status, the same way throughout

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Work assigned through a sub-item reaches its room (Priority: P1)

Someone writes a checklist entry that covers several rooms — one heading, with a separate
sub-item for each room's share of it. Each sub-item is tagged to its own room. They then
open a room's page expecting to see that room's share.

The room's checklist is empty. Not partially wrong — empty. The entries exist, they are
tagged to the right rooms, and none of them appear anywhere on the room pages. Work
recorded this way silently vanishes from the place it is meant to be done.

**Why this priority**: This is the whole of the defect and it loses work. A person
standing in a room, working from that room's page, is shown nothing and has no way to know
anything was assigned to them. It is worse than an error, because nothing announces it.

**Independent Test**: Create an entry with no room of its own and two sub-items tagged to
two different rooms, then open each room's page.

**Acceptance Scenarios**:

1. **Given** an entry with no room of its own whose sub-item is tagged to a room, **When** that room's page is opened, **Then** the entry appears there
2. **Given** that entry appears, **When** it is shown, **Then** it acts as a heading for the sub-items beneath it
3. **Given** the entry has sub-items tagged to several different rooms, **When** one room's page is opened, **Then** only that room's sub-items are listed under it
4. **Given** an entry that is itself tagged to the room, **When** the page is opened, **Then** it appears as it does today, and its own status stays settable

---

### Edge Cases

- An entry with no room of its own and no sub-item tagged to this room must not appear on this room's page
- A sub-item carrying no room tag of its own continues to inherit its parent's rooms, as it does today
- An entry whose sub-items for this room are all finished must drop off this room's page, exactly as a finished entry does today
- An entry that is tagged to this room but whose sub-items all belong to other rooms: the entry still belongs here, and shows no sub-items
- An entry appearing only because of its sub-items has no status of its own for this room — there is nothing to set, and the screen must not offer a control that writes nowhere
- The sitewide checklist must be unaffected: it already shows every entry with all of its sub-items

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A room's checklist MUST include an entry when the entry itself is tagged to that room **or** when any of its sub-items is
- **FR-002**: An entry shown on a room's page MUST list only the sub-items that belong to that room
- **FR-003**: Every entry and every sub-item on a room's page MUST show its status
- **FR-004**: An entry tagged to the room itself MUST keep its current behaviour, including a settable status for that room
- **FR-005**: An entry with neither its own tag for the room nor any sub-item belonging to it MUST NOT appear on that room's page
- **FR-006**: Finished work MUST continue to drop off a room's page under the same rule as today, whether it is the entry or its sub-items that are finished
- **FR-007**: A sub-item with no room tag of its own MUST continue to inherit its parent's rooms
- **FR-008**: The sitewide checklist MUST be unchanged
- **FR-009**: An entry MUST look the same whether it is tagged to the room itself or reaches
  it through its sub-items — the same row, showing its status either way
- **FR-010**: An entry that has sub-items MUST show the status those sub-items add up to,
  which is how such an entry's status already works everywhere else in the app. It is shown,
  not set directly: setting it would be overwritten the moment any sub-item beneath it
  changed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every sub-item tagged to a room appears on that room's page — zero tagged sub-items are unreachable
- **SC-002**: A room's page never shows a sub-item belonging to a different room
- **SC-003**: No control appears that would write a status nowhere — every settable control
  on a room's page reaches a real record
- **SC-006**: Every entry and every sub-item on a room's page shows a status
- **SC-004**: The sitewide checklist shows exactly what it showed before the change
- **SC-005**: With the data that currently exists, the two rooms holding a tagged sub-item each show one entry, where today both show none

## Assumptions

- "Belongs to a room" keeps its current meaning: a sub-item is that room's when it carries
  the room's tag, or when it carries no tag at all and inherits its parent's rooms
- The finished-work rule is unchanged; this feature changes which entries are reachable,
  not which are considered outstanding
- The quick-add on a room's page keeps tagging new sub-items to that room, as it does today
- An entry's status being computed from its sub-items is existing behaviour, not something
  this feature introduces: the sitewide checklist already shows such an entry's status as a
  rollup rather than a control
- No data changes: no entry is retagged, and nothing is written to make an entry visible.
  The defect is in what is looked for, not in what is stored
