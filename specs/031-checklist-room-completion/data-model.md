# Data Model: Per-Room Checklist Completion

## Schema (`supabase/migrations/0012_checklist_room_completion.sql`)

```sql
alter table checklist_item_rooms
  add column if not exists is_done boolean not null default false;
```

No RLS change — same table, same "authenticated full access" policy from migration 0010.

## `lib/types.ts`

```ts
export type ChecklistItem = {
  id: string;
  text: string;
  is_done: boolean; // direct source of truth for a 0-room item; a derived,
                     // kept-in-sync cache ("every room done?") once room_ids
                     // has 1+ entries (research.md Decision 2).
  room_ids: string[];
  // One entry per room_ids entry, same order — the per-room completion
  // state room_ids alone can't carry (specs/031-checklist-room-completion).
  room_completions: { room_id: string; is_done: boolean }[];
  parent_id: string | null;
  sub_items: ChecklistItem[];
  created_at: string;
  updated_at: string;
};
```

## `lib/database.types.ts`

`checklist_item_rooms`'s `Row`/`Insert`/`Update` gain `is_done: boolean` (optional on Insert, defaulting `false`).

## `app/actions/checklist.ts`

- `addChecklistItem(text, roomIds, parentId?)` — reverts to a single-row insert (specs/030's `parentId === undefined && roomIds.length >= 2` explosion branch is removed). Room-tag rows insert with `is_done: false` (the column default already covers this; no explicit value needed).
- `toggleChecklistItemRoom(itemId: string, roomId: string, isDone: boolean): Promise<ActionResult<{ id: string; is_done: boolean; room_id: string }>>` — **NEW**, editor+. Writes `checklist_item_rooms.is_done` for that `(itemId, roomId)` pair, recomputes `checklist_items.is_done` for `itemId` as "every one of its room rows done," writes that, then (research.md Decision 5) if `itemId` has a `parent_id`, re-syncs the parent from all siblings exactly like `toggleChecklistItem` already does.
- `toggleChecklistItem(id, isDone)` — unchanged; remains the mechanism for a 0-room item's direct toggle and for specs/029's parent→children cascade (still reachable for a 0-room parent).
- `editChecklistItem`/`deleteChecklistItem` — unchanged.

## `lib/data.ts`

- `getChecklistItems()` — the joined select becomes `checklist_item_rooms(room_id, is_done)`; each returned item's `room_completions` is built from that join (`room_ids` stays the plain id list, unchanged shape for existing callers).
- `getRoomChecklistItems(roomId)` — reverts to a single query per level (specs/030's union-with-extra-parents logic is removed): top-level items where `checklist_item_rooms.room_id = roomId` and **that row's own `is_done = false`** (not `checklist_items.is_done`), `parent_id is null`; each item's `sub_items` populated the same way, filtered by the sub's own room-tag row for `roomId` when tagged, or its own (possibly derived) `is_done` when untagged — unchanged inherit/override rule from specs/029, just checking the room-tag row's `is_done` instead of the item's when a tag is present.

Both continue to branch by `DATA_SOURCE` the same way as every other function; `lib/local/store.ts`'s JSON records gain a `room_completions`-equivalent structure (an array of `{ room_id, is_done }` alongside the existing `room_ids`) and `localToggleChecklistItemRoom` mirrors the Supabase logic above.

## UI contracts

- **`ChecklistList`** (specs/028/029, extended): a row (top-level or nested sub-item) with `room_ids.length >= 2` renders no checkbox next to its own text; instead, beneath it, one labelled checkbox per `room_completions` entry, each calling `toggleChecklistItemRoom(item.id, room_id, checked)`. A row with `room_ids.length <= 1` renders exactly as before — one inline checkbox, now calling `toggleChecklistItemRoom` when `room_ids.length === 1`, or `toggleChecklistItem` when `room_ids.length === 0` (research.md Decision 3).
- **`RoomChecklistBox`**: every item shown there is, by construction, tagged to the current room (Decision 4) — its single checkbox always calls `toggleChecklistItemRoom(item.id, roomId, true)`, regardless of how many other rooms the item is also tagged to. specs/030's "suppress the checkbox when not directly tagged" logic is removed — no longer needed, since there's no untagged-parent case anymore.
