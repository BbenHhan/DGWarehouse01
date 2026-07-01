# Implementation Plan: Progress Tracker Web Migration

**Branch**: `001-progress-tracker-migration` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-progress-tracker-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rebuild the DG Warehouse progress tracker as a hosted Next.js 15 + Supabase web app,
replacing the single-file local HTML viewer (v7). Users view and manage photos
(room → work type → week) and documents (4 หมวด categories) through a mobile-first,
Thai-language UI. All mutations run through Server Actions against Supabase Postgres
(metadata) and Supabase Storage (files). This is treated as a fresh application —
its own versioning is independent of the v7 viewer; v7 is referenced only as the
one-time source for the optional data-migration seed script, not as a numbering
baseline to continue.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 15 (React 19), Node.js runtime on Vercel

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui,
`@supabase/supabase-js`, `@supabase/ssr`, Zod (Server Action input validation)

**Storage**: Supabase Postgres (rooms, work types, weeks, photos, document
categories, documents metadata) + Supabase Storage (photo/document binaries, two
buckets: `photos`, `documents`)

**Testing**: No automated test suite requested in the spec; correctness is
validated manually via `quickstart.md`. Automated tests can be added later as a
separate, explicitly-requested effort.

**Target Platform**: Vercel (serverless/edge functions) serving a responsive web
app in the browser (mobile primary, desktop secondary)

**Project Type**: Single Next.js project (App Router combines UI + Server Actions;
no separate backend service)

**Performance Goals**: Perceived-instant navigation between room/work-type/week
views; optimistic delete reflected in the UI in well under 1s (SC-003); batch
upload of 10 photos completes and renders without a manual refresh (SC-002)

**Constraints**: App Router only, Server Actions for all mutations, Supabase
client split by server/client concern, cloud-only storage (no local filesystem),
Tailwind-only styling (no inline styles), Thai-language UI, mobile-first layout,
single-user auth (magic link or Google OAuth) — all per the project constitution

**Scale/Scope**: Single user; 6 rooms (ห้องแรก, ห้องกลาง, ห้องซอย 1–4) × 6 work
types each; open-ended weeks per room/work-type (grows over the life of the
construction project); 4 fixed document categories; photo volume expected in the
hundreds to low thousands over time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | How the plan satisfies it |
|---|-----------|--------|----------------------------|
| I | App Router Only | PASS | All routes live under `app/`; no `pages/` directory is introduced |
| II | Server Actions & Supabase Client Boundary | PASS | `uploadPhoto`, `deletePhoto`, `editPhoto`, `uploadDoc`, `deleteDoc`, `editDoc` are Server Actions using the server-side Supabase client; `lib/supabase/client.ts` (anon key) is used only for realtime subscriptions and read-only display |
| III | Cloud-Only Storage & Optimized Images | PASS | All uploads go to Supabase Storage buckets (`photos`, `documents`); photo display uses Next.js `<Image>` against Supabase public URLs |
| IV | Thai-First, Mobile-First UI | PASS | All UI copy in Thai; layouts designed mobile-first with desktop as progressive enhancement |
| V | Resilient Async UX | PASS | Every Server Action call site has loading + error UI states; `deletePhoto`/`deleteDoc` use optimistic removal with rollback on failure |
| VI | Tailwind-Only Styling | PASS | Styling via Tailwind v4 utilities + shadcn/ui components; no inline `style` usage planned |
| VII | Single-User Auth via Supabase | PASS | Supabase Auth magic link (Google OAuth as a documented alternative); no multi-user/role model introduced |

No violations identified. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-progress-tracker-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                     # Root layout: Thai lang, fonts, auth session provider
├── page.tsx                       # Redirects to /photos
├── login/
│   └── page.tsx                   # Magic-link / Google OAuth sign-in screen
├── auth/
│   └── callback/
│       └── route.ts               # Supabase auth callback (exchanges code for session)
├── photos/
│   ├── page.tsx                   # Room selector (redirects to last/first room)
│   └── [roomSlug]/
│       └── [workTypeSlug]/
│           └── page.tsx           # Week tabs + PhotoGrid for this room/work-type
├── documents/
│   └── [categorySlug]/
│       └── page.tsx               # DocList for one หมวด category
└── actions/
    ├── photos.ts                  # uploadPhoto, deletePhoto, editPhoto Server Actions
    └── documents.ts               # uploadDoc, deleteDoc, editDoc Server Actions

components/
├── PhotoGrid.tsx                  # Grid of photo thumbnails for a room/work-type/week
├── PhotoUploader.tsx              # Single/batch photo upload control + progress/error UI
├── DocList.tsx                    # List of documents for a หมวด category
├── DocUploader.tsx                # Document upload control + progress/error UI
├── EditModal.tsx                  # Shared rename/note/move dialog for photos and documents
├── Lightbox.tsx                   # Full-screen photo viewer with next/prev navigation
├── RoomWorkTypeNav.tsx             # Room + work-type + week tab navigation
└── ui/                            # shadcn/ui primitives (button, dialog, tabs, toast, etc.)

lib/
├── supabase/
│   ├── server.ts                  # Server-side Supabase client (service role; Server Actions only)
│   ├── client.ts                  # Browser Supabase client (anon key; realtime/display only)
│   └── middleware.ts              # Session refresh helper used by middleware.ts
├── types.ts                       # Shared TS types: Room, WorkType, Week, Photo, Category, Document
└── validation.ts                  # Zod schemas validating Server Action inputs

middleware.ts                      # Refreshes Supabase auth session on each request

supabase/
├── migrations/                    # SQL: tables, indexes, RLS policies, storage bucket policies
└── seed/
    └── seed-from-v7.ts            # OPTIONAL: one-time import from the v7 local folder structure
```

**Structure Decision**: Single Next.js project (no `backend/`/`frontend/` split —
App Router Server Actions remove the need for a separate API layer). Feature code
is organized by route segment under `app/`, with cross-route UI in `components/`
and framework-agnostic logic in `lib/`. Database schema and the optional v7 import
script live under `supabase/` since they are infrastructure, not application code.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally left empty.*
