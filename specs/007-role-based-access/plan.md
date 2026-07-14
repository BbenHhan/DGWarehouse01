# Implementation Plan: Open Sign-Up with Role-Based Access Control

**Branch**: `007-role-based-access` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-role-based-access/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the implicit "any authenticated account = full access" model with three stored roles (`viewer` default, `editor`, `admin`). A new `profiles` table (populated by a trigger on every sign-up, including first-time Google OAuth) holds each account's role; every mutating Server Action gains a role check; the existing single account becomes `admin` via a one-time migration bootstrap; a new admin-only screen lets an admin change any account's role; existing mutation UI (uploaders, edit/delete buttons, add/delete-week) is gated on role using the exact conditional pattern already used for `USE_MOCK_DATA`.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` (service-role client, already in use), shadcn/ui components, Tailwind CSS v4

**Storage**: Supabase Postgres — one new table (`profiles`), no changes to existing tables' schemas (data-model.md)

**Testing**: Vitest for the one pure module this feature introduces (`lib/roles.ts` — role-rank comparison); everything else (the trigger, the bootstrap, RLS, Server Action role checks) is live-verified via quickstart.md, consistent with how Features 006/004 handled Supabase-dependent logic with no live project available to a test runner

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: Role checks add one indexed single-row lookup per mutating action — negligible relative to existing Supabase round trips already on those paths

**Constraints**: Thai-first UI text (Constitution IV), Tailwind-only styling via existing shadcn components (Constitution VI), explicit loading/error states on every async action including role changes (Constitution V)

**Scale/Scope**: One new table + migration, one new small pure module + test, one new Server Action file (`app/actions/users.ts`), one new admin screen, and role-gating edits threaded through the existing mutation surface (2 page files, `PhotoGrid`, `DocList`, `WorkTypeWeekNav`, `AccountMenu`/`Header`, and the `assertAuthenticated` call sites in `photos.ts`/`documents.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ New route (`app/(app)/admin/users/page.tsx`) lives under `app/`; no Pages Router touched.
- **II. Server Actions & Supabase Client Boundary**: ✅ Role reads (via `getUserRole`) and role writes (`updateUserRole`) both go through the service-role client from within Server Actions/Server Components, matching the existing boundary exactly — no new client-side write path is introduced. This feature is, in fact, what makes Principle II's authorization boundary do real work for the first time (research.md Decision 3).
- **III. Storage-Agnostic File Persistence**: N/A — no file-handling changes; role gating wraps existing upload UI without touching the storage abstraction itself.
- **IV. Thai-First, Mobile-First UI**: ✅ New admin screen and all new copy (role labels, permission-denied messages) in Thai, mobile-first layout consistent with the rest of the app.
- **V. Resilient Async UX**: ✅ Sign-up, role changes, and access-denied outcomes all get explicit loading/error states (FR-014); planned in tasks.md.
- **VI. Tailwind-Only Styling**: ✅ Reuses existing shadcn primitives (table/select/button patterns already in the codebase via `EditModal`/`AlertDialog`).
- **VII. Multi-User Auth with Role-Based Access Control**: ✅ This feature *is* the implementation of the just-amended principle.
- **VIII. Universal File Attachments**: N/A — this feature doesn't add a file-bearing module; it changes *who* can use the existing ones.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-role-based-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this feature adds Server Actions and a database
table to an existing single Next.js app; it doesn't expose a new external
API/interface contract of its own.

### Source Code (repository root)

Single Next.js project (existing structure, no new project/package):

```text
supabase/migrations/
└── 0005_roles.sql              # NEW: profiles table, trigger, bootstrap admin, RLS (data-model.md)

lib/
├── roles.ts                     # NEW: Role type, ROLE_RANK, canEdit(role)/isAdmin(role) — pure, testable
├── roles.test.ts                # NEW: Vitest coverage for roles.ts
└── supabase/
    └── server.ts                 # MODIFIED: add getUserRole()/requireRole(); extend getCurrentUser() to return role

app/
├── actions/
│   ├── photos.ts                 # MODIFIED: assertAuthenticated() → assertCanEdit() (requireRole("editor"))
│   ├── documents.ts              # MODIFIED: same swap as photos.ts
│   └── users.ts                  # NEW: listAccounts(), updateUserRole() — both requireRole("admin")
└── (app)/
    ├── layout.tsx                 # MODIFIED: getCurrentUser() now carries role; passed to Header
    ├── admin/
    │   └── users/
    │       └── page.tsx            # NEW: admin-only account list + role-change UI
    ├── photos/[roomSlug]/[workTypeSlug]/page.tsx   # MODIFIED: compute canEdit, AND into existing USE_MOCK_DATA gates
    └── documents/[categorySlug]/page.tsx           # MODIFIED: same as photos page

components/
├── PhotoGrid.tsx                  # MODIFIED: new canEdit prop, ANDed into existing edit/delete-button gate
├── DocList.tsx                    # MODIFIED: same as PhotoGrid
├── WorkTypeWeekNav.tsx            # UNCHANGED: showActions prop already exists — caller now passes canEdit too
├── AccountMenu.tsx                # MODIFIED: new role prop, conditional "จัดการผู้ใช้" (Manage users) link for admin
├── Header.tsx                     # MODIFIED: thread role through to AccountMenu
└── UserRoleTable.tsx               # NEW: client component, one row per account with a role <Select>, calls updateUserRole
```

**Structure Decision**: This is an authorization layer added on top of the existing app, not a new subsystem — no new project, no new page hierarchy beyond one admin screen. The database change is additive (one new table); every other change is either a new, small, focused file (`lib/roles.ts`, `app/actions/users.ts`, `UserRoleTable.tsx`, the admin page) or a targeted extension of an existing gate (`USE_MOCK_DATA` → `USE_MOCK_DATA && canEdit`) at call sites that already exist for exactly this purpose.

## Complexity Tracking

*No violations — this section is intentionally empty.*
