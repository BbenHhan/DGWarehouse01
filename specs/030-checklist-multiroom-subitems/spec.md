# Feature Specification: Auto Per-Room Checklist Sub-Items

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "แล้วก็หาก checklist ไหนมี tag หลายห้อง ต้องติ๊กครบทุกห้องถึงจะติ๊กอันหลักได้นะ แต่มันจะใช้ยากหาก user ต้องไปติ๊กแต่ละห้องเอง อยากให้มีรอบรับในหน้า checklist เลย ให้ติ๊กของแต่ละห้อง" — a checklist item tagged to more than one room should require every one of those rooms to be individually confirmed done before the item itself counts as done, and the account holder wants that per-room confirmation to be doable right from the sitewide `/checklist` page, not only by visiting each room's own page.

Clarified with the account holder (with a worked example): adding an item tagged to rooms "ห้องแรก" and "ห้องกลาง" should produce:
```
- checklist 101
  - checklist 101 #ห้องแรก
  - checklist 101 #ห้องกลาง
```
i.e. one sub-item per tagged room, labelled with the room, using the sub-item mechanism already built (specs/029-checklist-subitems) — not a separate parallel tracking system. The room checkboxes render as separate rows nested under the item's text (matching how sub-items already render). In a room's own checklist box, ticking a room's row must affect only that room's part, not the whole item.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adding an item to multiple rooms automatically breaks it down by room (Priority: P1)

**Why this priority**: This is the entire request — without it, tagging an item to several rooms today creates one shared checkbox that any single room can prematurely complete for every other room too.

**Independent Test**: On `/checklist`, add a new item with text and two or more room tags selected; confirm the item appears with no checkbox state of its own initially and one sub-item per selected room nested beneath it, each labelled "{text} #{room name}" and independently checkable.

**Acceptance Scenarios**:

1. **Given** the checklist add-form, **When** text is entered and exactly two or more rooms are selected before saving, **Then** the saved item appears as a parent with one not-done sub-item per selected room, each sub-item's text combining the original text and that room's name.
2. **Given** the checklist add-form, **When** text is entered and zero or exactly one room is selected, **Then** the item is created exactly as it works today (specs/028/029) — a single checkable item, no automatic sub-items.
3. **Given** an item created this way, **When** `/checklist` is viewed, **Then** the parent shows no room tags of its own (the per-room breakdown lives entirely in its sub-items).

### User Story 2 - Finishing every room's part finishes the item (Priority: P1)

**Why this priority**: The auto-generated sub-items only solve the visibility problem if they still drive the parent's own done state the same way any other sub-item does — this is what makes "must confirm every room" actually true instead of just cosmetic.

**Independent Test**: Add an item tagged to two rooms; tick one room's generated sub-item from `/checklist`; confirm the parent stays not-done; tick the second; confirm the parent becomes done automatically.

**Acceptance Scenarios**:

1. **Given** a multi-room item's generated sub-items, **When** all of them are ticked done (from any combination of `/checklist` and the relevant rooms' own checklist boxes), **Then** the parent item is automatically marked done (existing rule, specs/029 FR-003 — no new mechanism, just confirming it applies here).
2. **Given** a multi-room item with one room's sub-item still not-done, **When** a room's checklist box is viewed for a room whose sub-item is already done, **Then** that room's part is correctly gone from that room's box while the item as a whole is still visible (not-done) elsewhere.

### User Story 3 - A room's checklist box shows and lets you tick only that room's part (Priority: P1)

**Why this priority**: The original complaint was that ticking an item from one room's own page could silently complete it for every other room too — a room box has to be trustworthy for exactly what it shows.

**Independent Test**: Add an item tagged to Room A and Room B; open Room A's page; tick that item's row there; confirm Room B's page still shows its own part as outstanding.

**Acceptance Scenarios**:

1. **Given** a multi-room item's per-room sub-item for Room A, **When** Room A's checklist box is viewed, **Then** that room's sub-item appears there as its own checkable row, even though the parent item itself carries no room tags anymore.
2. **Given** that same parent item, **When** Room A's box is viewed, **Then** the parent's own text is shown only as context (not as a separate, independently-toggleable checkbox in that box) — the only checkbox offered there for this item is Room A's own part, so there is no control in Room A's box that could ever mark Room B's part done.
3. **Given** a room's checklist box, **When** a quick-add sub-item is created from within a specific room's shown parent, **Then** that new sub-item is tagged to that room specifically (not left untagged), so it always resolves consistently regardless of whether the parent itself carries any room tags.

### Edge Cases

- An item edited later to add a second room tag (via the existing pencil-icon edit) does **not** retroactively explode into per-room sub-items — the automatic breakdown only happens at creation time, in the add-form. (See Assumptions.)
- Deleting the parent still deletes every one of its per-room sub-items (unchanged from specs/029).
- A generated sub-item can be edited or deleted individually afterward exactly like any other sub-item (unchanged from specs/029) — including changing which room it's tagged to, or removing its room tag entirely.

## Requirements *(mandatory)*

- **FR-001**: When a new top-level checklist item is created with two or more room tags selected, the system MUST create it as an untagged parent with one not-done sub-item per selected room instead of a single item carrying all those room tags directly.
- **FR-002**: Each generated sub-item's text MUST combine the parent's original text with the tagged room's name, and MUST be tagged to exactly that one room.
- **FR-003**: Creating a new top-level item with zero or one room tag MUST behave exactly as it does today — no automatic sub-item generation.
- **FR-004**: A room's checklist box MUST show a not-done sub-item that is tagged to that room, nested under its parent's text, even when the parent itself carries no room tags of its own.
- **FR-005**: In a room's checklist box, a parent shown only because one of its sub-items belongs to that room MUST NOT expose its own top-level checkbox there — only that room's own sub-item(s) are checkable from that box, so ticking anything in a room's box can only ever affect that room's own part.
- **FR-006**: A sub-item added via a room's checklist box quick-add MUST be tagged to that specific room (not left untagged), so it behaves consistently in FR-004/FR-005 regardless of the parent's own tags.

### Key Entities

- **Checklist Item** (unchanged shape from specs/029) — this feature only changes what `addChecklistItem` does at creation time when multiple rooms are selected, and how `getRoomChecklistItems` decides which parents to include.

## Success Criteria *(mandatory)*

- **SC-001**: An item meant to apply to several rooms can be added once, in one place, and the account holder never has to separately visit each room's page just to set up its per-room tracking.
- **SC-002**: Standing in any one room, ticking that item off there can never be mistaken for finishing it everywhere else — the item only ever fully completes once every room's own part is done.
- **SC-003**: The parent item's own done state on `/checklist` is always an accurate summary ("every room finished its part or not"), never something that has to be double-checked against the rooms individually.

## Assumptions

- Automatic breakdown happens only at creation time (add-form), not retroactively on edit — matches the account holder's worked example (which was about "กดเพิ่ม", i.e. the add action) and keeps `editChecklistItem`'s existing simple text/room-tag-replace behavior unchanged, avoiding the added complexity of diffing an edited room-tag set against existing sub-items.
- The threshold is "two or more" rooms, not "more than one room and the account holder additionally opts in" — matches the account holder's own framing ("หาก checklist ไหนมี tag หลายห้อง") with no mention of an opt-out, and zero/one-room items keep working exactly as before, so there's no regression risk in applying this automatically whenever it's actually relevant.
