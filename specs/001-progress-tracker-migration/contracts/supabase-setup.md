# Contract: Supabase Project Setup

Defines the tables, storage buckets, and RLS policies the app depends on. This is
the contract between the app code and the Supabase project — implementation
(actual SQL migration files) happens in `supabase/migrations/` during
`/speckit-tasks` + `/speckit-implement`.

## Tables

`rooms`, `work_types`, `weeks`, `photos`, `document_categories`, `documents` — see
[data-model.md](../data-model.md) for full column definitions.

## Row Level Security

The app is single-tenant (one real user). Policy shape for every table:

```sql
-- Enable RLS
alter table <table> enable row level security;

-- Authenticated user can select/insert/update/delete
create policy "authenticated full access" on <table>
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

Applied to: `weeks`, `photos`, `documents`. `rooms`, `work_types`, and
`document_categories` are fixed lookups — `select` open to `authenticated`, no
`insert`/`update`/`delete` policy (changes only via migration).

No anonymous (`anon`) policy is created on any table — satisfies constitution
Principle VII / spec FR-017 (no anonymous access).

## Storage Buckets

| Bucket | Public read | Write/Delete |
|---|---|---|
| `photos` | Yes (public URL for Next.js `<Image>`, research.md §7) | `authenticated` only, via Storage RLS |
| `documents` | Yes (public URL for preview/download) | `authenticated` only, via Storage RLS |

```sql
-- Storage policy shape (per bucket)
create policy "public read <bucket>" on storage.objects
  for select using (bucket_id = '<bucket>');

create policy "authenticated write <bucket>" on storage.objects
  for insert with check (bucket_id = '<bucket>' and auth.role() = 'authenticated');

create policy "authenticated delete <bucket>" on storage.objects
  for delete using (bucket_id = '<bucket>' and auth.role() = 'authenticated');
```

## Auth

- Supabase Auth providers enabled: Email (magic link) and Google OAuth.
- Redirect URL: `{APP_URL}/auth/callback`, handled by `app/auth/callback/route.ts`.
- No sign-up flow is exposed in the UI — the single account is provisioned
  directly in the Supabase dashboard.
