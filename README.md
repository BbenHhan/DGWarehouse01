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

## v1 status: read-only mock data, no backend yet

This version (**v1**, `package.json` version `1.0.0`) is a **display-only**
build:

- **Auth is disabled** (`lib/auth-config.ts`, `AUTH_REQUIRED = false`) — no
  login required.
- **Data is read directly from the local v7 folder**
  (`lib/data-config.ts`, `USE_MOCK_DATA = true`), not from Supabase. See
  `lib/mock/source.ts` for the folder → room/work-type/week/photo mapping and
  `app/api/mock-file/[...segments]/route.ts` for how files are streamed from
  disk. Set `MOCK_DATA_ROOT` in `.env.local` if the v7 folder isn't at
  `D:\Claude\Projects\DGWarehouse`.
- **Upload/edit/delete UI is hidden** while `USE_MOCK_DATA` is true — the
  Supabase-backed Server Actions and components for all of that are fully
  built (see Phases 2–10 of
  [tasks.md](specs/001-progress-tracker-migration/tasks.md)) but intentionally
  not wired up yet, per project direction to ship a display-first v1.
- This mode **only works when run on the machine that has the v7 folder** —
  it isn't meant to be deployed to Vercel as-is.

Flip `AUTH_REQUIRED` and `USE_MOCK_DATA` back to `true`/`false` respectively
once a real Supabase project exists (see below) to get the fully-working
version with auth and upload/edit/delete back.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **(v1, current)** No further setup needed — `npm run dev` reads directly
   from the local v7 folder. Skip to step 4.

   **(future, once ready for the real backend)** Set up a Supabase project
   — see [DEPLOYMENT.md](DEPLOYMENT.md) for the full walkthrough (running the
   migrations in `supabase/migrations/`, enabling Auth providers, etc.).

3. **(future)** Configure environment variables

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

   Open [http://localhost:3000](http://localhost:3000).

## Running tests

```bash
npm test
```

Runs the full Vitest suite once (`npm run test:watch` re-runs on file
changes). No live Supabase project or network access is required — tests
cover pure logic (date-range overlap, file validation, the local storage
backend's cascading delete/sort) using a disposable temp directory, never the
real `.local-data/` folder used by `npm run dev`. See
[specs/005-automated-testing/](specs/005-automated-testing/) for the full
spec/plan behind this setup.

Test files are colocated next to what they test (e.g. `lib/date-range.test.ts`
next to `lib/date-range.ts`) — `lib/date-range.test.ts` is the simplest one to
copy as a starting point for a new test.

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
