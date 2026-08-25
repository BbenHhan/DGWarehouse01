# Data Model: Auto Per-Room Checklist Sub-Items

No schema change — this feature is entirely new logic on top of specs/028/029's existing `checklist_items`/`checklist_item_rooms` tables. `ChecklistItem` (`lib/types.ts`) is unchanged.

## `app/actions/checklist.ts`

- `addChecklistItem(text, roomIds, parentId?)` — signature unchanged. Internal behavior gains a branch:
  - if `parentId === undefined && roomIds.length >= 2`: fetch `getRooms()`, create one untagged parent row (`text`, `room_ids: []`), then for each `roomId` in `roomIds` create a sub-item row (`` `${text} #${room.name_th}` ``, `room_ids: [roomId]`, `parent_id: <parent.id>`); return the parent with `sub_items` populated by the created subs (ordered to match `roomIds`' order).
  - else: unchanged — single-row creation exactly as specs/029.
  - Implemented by factoring the existing single-row create logic (both `local`/`supabase` branches) into a private helper the two paths both call, so the explosion path is just "call the helper once for the parent, once per room for the subs" — no duplicated insert logic.

## `lib/data.ts`

- `getRoomChecklistItems(roomId)` — query gains a second parent-discovery path per research.md Decision 3:
  1. `directParents`: existing query (top-level, tagged to `roomId`, not done).
  2. `roomTaggedSubParentIds`: distinct `parent_id` of not-done sub-items explicitly tagged to `roomId`, excluding ids already in `directParents`.
  3. `extraParents`: those parent rows, fetched by id, filtered not-done.
  4. Combined parent set = `directParents ∪ extraParents`; each still gets its `sub_items` populated by the existing not-done/inherits-or-explicit-tag filter (specs/029 Decision 4), unchanged.
- `getChecklistItems()` — unchanged (sitewide view already shows every top-level item and all its sub-items regardless of tags).

`lib/local/store.ts`'s `localGetRoomChecklistItems`/`localAddChecklistItem` get the equivalent JS-side logic (same two decisions, computed over the in-memory array instead of two extra queries).

## UI contracts

- **`RoomChecklistBox`** — for each item in the (now possibly-indirect) parent list: if `item.room_ids.includes(roomId)`, render its checkbox as before (specs/028/029, unchanged); otherwise render its text as a plain label with no checkbox (research.md Decision 4). The per-parent "add sub" quick-form now calls `addChecklistItem(text, [roomId], parentId)` (research.md Decision 5) instead of leaving the new sub-item untagged.
- **`ChecklistList`** — no changes. The existing optimistic "add" case already prepends whatever `ChecklistItem` `addChecklistItem` returns, `sub_items` included, so a multi-room add renders correctly with zero new client-side logic.
