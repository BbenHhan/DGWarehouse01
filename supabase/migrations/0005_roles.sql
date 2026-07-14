-- Role-based access control — specs/007-role-based-access.
-- One row per Supabase Auth account, created automatically on sign-up
-- (email/password signUp() or first-time Google OAuth, both insert into
-- auth.users the same way). Every new account defaults to 'viewer'; only
-- an admin can change a role afterward (via the updateUserRole Server
-- Action, which uses the service-role client — never this table's own
-- RLS write path, since none exists).

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Only a self-select policy — no insert/update/delete policy for the
-- anon-key client. Row creation happens via the trigger below (security
-- definer, bypasses RLS); role changes happen via the admin-only Server
-- Action (service-role client, also bypasses RLS). Nothing should ever
-- let an account write its own profiles row from the browser.
drop policy if exists "select own profile" on profiles;
create policy "select own profile" on profiles
  for select
  using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Bootstrap: the account holder used throughout this project becomes
-- admin the moment this migration runs — no manual dashboard step
-- (specs/007-role-based-access FR-013). Backfills any account that
-- already existed in auth.users before this migration (the trigger above
-- only fires on new inserts going forward).
insert into public.profiles (id, email, role)
select id, email, 'viewer' from auth.users
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where email = 'nextgennglc@gmail.com';
