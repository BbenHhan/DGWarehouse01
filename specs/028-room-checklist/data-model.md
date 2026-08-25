# Data Model: Room Checklist

## Schema (`supabase/migrations/0010_checklist.sql`)

```sql
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  text text not null check (btrim(text) <> ''),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checklist_item_rooms (
  checklist_item_id uuid not null references checklist_items (id) on delete cascade,
  room_id uuid not null references rooms (id) on delete cascade,
  primary key (checklist_item_id, room_id)
);

create index if not exists checklist_item_rooms_room_idx on checklist_item_rooms (room_id);

alter table checklist_items enable row level security;
alter table checklist_item_rooms enable row level security;

drop policy if exists "authenticated full access checklist_items" on checklist_items;
create policy "authenticated full access checklist_items" on checklist_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access checklist_item_rooms" on checklist_item_rooms;
create policy "authenticated full access checklist_item_rooms" on checklist_item_rooms
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

RLS shape matches every other table's "authenticated full access" policy in this project (e.g. `week_cadences` in migration 0008) — real viewer/editor authorization happens in Server Actions via `requireRole()`, not RLS, consistent with Constitution II/VII.

## `lib/types.ts`

```ts
export type ChecklistItem = {
  id: string;
  text: string;
  is_done: boolean;
  room_ids: string[]; // derived from the join, not a raw column
  created_at: string;
  updated_at: string;
};
```

## `lib/database.types.ts`

New `checklist_items` and `checklist_item_rooms` table type blocks, hand-written to match the migration above column-for-column, following this file's existing convention for every other table.

## Server Actions (`app/actions/checklist.ts`)

- `addChecklistItem(text: string, roomIds: string[]): Promise<ActionResult<ChecklistItem>>` — editor+.
- `toggleChecklistItem(id: string, isDone: boolean): Promise<ActionResult<ChecklistItem>>` — editor+.
- `editChecklistItem(input: { id: string; text?: string; roomIds?: string[] }): Promise<ActionResult<ChecklistItem>>` — editor+; room-tag update is a full replace (delete existing junction rows for that item, insert the new set) rather than a diff, matching how a small tag-set is simplest to reason about.
- `deleteChecklistItem(id: string): Promise<ActionResult<{ id: string }>>` — editor+; junction rows cascade automatically via the FK.

## `lib/data.ts`

- `getChecklistItems(): Promise<ChecklistItem[]>` — every item sitewide, `room_ids` populated via a joined select, ordered `created_at` descending.
- `getRoomChecklistItems(roomId: string): Promise<ChecklistItem[]>` — items where `checklist_item_rooms.room_id = roomId` and `is_done = false`, via an inner-join filter.

Both branch by `DATA_SOURCE` the same way every other `lib/data.ts` function does: `mock` → always `[]`; `local` → `lib/local/store.ts`'s JSON-backed equivalents (storing `room_ids: string[]` directly on the local record, no separate junction file needed since it's not a relational store); `supabase` → the real queries above.

## UI contracts

- **`ChecklistList`** (new, `/checklist` page): props `{ items: ChecklistItem[]; rooms: Room[]; canEdit: boolean }`. Add-form (text + multi-select room tags) + list of items with checkbox, room-tag chips, edit (pencil, reusing the `EditModal` pattern's shape but a dedicated small modal since the field set differs from photos/documents), delete.
- **`RoomChecklistBox`** (new, room/work-type page sidebar): props `{ roomId: string; items: ChecklistItem[]; canEdit: boolean }` — `items` pre-filtered server-side to that room's not-done items. Quick-add input (auto-tags `roomId`), checkbox toggle per item, no room-tag picker needed here (always exactly this room) and no delete/edit here (kept minimal — full editing lives on `/checklist`).
