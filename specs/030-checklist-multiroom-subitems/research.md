# Research: Auto Per-Room Checklist Sub-Items

## Decision 1: Reuse specs/029's sub-item mechanism entirely — no new table, no new "per-room completion" concept

**Decision**: A multi-room add explodes into a plain untagged parent plus N ordinary sub-items (one per room, each tagged to exactly that room), created through the exact same `checklist_items`/`checklist_item_rooms` rows and the exact same parent↔sub-item auto-sync (`toggleChecklistItem`) already built for specs/029. Nothing new is stored beyond what specs/029 already models.

**Rationale**: The account holder's own worked example described the desired result in exactly sub-item shape ("checklist 101" → "checklist 101 #ห้องแรก" / "checklist 101 #ห้องกลาง" as nested rows) — that's a description of sub-items, not a new data concept. Building a parallel "per-room completion" table would duplicate the auto-complete logic (upward sync, cascade-down, cascade-delete) that specs/029 already implements and tests, for the exact same behavior.

**Alternatives considered**: A `checklist_item_rooms.is_done` column (per-room completion tracked directly on the existing junction table) — considered before the account holder's worked example, rejected once the example made clear they wanted this expressed as visible, individually-textable, individually-editable/deletable rows (sub-items), not an invisible flag on a tag.

## Decision 2: The explosion happens inside `addChecklistItem`, gated on `parentId === undefined && roomIds.length >= 2`

**Decision**: `addChecklistItem` internally creates the untagged parent row, resolves each selected room's `name_th` (via the existing `getRooms()` in `lib/data.ts`, DATA_SOURCE-aware), and creates one sub-item per room with text `` `${text} #${room.name_th}` ``, all before returning the parent (with `sub_items` populated) to the caller. The `parentId === undefined` guard means a sub-item being created directly (already has a parent) never itself explodes — keeping nesting at one level (specs/029 FR-009) — and a room-box quick-add (which always passes exactly one room) never reaches the `>= 2` branch either.

**Rationale**: Centering this in the Server Action means every call site (the sitewide add-form today; anything added later) gets the same behavior for free, and the UI needs zero new logic — `ChecklistList`'s existing optimistic "add" reducer case already prepends a returned item complete with its `sub_items`, unchanged since specs/029.

## Decision 3: `getRoomChecklistItems` must include a parent whose sub-item is tagged to the room, even when the parent itself isn't

**Decision**: `getRoomChecklistItems(roomId)` now unions two parent sets: (a) parents directly tagged to `roomId` (specs/028's original query, unchanged) and (b) parents that have at least one not-done sub-item explicitly tagged to `roomId`, even if the parent carries no room tags at all. Both sets' sub-items are then filtered exactly as before (specs/029 Decision 4: untagged inherits, explicit tag narrows).

**Rationale**: An auto-generated parent from Decision 1/2 is always untagged (`room_ids: []`) — without this union, its per-room sub-items would never surface in any room's box at all, since the original specs/028/029 query only ever looked at a parent's own tags to decide whether to show it. This is exactly the gap the account holder's request is about.

## Decision 4: A parent shown only via Decision 3's union (b) gets no checkbox of its own in that room's box

**Decision**: `RoomChecklistBox` checks `item.room_ids.includes(roomId)` (data already on hand, no new field needed) to decide whether to render the parent's own interactive checkbox. When false — the parent is present in this room's list solely because of a relevant sub-item — the parent's text renders as a plain label instead, and the only checkable thing under it is that room's own sub-item(s).

**Rationale**: FR-005 exists because the whole point of the fix is that nothing in a room's box should be able to affect any other room's part. The parent's own checkbox (which, on `/checklist`, still legitimately cascades to every sub-item at once per specs/029 FR-004 — a deliberate sitewide "finish everything" shortcut) would do exactly that if exposed here, re-introducing the original bug inside the fix meant to solve it.

## Decision 5: A room-box quick-added sub-item is tagged directly to that room, not left untagged

**Decision**: `RoomChecklistBox`'s per-parent "add sub" quick-form now calls `addChecklistItem(text, [roomId], parentId)` instead of specs/029's original `addChecklistItem(text, [], parentId)`.

**Rationale**: specs/029 left a room-box-added sub-item untagged so it would inherit the parent's own room tags — correct when the parent is directly tagged there, but meaningless for a parent that (per Decision 1) may carry no room tags at all: an untagged sub of an untagged parent inherits nothing and would silently vanish from every room's box. Tagging explicitly to the current room makes a room-box-added sub-item behave identically (and correctly) regardless of what the parent looks like.
