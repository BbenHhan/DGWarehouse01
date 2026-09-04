# Feature Specification: A Readable Room Checklist

**Feature Branch**: `044-room-checklist-readability`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "กล่องเช็คลิสต์ในหน้าห้อง UI แน่นและอ่านไม่ออก แต่ละรายการไม่มีกล่องคลุม ระยะห่างระหว่างรายการกับระยะห่างภายในรายการเกือบเท่ากัน sub item เยื้องแค่นิดเดียวและหน้าตาเหมือนรายการแม่ ช่องเพิ่ม sub โผล่ใต้ทุกรายการ และชื่อห้องซ้ำทุกแถว ต้องการให้แต่ละรายการมีกล่องของตัวเองแบบหน้า checklist หลัก มองแล้วรู้ทันทีว่ารายการไหนจบตรงไหน และ sub อยู่ใต้รายการแม่ตัวไหน"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Telling one entry from the next (Priority: P1)

Someone standing in a room opens that room's page to work through its checklist. The box
lists several entries, some with sub-items beneath them. Nothing marks where one entry ends
and the next begins: an entry, its sub-items, and its add-a-sub field are all separated by
roughly the same amount of space as one entry is from the next. Reading it means counting
indentation, not glancing.

**Why this priority**: This is a list used while standing in a warehouse, on a phone,
often one-handed. A list that has to be deciphered is not usable in that setting, and the
sitewide checklist already solves the same problem — this screen simply never got the same
treatment.

**Independent Test**: Show the box with two entries, each carrying sub-items, and confirm
a reader can say without hesitation which sub-items belong to which entry.

**Acceptance Scenarios**:

1. **Given** several entries in the box, **When** it is displayed, **Then** each entry is visibly enclosed, so where it starts and ends is unambiguous
2. **Given** an entry with sub-items, **When** it is displayed, **Then** its sub-items are visibly contained within it, not merely indented beside it
3. **Given** two adjacent entries, **When** they are displayed, **Then** the separation between them is clearly greater than the separation between an entry and its own sub-items
4. **Given** an entry with sub-items, **When** a reader glances at the box, **Then** they can tell which entry each sub-item belongs to without tracing an indent

---

### User Story 2 - Less repetition on screen (Priority: P2)

The same room's name appears on every row, and an add-a-sub field appears beneath every
entry. On a box with four entries that is four room names, four sub-item room names, and
four input fields — none of which carry information the reader needs on every row.

**Why this priority**: It is the density itself rather than the structure, and it is worth
less than P1. But it is the reason the box is crowded enough for the structural problem to
bite, and both were reported together.

**Independent Test**: Show a box with several entries and count the repeated elements.

**Acceptance Scenarios**:

1. **Given** a box on a room's page, **When** it is displayed, **Then** the room is identified without repeating its name on every row
2. **Given** several entries, **When** the box is displayed, **Then** adding a sub-item is possible for each entry without a permanently visible field under every one
3. **Given** a reader wants to add a sub-item to a specific entry, **When** they look for how, **Then** it is discoverable on that entry

---

### Edge Cases

- An entry with no sub-items must not leave an empty container or a stray divider
- A very long entry title on a 375 px screen must wrap inside its container rather than overflow it
- A box with a single entry must not look like an error or an unfinished layout
- The empty state ("nothing outstanding") must still read as intentional
- An entry that carries no status control of its own — one reached through its sub-items — must still be clearly the parent of what sits beneath it
- The room's colour tint must remain visible without making the enclosures unreadable against it

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each entry in a room's checklist MUST be visibly enclosed as a unit
- **FR-002**: An entry's sub-items MUST be visibly contained within that entry, not merely indented next to it
- **FR-003**: The space between two entries MUST be visibly greater than the space between an entry and its own sub-items
- **FR-004**: The enclosure MUST follow the pattern the sitewide checklist already uses, so the two screens read as the same product
- **FR-005**: The room MUST be identified in the box without repeating its name on every row
- **FR-006**: Adding a sub-item to a specific entry MUST remain possible and discoverable, without a field standing open under every entry
- **FR-007**: Every entry and every sub-item MUST keep showing its status, and every control that works today MUST keep working
- **FR-008**: The layout MUST hold at 375 px without horizontal scrolling, including a long entry title
- **FR-009**: The room's colour tint MUST remain present, and text and enclosures MUST stay legible against it
- **FR-010**: The sitewide checklist MUST be unchanged

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can correctly say which entry each sub-item belongs to, on first glance, with no tracing of indentation
- **SC-002**: The gap between two entries is visibly larger than the gap inside an entry
- **SC-003**: A box showing four entries contains at most one room name and no more than one open input field
- **SC-004**: Every control available before the change is still reachable after it
- **SC-005**: No horizontal scrolling at 375 px, including with the longest room and entry names in the system
- **SC-006**: The room checklist and the sitewide checklist are recognisably the same design

## Assumptions

- The information shown does not change; this is about arrangement. Every entry, sub-item,
  status, due date, and control that appears today still appears
- The room tint introduced for room pages stays — it is what makes the box feel like it
  belongs to the room, and only its use alongside the new enclosures is in question
- Naming the room on every row came from an earlier change made at the account holder's
  request, and the requirement it served — that the box says which room it is about — is
  kept, by naming the room once rather than on every line
- The sitewide checklist is out of scope: it already encloses its entries and no complaint
  was raised about it
