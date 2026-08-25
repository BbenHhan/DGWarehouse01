# Feature Specification: Per-Room Checklist Completion

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "ขอเปลี่ยนไอเดียว่าให้แยก checklist เป็นแต่ละห้อง ขอเปลี่ยนเป็น ถ้ามีหลายห้องในchecklist นั้น ในหน้า checklist ควรเป็น ติ๊กแต่ละห้องในหัวข้อนั้นๆน่าจะง่ายกว่าสำหรับ user และเวลาที่กดติ๊กในหน้าแต่ละห้องมันควรเช็คแค่ห้องนั้นๆ ไม่ควรติ๊กว่าทั้งchecklist นั้นเสร็จ เพราะห้องอื่นยังไม่เสร็จ" — the account holder is walking back specs/030's approach (auto-generating separate sub-items, one per room). Instead: when an item is tagged to more than one room, `/checklist` should show one checkbox per tagged room directly under the item's text — simpler than a full separate sub-item per room — and ticking the item from within a specific room's own page must only ever affect that room's part, never the whole item.

**This feature supersedes specs/030's mechanism** (no live data/migration exists for it yet, so nothing needs migrating) while keeping its underlying goal: a multi-room item can't be prematurely marked done by any single room. specs/029's separate, freeform "type your own sub-item" capability is unaffected and stays available independently (confirmed with the account holder).

Clarified with the account holder:
1. A multi-room item's text has no checkbox of its own on `/checklist` — only the per-room checkboxes underneath are interactive (no redundant "master" checkbox to keep in sync visually).
2. specs/029's manual sub-item feature (the "+ เพิ่ม sub" free-text breakdown) stays exactly as it is, independent of this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See and tick each room's part right on the checklist page (Priority: P1)

**Why this priority**: This is the account holder's explicit ask — ticking every room from one page is easier than visiting each room's page just to close out one item.

**Independent Test**: Add an item tagged to two or more rooms; on `/checklist`, confirm it shows one checkbox per tagged room (labelled with the room) instead of one checkbox for the whole item; tick one room's box and confirm only that room's box changes state.

**Acceptance Scenarios**:

1. **Given** an item tagged to two or more rooms, **When** `/checklist` is viewed, **Then** the item's text has no checkbox of its own, and one labelled, independently-toggleable checkbox appears underneath for each tagged room.
2. **Given** an item tagged to exactly one room or none, **When** `/checklist` is viewed, **Then** it looks and behaves exactly as it does today — one checkbox next to the item's own text (no regression for the common case).
3. **Given** a multi-room item's per-room checkboxes, **When** every one of them is ticked, **Then** the item as a whole counts as done (reflected in `/checklist`'s done/not-done styling and the page's summary counts).

### User Story 2 - A room's own page only ever affects that room's part (Priority: P1)

**Why this priority**: This is the actual bug being fixed — ticking an item from one room's page today can silently mark it done everywhere, hiding it from other rooms that haven't actually finished their part.

**Independent Test**: Add an item tagged to Room A and Room B; open Room A's page and tick it there; confirm Room B's page still shows it as outstanding, and `/checklist` shows the item as still not fully done.

**Acceptance Scenarios**:

1. **Given** a multi-room item shown in Room A's checklist box, **When** it's ticked there, **Then** only Room A's part is marked done — Room B's box still shows the item as outstanding.
2. **Given** the same item with Room A done and Room B not yet, **When** `/checklist` is viewed, **Then** the item overall still shows as not-done, with Room A's checkbox ticked and Room B's not.
3. **Given** every room's part of an item is now done, **When** any of those rooms' pages are viewed, **Then** the item no longer appears there (same not-done-only rule every room box already follows).

### Edge Cases

- An item tagged to exactly one room behaves identically whether ticked from `/checklist` or from that one room's own box — there's only one room to be done, so there's nothing to keep separately in sync.
- Deleting an item removes every one of its rooms' completion state along with it (unchanged: no orphaned state).
- specs/029's manual sub-items are unaffected: a sub-item with its own multiple room tags follows this same per-room-checkbox rule independently of its parent.

## Requirements *(mandatory)*

- **FR-001**: A checklist item (or sub-item) tagged to two or more rooms MUST track each tagged room's completion independently, rather than one shared done/not-done state for the whole item.
- **FR-002**: On `/checklist`, an item tagged to two or more rooms MUST render one labelled, independently-toggleable checkbox per tagged room, and MUST NOT render a separate checkbox for the item's own text.
- **FR-003**: An item tagged to zero or one room MUST behave exactly as it does today (specs/028/029) — a single checkbox next to its own text, no per-room breakdown shown.
- **FR-004**: An item's overall done state MUST be true exactly when every one of its tagged rooms is done (for a zero-room item, its own direct toggle remains the sole source of truth, unchanged).
- **FR-005**: In a room's own checklist box, ticking an item there MUST affect only that room's own completion state, never any other room's, and MUST NOT be able to mark an item done while another of its tagged rooms is still outstanding.
- **FR-006**: This feature's per-room tracking coexists with, and does not replace, specs/029's freeform sub-item breakdown — a sub-item that itself carries multiple room tags follows the same per-room rule as any other item.

### Key Entities

- **Checklist Item** (extended from specs/028/029): each of its room tags now carries its own done/not-done state, not just membership.

## Success Criteria *(mandatory)*

- **SC-001**: Closing out every room's part of a multi-room item can be done entirely from `/checklist`, with no need to visit each room's page.
- **SC-002**: An item can never be mistakenly shown as fully done while any of its tagged rooms still has outstanding work — its overall state always accurately reflects every room's real status.
- **SC-003**: Nothing about today's single-room or untagged item experience changes — the per-room breakdown only appears when it's actually needed.

## Assumptions

- No live data or migration exists yet for specs/030's sub-item-per-room mechanism, so this is a clean design replacement, not a data migration.
- A compound edge case — an item that has *both* specs/029 manual sub-items *and* 2+ of its own room tags — is out of scope for any special cross-cascading behavior beyond what each feature already does independently (its own room-tag completion recomputes its own derived done state; that recomputed state still participates in specs/029's ordinary parent/sibling sync exactly as any other done-state change would).
