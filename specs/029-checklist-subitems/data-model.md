# Data Model: Checklist Sub-Items

## Schema (`supabase/migrations/0011_checklist_subitems.sql`)

```sql
alter table checklist_items
  add column if not exists parent_id uuid references checklist_items (id) on delete cascade;

create index if not exists checklist_items_parent_idx on checklist_items (parent_id);
```

No RLS change — `parent_id` is a plain column on the already-RLS-enabled `checklist_items` table (specs/028 migration 0010); the existing "authenticated full access" policy already covers it.

## `lib/types.ts`

```ts
export type ChecklistItem = {
  id: string;
  text: string;
  is_done: boolean;
  room_ids: string[];
  parent_id: string | null;
  // Populated only on a top-level item returned by getChecklistItems/
  // getRoomChecklistItems; always [] on a sub-item itself (one level only,
  // research.md Decision 2/5).
  sub_items: ChecklistItem[];
  created_at: string;
  updated_at: string;
};
```

## `lib/database.types.ts`

`checklist_items`'s `Row`/`Insert`/`Update` gain `parent_id: string | null` (optional on Insert, defaulting to `null`); add a `checklist_items_parent_id_fkey` self-referencing entry to its `Relationships` array, matching this file's existing convention.

## Server Actions (`app/actions/checklist.ts`)

- `addChecklistItem(text: string, roomIds: string[], parentId?: string): Promise<ActionResult<ChecklistItem>>` — editor+; unchanged validation plus `parentId` (optional, `uuid`). When present, the new row is inserted with that `parent_id`.
- `toggleChecklistItem(id: string, isDone: boolean): Promise<ActionResult<{ id: string; is_done: boolean }>>` — editor+; after writing the toggled row:
  - if the row has a `parent_id`: re-read all siblings sharing that `parent_id`, set the parent's `is_done` to `true` iff every sibling is now done, else `false` (research.md Decision 3, FR-003).
  - else if the row has any sub-items: write the same `is_done` to every sub-item (FR-004).
  Both backends (`local`/`supabase`) implement this the same way.
- `editChecklistItem(input: { id; text?; roomIds? })` — unchanged signature; does not touch `parent_id` (no re-parenting, per spec's Edge Cases).
- `deleteChecklistItem(id: string)` — unchanged signature; sub-items cascade-delete automatically via the FK (Supabase) or are removed alongside the parent in `lib/local/store.ts` (local backend, which has no real FK to rely on).

## `lib/data.ts`

- `getChecklistItems(): Promise<ChecklistItem[]>` — every **top-level** item (`parent_id is null`) sitewide, `room_ids` populated via the existing join, ordered `created_at` descending; each item's `sub_items` holds **every** one of its sub-items (done or not — the sitewide page is the full-history view), also ordered `created_at` descending.
- `getRoomChecklistItems(roomId: string): Promise<ChecklistItem[]>` — top-level items tagged to `roomId` and not done (unchanged query from specs/028); each item's `sub_items` holds only its not-done sub-items that are either untagged (inherit the parent's rooms) or explicitly tagged to `roomId` (research.md Decision 4, FR-006).

Both continue to branch by `DATA_SOURCE` the same way every other `lib/data.ts` function does: `mock` → always `[]` (unchanged); `local` → `lib/local/store.ts` (its JSON records already embed `room_ids` directly and now also `parent_id`, with grouping into `sub_items` computed at read time); `supabase` → the real queries above.

## UI contracts

- **`ChecklistList`** (specs/028, extended): each rendered row gains a "+ เพิ่ม sub" quick-add affordance and, when `item.sub_items.length > 0`, a nested list of sub-item rows directly beneath it — each sub-item row reusing the same checkbox/edit/delete affordances as a top-level row (via the existing `EditChecklistDialog`), just indented and without its own further "add sub" control (FR-009).
- **`RoomChecklistBox`** (specs/028, extended): each shown parent row gains a nested list of `item.sub_items` (already server-filtered per the room, per `getRoomChecklistItems`) with their own checkboxes, plus a quick-add-sub input per parent that calls `addChecklistItem(text, [], parentId)` — no room picker (a room-box-added sub-item is left untagged so it inherits the parent's rooms, matching how a room-box-added top-level item auto-tags to the current room in specs/028 FR-004).
