# DG Warehouse 01 — Progress Tracker

Construction progress tracker for DG Warehouse 01 — photo & document
management by room, work type, and week. A Next.js 15 + Supabase rebuild of
the original single-file v7 HTML viewer.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase
(Auth, Postgres, Storage, Realtime) · Vercel

See [.specify/memory/constitution.md](.specify/memory/constitution.md) for the
project's non-negotiable principles, and
[specs/001-progress-tracker-migration/](specs/001-progress-tracker-migration/)
for the full spec/plan/tasks behind this build.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up a Supabase project** (or use an existing one) — see
   [DEPLOYMENT.md](DEPLOYMENT.md) for the full walkthrough (running the
   migrations in `supabase/migrations/`, enabling Auth providers, etc.).

3. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's **Settings → API**
   page. The service role key is server-only — never expose it to the browser.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You'll be redirected
   to `/login` until you sign in with the one account provisioned in Supabase
   Auth (magic link or Google OAuth).

## Project structure

```text
app/                    Routes: /login, /auth/callback, /photos/..., /documents/...
  actions/               Server Actions (uploadPhoto, deletePhoto, editPhoto, ...)
components/              PhotoGrid, Lightbox, DocList, EditModal, uploaders, nav
  ui/                    shadcn/ui primitives
lib/                     Supabase client factories, shared types, validation, data access
supabase/
  migrations/            SQL: schema, RLS, storage buckets, seed data
  seed/                  Optional one-time v7 data import script
specs/001-progress-tracker-migration/   Spec, plan, research, data model, tasks
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Supabase + Vercel deployment
walkthrough, including the optional v7 data import script.
