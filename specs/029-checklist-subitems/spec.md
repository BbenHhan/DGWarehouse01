# Feature Specification: Checklist Sub-Items

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "อยากให้ checklist เพิ่ม sub ของมันได้ด้วย" — the account holder wants each checklist item (specs/028-room-checklist) to support its own sub-items (a one-level breakdown of a task into smaller checkable steps), not just flat items.

Clarified with the account holder:
1. A sub-item has its own independent done/not-done checkbox — toggling it doesn't just relabel the parent, but when every sub-item under a parent becomes done, the parent is automatically marked done too.
2. A sub-item can be tagged to rooms independently of its parent, separate from the parent's own room tags.
3. A room's checklist box (`RoomChecklistBox`, specs/028) must also show sub-items, not just top-level items.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Break a task into steps (Priority: P1)

**Why this priority**: This is the entire point of the feature — a single line item is sometimes too coarse ("เช็คบันไดหนีไฟทุกชั้น" naturally breaks into one step per floor), and the account holder wants to capture that breakdown instead of writing one giant line or several disconnected top-level items.

**Independent Test**: On `/checklist`, open an existing item, add a sub-item under it with its own text; confirm it appears nested under the parent, not-done, immediately.

**Acceptance Scenarios**:

1. **Given** an existing checklist item, **When** a sub-item is added with text, **Then** it appears nested under that parent as a separate, independently-checkable row.
2. **Given** an attempt to add a sub-item with empty text, **When** save is attempted, **Then** it's rejected the same way an empty top-level item is.
3. **Given** a sub-item, **When** it is added, **Then** it can optionally be tagged to one or more rooms of its own, independent of whatever rooms its parent is tagged to.

### User Story 2 - Checking off every step finishes the task automatically (Priority: P1)

**Why this priority**: Without this, a parent with all steps done would sit there looking unfinished forever, undermining the entire point of breaking it down — the account holder specifically asked for the parent to auto-complete.

**Independent Test**: Add two sub-items under a parent; check the first, confirm the parent is still not-done; check the second, confirm the parent becomes done automatically with no separate action.

**Acceptance Scenarios**:

1. **Given** a parent with two or more not-done sub-items, **When** all of them become done, **Then** the parent is automatically marked done.
2. **Given** a parent that was auto-completed this way, **When** any one of its sub-items is toggled back to not-done, **Then** the parent automatically reverts to not-done too (the parent's done state always reflects "are all steps done").
3. **Given** a parent with no sub-items at all, **When** its own checkbox is toggled, **Then** it behaves exactly as it does today (specs/028) — independent, manual, unaffected by this feature.
4. **Given** a parent that has sub-items, **When** the parent's own checkbox is toggled directly (not via its sub-items), **Then** every one of its sub-items is set to match that same state — checking the parent finishes every step at once, and un-checking it reopens every step.

### User Story 3 - A room's checklist box shows the steps that matter there (Priority: P1)

**Why this priority**: The whole point of room-tagging (specs/028) was on-site visibility — a parent shown in a room's box with its steps hidden would be misleading about what's actually left to do in that room.

**Independent Test**: Tag a parent to Room A; add two sub-items under it, one tagged to Room A only and one left untagged; open Room A's page and confirm both sub-items appear nested under the parent. Then tag one sub-item to Room B instead and confirm it now appears only under the parent on Room B's page, not Room A's.

**Acceptance Scenarios**:

1. **Given** a parent shown in a room's checklist box, **When** the box is viewed, **Then** every not-done sub-item that has no room tags of its own appears nested under it (an untagged sub-item inherits every room its parent is tagged to).
2. **Given** a sub-item tagged to a specific room, **When** that room's box is viewed, **Then** the sub-item appears there — and does NOT appear under the same parent on a different room's box, even one the parent itself is also tagged to (the sub-item's own tags narrow it down, overriding inheritance).
3. **Given** a sub-item marked done, **When** any room's checklist box is viewed, **Then** it no longer appears (room boxes only ever show not-done items, same rule as parents).
4. **Given** the room checklist box's own quick-add for a sub-item, **When** a sub-item is added from there, **Then** it is created with no room tags of its own, so it inherits visibility from its parent (matches how a quick-added top-level item auto-tags to the current room, specs/028 FR-004, but a sub-item's inherited tag comes from its parent rather than being set directly).

### Edge Cases

- Deleting a parent deletes every one of its sub-items too (no orphaned steps left behind).
- Sub-items are a single level deep — a sub-item cannot itself have sub-items, keeping the breakdown simple (one task → its steps, not an arbitrary tree).
- Editing a sub-item's text or its own room tags works the same pencil-icon edit affordance already used for top-level items (specs/028 FR-007); a sub-item cannot be re-parented or promoted to top-level in this version.

## Requirements *(mandatory)*

- **FR-001**: An editor MUST be able to add a sub-item under any existing top-level checklist item, with free, non-empty text and an optional set of tagged rooms of its own.
- **FR-002**: Every sub-item MUST have its own done/not-done state, toggleable independently by an editor.
- **FR-003**: When every sub-item under a parent is done, the parent MUST automatically become done; when any sub-item under an already-done parent becomes not-done again, the parent MUST automatically revert to not-done.
- **FR-004**: Toggling a parent's own checkbox directly MUST set every one of its sub-items to that same done state.
- **FR-005**: The sitewide `/checklist` page MUST show each parent's sub-items nested under it.
- **FR-006**: A room's checklist box MUST show a not-done sub-item nested under its (shown) parent when either the sub-item has no room tags of its own (inherits the parent's rooms) or the sub-item is explicitly tagged to that room.
- **FR-007**: Editors MUST be able to edit a sub-item's text and room tags, and delete a sub-item (deleting a parent also deletes all of its sub-items).
- **FR-008**: Viewers MUST be able to see sub-items everywhere they'd see the parent, but MUST NOT add, edit, toggle, or delete them — same role rule as top-level items (specs/028 FR-008).
- **FR-009**: Sub-items MUST NOT themselves have sub-items (one level of nesting only).

### Key Entities

- **Checklist Item** (extended from specs/028): gains an optional reference to a parent checklist item. An item with no parent is a top-level item; an item with a parent is a sub-item and carries the same fields (text, done state, room tags) as a top-level item.

## Success Criteria *(mandatory)*

- **SC-001**: A task that's naturally made of several steps can be recorded as one parent with its steps underneath, instead of forcing either one vague line or several disconnected top-level items.
- **SC-002**: Finishing the last step of a task marks the whole task done with no extra action, and reopening any step reopens the task — the parent's done state is never out of sync with its steps.
- **SC-003**: Standing in a specific room, the steps relevant to that room are visible nested under their task, without steps meant for a different room cluttering the view.

## Assumptions

- Single level of nesting only (FR-009) — matches what was asked ("เพิ่ม sub ของมันได้ด้วย", not a general outline tool) and keeps the auto-complete rule (FR-003) unambiguous, since a deeper tree would need to define auto-complete at every level.
- Toggling a parent cascades its state down to all sub-items (FR-004) — not explicitly asked, but the natural counterpart to FR-003's upward auto-complete: keeping a parent's state and its sub-items' states mutually consistent in both directions, and letting a user finish (or reopen) an entire task in one click when a per-step breakdown isn't needed in the moment.
- A sub-item's room-tag inheritance rule (FR-006) is "explicit tags override, empty tags inherit" rather than additive — chosen because the account holder's stated case for independent sub-item tagging is narrowing a multi-room parent's step down to the one room it actually applies to, not broadening it to rooms the parent isn't even tagged to.
