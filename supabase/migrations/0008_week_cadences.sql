-- Recurring cadence configuration for week date-range selection —
-- specs/016-recurring-period-generator. A null work_type_id row is the
-- sitewide default; a non-null work_type_id row is that work type's
-- override. Two partial unique indexes enforce "at most one sitewide row"
-- and "at most one row per work type" — a plain unique(work_type_id) would
-- NOT prevent multiple sitewide rows, since Postgres treats every NULL as
-- distinct under a standard unique constraint (research.md Decision 1).

create table if not exists week_cadences (
  id uuid primary key default gen_random_uuid(),
  work_type_id uuid references work_types (id) on delete cascade,
  interval_value int not null check (interval_value > 0),
  interval_unit text not null check (interval_unit in ('day', 'month', 'year')),
  origin_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists week_cadences_global_unique
  on week_cadences ((true)) where work_type_id is null;

create unique index if not exists week_cadences_work_type_unique
  on week_cadences (work_type_id) where work_type_id is not null;

alter table week_cadences enable row level security;

-- Same "authenticated" RLS shape as every other table (0002_rls.sql) — real
-- authorization (admin-only writes, editor+ reads) is enforced in the
-- Server Action layer (app/actions/cadence.ts), not at the RLS layer.
drop policy if exists "authenticated full access week_cadences" on week_cadences;
create policy "authenticated full access week_cadences" on week_cadences
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
