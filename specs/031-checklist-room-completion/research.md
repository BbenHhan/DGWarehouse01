# Research: Per-Room Checklist Completion

## Decision 1: Completion moves onto the `checklist_item_rooms` junction row itself — no more auto-generated sub-items

**Decision**: Add `is_done boolean not null default false` directly to `checklist_item_rooms`. specs/030's `addChecklistItem` explosion (creating an untagged parent plus one real sub-item per room) is removed entirely; a multi-room add goes back to inserting one `checklist_items` row plus its room-tag rows, exactly as specs/028 originally did.

**Rationale**: The account holder explicitly asked to move away from "separate items per room" toward "just checkboxes per room under the one item" — that's a description of state living on the room *tag* (membership + done), not a description of more items. Since specs/030 was never deployed (no migration applied, no live data), reverting its Server Action behavior costs nothing.

**Alternatives considered**: Keeping specs/030's sub-item-per-room shape but hiding the sub-items' edit/delete affordances in the UI to make them "feel" like simple checkboxes — rejected as needless indirection once the simpler, direct model (a flag on the tag itself) does exactly what's needed with less code and no phantom untagged-parent rows.

## Decision 2: A room's own done state is the source of truth for any item with ≥1 room tag; the item's own `is_done` becomes a derived, kept-in-sync cache

**Decision**: `checklist_items.is_done` keeps its existing role for a zero-room item (directly toggled, unchanged). For any item with one or more room tags, `is_done` is *derived* — recomputed as "every one of this item's `checklist_item_rooms` rows has `is_done = true`" — and rewritten every time any one of its room tags is toggled via the new `toggleChecklistItemRoom` action.

**Rationale**: Keeping a real, always-accurate `is_done` column (rather than computing it on every read) means every existing consumer that already reads `checklist_items.is_done` — the sitewide summary counts, the strikethrough styling, specs/029's own parent/sibling sync — keeps working unchanged, without needing to know whether a given item's completion is room-derived or a direct toggle.

## Decision 3: One room tag behaves identically whether it's the item's only tag or one of several — uniform mechanism, threshold only changes the UI

**Decision**: `toggleChecklistItemRoom` is the mechanism for *any* room tag, including when an item has exactly one. `/checklist`'s UI still shows a single-room item with one inline checkbox next to its text (unchanged appearance from before specs/030), but that checkbox is now wired to `toggleChecklistItemRoom(item.id, thatRoomId, checked)` rather than `toggleChecklistItem`. Only at two-or-more room tags does the UI switch to hiding the inline checkbox and rendering the labelled per-room list instead (FR-002/FR-003).

**Rationale**: Splitting the *data* rule ("any room tag's completion lives on its own junction row") from the *display* rule ("only show the breakdown when there's more than one to break down") keeps `getRoomChecklistItems` and the toggle action simple and count-independent — no special-casing 1-vs-many at the query layer — while still giving the account holder the unchanged, uncluttered single-room appearance they already have today.

## Decision 4: `getRoomChecklistItems(roomId)` filters directly on the room-tag row's own `is_done`, not the item's

**Decision**: The query returns items with a `checklist_item_rooms` row where `room_id = roomId` and that row's own `is_done = false` — not `checklist_items.is_done = false`. This replaces specs/030's "union direct-tagged parents with parents reachable only via a room-tagged sub-item" logic entirely, since every item relevant to a room is now, by construction, directly tagged to it (no more untagged auto-generated parents to reach around).

**Rationale**: This is the query-level expression of Decision 2/3 — "not done for this room" is a property of that specific tag, not of the item as a whole (which may have other rooms still outstanding, or, symmetrically, may already be fully done while this one room's row hasn't been individually acknowledged yet — impossible under the derived-cache rule, but the room-tag row remains the correct thing to filter on regardless).

## Decision 5: `toggleChecklistItemRoom` still drives specs/029's upward parent/sibling sync — it doesn't drive the downward cascade

**Decision**: After writing a room tag's `is_done` and recomputing the item's own derived `is_done`, `toggleChecklistItemRoom` checks `parent_id` exactly like `toggleChecklistItem` does and re-syncs the parent from all siblings if present (specs/029 FR-003, upward). It does **not** attempt the reverse — cascading a newly-derived-done item's state down onto its own sub-items (specs/029 FR-004) is left to the existing `toggleChecklistItem` pathway only, which for a room-tagged item is no longer exposed as a single clickable control in the UI (Decision 3/FR-002).

**Rationale**: The compound case (an item with both manual sub-items and 2+ room tags of its own) is explicitly out of scope for new cross-cascading behavior (spec's Assumptions) — keeping the upward sync (which every other done-state change already goes through) is free and correct to preserve, while inventing a new downward path for a case nobody asked for would be speculative.
