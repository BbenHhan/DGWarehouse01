-- specs/040-editable-document-taxonomy — give sub-groups (หมวดย่อย) an
-- existence of their own.
--
-- Until now a sub-group was `documents.note`: a piece of text copied onto every
-- document that belonged to it, with the list of groups recomputed at render
-- time from whatever the documents happened to carry. So a group could not
-- exist before a file did, could not be renamed as one thing, and had no order.
--
-- This is a one-way migration. It ends by dropping `note`, so the backfill is
-- verified first and the whole thing aborts rather than destroying anything it
-- failed to carry over (spec FR-006, SC-008).

create table if not exists document_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references document_categories (id) on delete cascade,
  name_th text not null check (btrim(name_th) <> ''),
  sort_order int not null,
  created_at timestamptz not null default now(),
  unique (category_id, name_th)
);

create index if not exists document_groups_category_idx on document_groups (category_id);

alter table document_groups enable row level security;

-- Same "authenticated full access" shape as every other table in this project
-- (0008_week_cadences.sql, 0010_checklist.sql) — the real authorization is the
-- requireRole("editor") check in the Server Action, not RLS.
drop policy if exists "authenticated full access document_groups" on document_groups;
create policy "authenticated full access document_groups" on document_groups
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- One group per distinct (category, note). Order comes from the names
-- themselves: they are already numbered by hand ("0. …", "1.1 …", "1.2 …"), so
-- sorting them as text reproduces the order the account holder intended. The
-- display order they have today is whichever document was encountered first,
-- which is not an order anyone chose (research.md Decision 2).
insert into document_groups (category_id, name_th, sort_order)
select
  distinct_notes.category_id,
  distinct_notes.note,
  row_number() over (partition by distinct_notes.category_id order by distinct_notes.note)
from (
  select distinct category_id, note
  from documents
  where note is not null and btrim(note) <> ''
) as distinct_notes
on conflict (category_id, name_th) do nothing;

-- `on delete restrict`, not cascade or set null: the database itself must
-- refuse to drop a group out from under its documents, so the "move them or
-- delete them" decision (FR-011) cannot be bypassed by a bug in application
-- code. The delete flow re-parents or removes the documents first.
alter table documents add column if not exists group_id uuid references document_groups (id) on delete restrict;

update documents d
set group_id = g.id
from document_groups g
where g.category_id = d.category_id
  and g.name_th = d.note
  and d.note is not null
  and btrim(d.note) <> '';

-- The guard. Everything above is reversible; the drop below is not.
do $$
declare
  orphaned int;
begin
  select count(*) into orphaned
  from documents
  where note is not null and btrim(note) <> '' and group_id is null;

  if orphaned > 0 then
    raise exception
      'Backfill incomplete: % document(s) carry a note but got no group_id. Aborting before dropping documents.note.',
      orphaned;
  end if;
end $$;

alter table documents drop column if exists note;

create index if not exists documents_group_idx on documents (group_id);
