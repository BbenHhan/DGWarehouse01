# Deployment Guide

Steps to take DG Warehouse 01 from this repo to a live Vercel deployment backed
by a real Supabase project. Steps marked **(you)** need your own Vercel/Supabase
account access — they can't be done from this environment.

## 1. Create the Supabase project **(you)**

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the six migrations in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`
   - `supabase/migrations/0004_seed_lookups.sql`
   - `supabase/migrations/0005_roles.sql` — creates the `profiles`/role
     system (specs/007-role-based-access) and makes the account under the
     email hardcoded in that migration file the initial admin; edit that
     email in the migration before running it if it's not yours
   - `supabase/migrations/0006_role_requests.sql` — adds the self-service
     role-request flow and `profiles.full_name` for admin search
     (specs/008-role-requests-search)
3. Confirm the seed worked: `select * from rooms` should return 6 rows,
   `work_types` 6 rows, `document_categories` 4 rows.
4. Under **Authentication → Providers**, enable **Email** (powers email/password
   sign-in and the "forgot password" reset-link flow) and **Google** (add your
   OAuth client ID/secret from the Google Cloud Console).
5. Under **Authentication → URL Configuration**, you'll add the production
   redirect URL once you know your Vercel domain (step 3 below).
6. Sign-up is open to anyone (specs/007-role-based-access) — new accounts
   default to view-only automatically, so there's no "provision your user"
   step; the admin account is whichever email you targeted in step 2's
   `0005_roles.sql` run, and that admin can promote other accounts to
   editor/admin later from **จัดการผู้ใช้** in the app itself.
7. Copy from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

## 2. Local verification against the real project **(you, optional)**

```bash
cp .env.local.example .env.local
# fill in the three values from step 1.7
npm install
npm run dev
```

Run through [specs/001-progress-tracker-migration/quickstart.md](specs/001-progress-tracker-migration/quickstart.md)
locally before deploying.

## 3. Deploy to Vercel **(you)**

1. [Import the GitHub repo](https://vercel.com/new) `BbenHhan/DGWarehouse01`.
2. Framework preset: Next.js (auto-detected).
3. Add the three environment variables from step 1.7 under **Settings →
   Environment Variables** (all three as **Production** — plus **Preview** if
   you want preview deployments to work).
4. Deploy. Note the resulting domain (e.g. `dgwarehouse01.vercel.app`).
5. Back in Supabase, add `https://<your-domain>/auth/callback` to
   **Authentication → URL Configuration → Redirect URLs**.
6. Also add the same URL as an authorized redirect URI on your Google OAuth
   client, if using Google sign-in.

## 4. Post-deploy checks **(you)**

Run through [quickstart.md](specs/001-progress-tracker-migration/quickstart.md)
against the production URL: sign in, view photos/documents, upload, edit,
delete, and check mobile width (375px) — all with no horizontal scrolling.

## 5. Optional: import existing v7 data **(you, one-time)**

If you have the old v7 local folder structure and want to bring its photos/
documents into the new app:

```bash
NEXT_PUBLIC_SUPABASE_URL=<from step 1.7> \
SUPABASE_SERVICE_ROLE_KEY=<from step 1.7> \
npx tsx supabase/seed/seed-from-v7.ts "D:\Claude\Projects\DGWarehouse"
```

This only needs to run once, from your own machine (it needs local filesystem
access to the v7 folders) — it is not part of the deployed app.
