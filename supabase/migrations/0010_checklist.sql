-- Room checklist (specs/028-room-checklist) — free-text, checkable tasks,
-- optionally tagged to one or more rooms, so an inspector-driven task can be
-- added on the spot and seen by the whole team, both sitewide and scoped to
-- the specific room it was tagged to.

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  text text not null check (btrim(text) <> ''),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many: an item can be tagged to zero, one, or several rooms.
create table if not exists checklist_item_rooms (
  checklist_item_id uuid not null references checklist_items (id) on delete cascade,
  room_id uuid not null references rooms (id) on delete cascade,
  primary key (checklist_item_id, room_id)
);

create index if not exists checklist_item_rooms_room_idx on checklist_item_rooms (room_id);

alter table checklist_items enable row level security;
alter table checklist_item_rooms enable row level security;

-- Same "authenticated full access" shape as every other table in this
-- project (e.g. 0008_week_cadences.sql) — real viewer/editor authorization
-- happens in Server Actions via requireRole(), not RLS.
drop policy if exists "authenticated full access checklist_items" on checklist_items;
create policy "authenticated full access checklist_items" on checklist_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access checklist_item_rooms" on checklist_item_rooms;
create policy "authenticated full access checklist_item_rooms" on checklist_item_rooms
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
