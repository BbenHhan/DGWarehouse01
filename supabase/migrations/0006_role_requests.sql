-- Role requests — specs/008-role-requests-search. A viewer can ask to
-- become an editor; only an admin can approve (grants the role) or deny
-- (no role change) via the Server Actions in app/actions/users.ts, which
-- use the service-role client — same pattern as profiles' own writes.

create table if not exists role_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id)
);

-- Enforces "at most one pending request per account" at the database
-- level — not just an application-side check-then-insert, which would
-- have a race window (specs/008-role-requests-search research.md Decision 1).
create unique index if not exists role_requests_one_pending_per_requester
  on role_requests (requester_id)
  where status = 'pending';

alter table role_requests enable row level security;

-- Same reasoning as profiles: self-select only, no write policy. Writes
-- happen via Server Actions using the service-role client.
drop policy if exists "select own role requests" on role_requests;
create policy "select own role requests" on role_requests
  for select
  using (auth.uid() = requester_id);

-- Adds the display name captured at sign-up (Google provides it; email/
-- password sign-ups leave it null) so the admin screen can search by name,
-- not just email (research.md Decision 3).
alter table profiles add column if not exists full_name text;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (new.id, new.email, 'viewer', new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
