-- Row Level Security — single-tenant (one real user), per
-- specs/001-progress-tracker-migration/contracts/supabase-setup.md
-- No anon policy is created anywhere (spec FR-017: no anonymous access).

alter table rooms enable row level security;
alter table work_types enable row level security;
alter table weeks enable row level security;
alter table photos enable row level security;
alter table document_categories enable row level security;
alter table documents enable row level security;

-- Fixed lookups: authenticated read-only (changes only via migration)
drop policy if exists "authenticated read rooms" on rooms;
create policy "authenticated read rooms" on rooms
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated read work_types" on work_types;
create policy "authenticated read work_types" on work_types
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated read document_categories" on document_categories;
create policy "authenticated read document_categories" on document_categories
  for select
  using (auth.role() = 'authenticated');

-- Mutable tables: authenticated full access
drop policy if exists "authenticated full access weeks" on weeks;
create policy "authenticated full access weeks" on weeks
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access photos" on photos;
create policy "authenticated full access photos" on photos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access documents" on documents;
create policy "authenticated full access documents" on documents
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
