# Implementation Plan: Role Requests & User Search

**Branch**: `008-role-requests-search` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-role-requests-search/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a self-service "request editor access" flow for viewers (one pending request at a time, enforced by a partial unique index) and an in-app pending-requests section on the existing `/admin/users` screen where an admin approves (grants `editor`) or denies (no role change) — plus client-side search on that same screen by email or name (name captured via a new `profiles.full_name` column, populated by the existing sign-up trigger). No external email/notification service; everything reuses Feature 007's `requireRole()`/service-role-client pattern.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` (service-role client, already in use), shadcn/ui components, Tailwind CSS v4

**Storage**: Supabase Postgres — one new table (`role_requests`), one new column on the existing `profiles` table (`full_name`) (data-model.md)

**Testing**: No new Vitest coverage — everything in this feature is a live Supabase interaction (partial unique index, conditional updates, RLS) with no pure-logic surface to extract, same reasoning as Features 006/007's non-`lib/`-helper pieces (research.md Decision 8); verified live via quickstart.md

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: Search is client-side over an already-small, already-fetched account list — no new query latency; request/approve/deny each add one or two indexed single-row operations, negligible relative to existing round trips

**Constraints**: Thai-first UI text (Constitution IV), Tailwind-only styling via existing shadcn components (Constitution VI), explicit loading/error/empty states on every async action (Constitution V), no third-party email/notification integration (Constitution v5.1.0)

**Scale/Scope**: One new table + one new column + their migration, extensions to the existing `app/actions/users.ts` and `UserRoleTable.tsx`/`admin/users/page.tsx` from Feature 007, one new menu item in `AccountMenu.tsx` for viewers, one new small component for the pending-requests list

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ No new routes needed — `/admin/users` (Feature 007) gains a section; no Pages Router touched.
- **II. Server Actions & Supabase Client Boundary**: ✅ `requestEditorAccess`/`approveRoleRequest`/`denyRoleRequest` all go through Server Actions using the service-role client, extending `app/actions/users.ts`'s existing pattern exactly — no new client-side write path.
- **III. Storage-Agnostic File Persistence**: N/A — no file-handling changes.
- **IV. Thai-First, Mobile-First UI**: ✅ All new copy (request button, pending list, approve/deny, search placeholder, empty states) in Thai, mobile-first.
- **V. Resilient Async UX**: ✅ Request submission, approve, deny, and search all get explicit loading/error/empty states (FR-012).
- **VI. Tailwind-Only Styling**: ✅ Reuses existing shadcn `Input`/`Button`/`DropdownMenuItem` primitives already in the codebase.
- **VII. Multi-User Auth with Role-Based Access Control**: ✅ This feature is the direct implementation of the v5.1.0 amendment (self-service role requests, in-app only, admin-only resolution).
- **VIII. Universal File Attachments**: N/A — no file attachments involved.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-role-requests-search/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — same reasoning as Features 006/007: no new external API/interface contract, only Server Actions and a database change within the existing app.

### Source Code (repository root)

Single Next.js project (existing structure, no new project/package):

```text
supabase/migrations/
└── 0006_role_requests.sql      # NEW: role_requests table + partial unique index + RLS; profiles.full_name column; trigger update

lib/
└── types.ts                     # MODIFIED: add RoleRequest type; extend Account with full_name

app/actions/
└── users.ts                     # MODIFIED: add requestEditorAccess(), listPendingRoleRequests(), approveRoleRequest(), denyRoleRequest(); extend listAccounts() to select full_name

app/(app)/
├── layout.tsx                    # MODIFIED: also fetch whether the current user has a pending request, pass to Header/AccountMenu
└── admin/users/page.tsx           # MODIFIED: also fetch + render pending requests section above/alongside the account table

components/
├── AccountMenu.tsx                # MODIFIED: viewer-only "ขอสิทธิ์แก้ไข" item (or pending indicator) calling requestEditorAccess()
├── Header.tsx                     # MODIFIED: thread hasPendingRequest through to AccountMenu
├── UserRoleTable.tsx               # MODIFIED: add search input, client-side filter by email/full_name
└── PendingRequestsList.tsx         # NEW: client component listing pending requests with approve/deny buttons
```

**Structure Decision**: Purely additive on top of Feature 007's shape — one new table, one new column, new Server Actions alongside the existing ones in `app/actions/users.ts` (not a new file, since they're the same "account administration" concern), and UI extensions to the exact two places (`AccountMenu`, `/admin/users`) Feature 007 already established as the role-management surface.

## Complexity Tracking

*No violations — this section is intentionally empty.*
