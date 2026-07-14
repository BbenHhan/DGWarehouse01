<!--
Sync Impact Report
==================
Version change: 5.0.0 → 5.1.0 (MINOR — expanded guidance under an existing principle)
Rationale for MINOR bump: Principle VII's core invariants (Supabase Auth only,
three stored roles, only an admin can change a role) are unchanged — this adds
a self-service role-request mechanism as explicit, additive guidance under the
same principle, not a redefinition of it.
Modified principles (old → new):
  - VII. Multi-User Auth with Role-Based Access Control — added: a viewer MAY
    submit a request to be upgraded to editor; this only creates a pending
    record visible to admins, never changes a role by itself; only an admin
    acting on the request (approve/deny) can change it, keeping "only an
    admin can change a role" intact; the admin's view of requests is in-app
    (part of the existing account-management screen), not an external
    email/notification service.
Added principles: none
Added sections: none
Removed sections: none
Also updated (housekeeping, not part of this amendment's substance): the
Technical Reference "User roles" bullet was still marked "not yet
implemented" from the v5.0.0 amendment even though Feature 007 has since
shipped it — corrected to reflect the real `profiles` table/trigger/
`requireRole()` helper now in the codebase, per Governance's requirement to
keep Technical Reference in sync.
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no change needed (generic gate)
  - .specify/templates/spec-template.md — ✅ no change needed
  - .specify/templates/tasks-template.md — ✅ no change needed
  - .specify/templates/checklist-template.md — ✅ no change needed
Follow-up TODOs: none.
-->

# DG Warehouse 01 — Progress Tracker Constitution

## Core Principles

### I. App Router Only
The application MUST be built exclusively on Next.js 15's App Router
(`app/`). The Pages Router (`pages/`) MUST NOT be introduced, even for
isolated routes or API handlers.
**Rationale**: Mixing routers fragments data-fetching and layout patterns
and forfeits Server Components/Server Actions, which the rest of this
stack depends on.

### II. Server Actions & Supabase Client Boundary
All mutations (upload, delete, edit) MUST go through Next.js Server
Actions — no client-side direct writes and no separate REST/API-route
layer for mutations. The Supabase client MUST be split by concern: the
server-side client (with the service role key, used only in Server
Actions/Server Components) performs mutations and privileged reads; the
client-side client (anon key) is used only for realtime subscriptions and
read-only display.
**Rationale**: Centralizing writes in Server Actions keeps authorization
and validation in one trusted place and prevents the service role key
from ever reaching the browser.

### III. Storage-Agnostic File Persistence with a Cloud Migration Path
All file uploads (images, PDFs, videos) MUST be written through a single
storage abstraction (`lib/storage.ts` + the upload Server Actions), never
directly from a component or route handler. Two backends are permitted,
selected by one flag (`DATA_SOURCE`):
- **Cloud (target)**: Supabase Storage. Required before any real
  multi-device or production use.
- **Local (interim only)**: a git-ignored writable directory on the
  server's disk, used only while no live Supabase project is configured.
  It MUST implement the same read/write contract as the cloud backend so
  switching `DATA_SOURCE` back to Supabase requires no changes to
  components, Server Action call sites, or the public data shape.

Images MUST be rendered with Next.js `<Image>` pointed at the active
backend's public URL, never plain `<img>` tags or unoptimized paths.
Videos MUST be rendered with a native `<video controls>` element (Next.js
`<Image>` does not apply to video). PDFs MUST be linked/embedded via a
direct file URL, not inlined as an image.
**Rationale**: The app is a hosted, multi-device Vercel deployment; the
long-term source of truth must be Supabase Storage so files survive
redeploys and are visible across devices. But requiring a live Supabase
project before any upload code can be written or tested blocks real
progress, so a same-contract local backend is allowed as a scaffold — as
long as it is a drop-in swap, not a fork.

### IV. Thai-First, Mobile-First UI
All user-facing UI text MUST be in Thai. Every screen MUST be designed
mobile-first, since the app's users primarily access it on mobile;
desktop/tablet layouts are progressive enhancements of the mobile layout,
never the other way around.
**Rationale**: Matches the actual usage context and avoids a
desktop-first design that degrades on the primary device.

### V. Resilient Async UX
Every async action (upload, delete, edit, fetch) MUST present an explicit
loading state and an explicit error state — silent failures or
indefinite spinners are not acceptable. Delete operations specifically
MUST use optimistic UI: the item is removed from the view immediately,
with rollback and an error message if the Server Action fails.
**Rationale**: The app still needs to communicate system state clearly
regardless of how many people are signed in, and optimistic deletes keep
it feeling responsive despite network latency to Supabase.

### VI. Tailwind-Only Styling
Styling MUST be done exclusively with Tailwind CSS v4 utility classes and
shadcn/ui components. Inline `style` attributes MUST NOT be used except
for values that are fundamentally dynamic and cannot be expressed as a
utility class (e.g., a computed transform or a server-provided color
value); such exceptions MUST be justified in a code comment at the call
site.
**Rationale**: Keeps styling consistent, themeable, and reviewable through
one system instead of two competing ones.

### VII. Multi-User Auth with Role-Based Access Control
Authentication MUST be handled by Supabase Auth using either email/password
or Google OAuth — no custom auth system, no hand-rolled credentials table
or hashing implementation. Sign-up MUST be open: anyone MUST be able to
create an account via either method; there is no invite-only or
allowlisted registration gate.

Every account MUST have exactly one stored role — `viewer`, `editor`, or
`admin` — persisted server-side, never inferred from session claims alone.
Every new sign-up MUST default to `viewer`; nothing in the sign-up flow
itself may grant a higher role. The roles are cumulative:
- **viewer**: MAY sign in and view all photos/documents. MUST NOT add,
  edit, or delete anything.
- **editor**: Everything `viewer` can do, and MUST additionally be able to
  add, edit, and delete photos and documents. MUST NOT change any
  account's role.
- **admin**: Everything `editor` can do, and MUST additionally be able to
  view and change any account's role via an admin-only user-management
  screen.

Every mutating Server Action MUST check the caller's role before
proceeding — under Principle II, "authenticated" alone is no longer
sufficient authorization for a write; the caller must also hold at least
`editor` for content mutations, or `admin` for role changes.

A viewer MAY submit a self-service request to be upgraded to `editor`.
Submitting a request MUST only create a pending record visible to admins —
it MUST NOT change the requester's role by itself. Only an admin acting on
a request (approving or denying it) MAY change the requester's role; this
does not weaken the "only an admin can change a role" invariant above, it
is the same invariant's self-service entry point. The admin-facing view of
pending requests MUST be in-app (part of the existing admin-only
account-management screen), not an external email or notification
service — no third-party integration is required for this capability.
**Rationale**: The application moved from a single trusted operator to an
open sign-up model, so authentication alone (proving *who* someone is) no
longer proves *what* they should be allowed to do. A three-role model is
the minimum needed to let new sign-ups view progress safely by default
while still letting trusted people contribute (`editor`) or administer
access (`admin`), without building a generic permissions/invites system
this project doesn't otherwise need.

### VIII. Universal File Attachments
Every module that has a data record (rooms/work-types/weeks for photos,
categories for documents, and any module added later) MUST expose a
working "add file" control accepting images, PDFs, and videos — this is
not optional per-page polish, and a new module MUST NOT ship without it.
The upload control and its validation MUST be built as a shared,
reusable component/action pair, not duplicated per module, so adding a
ninth module later means wiring the existing primitive, not writing a new
uploader. Every upload MUST validate MIME type/extension against an
explicit allowlist and enforce a file-size ceiling before the file is
persisted — both checks run the same way regardless of which storage
backend (Principle III) is active. The size ceiling MUST be set high
enough to admit real video files, not tuned only for photos.
**Rationale**: File attachment was added as a cross-cutting capability,
not a feature of one screen — building it per-module invites drift (one
page validates size, another forgets) and duplicate code that has to be
fixed in N places instead of one.

## Technical Reference

This section captures the current concrete stack and configuration that
the principles above bind code to. Update this section in the same change
whenever the stack or environment configuration changes, so it never
drifts from reality.

**Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 +
shadcn/ui + Supabase (Auth, Database, Storage, Realtime) + Vercel
(hosting/deployment).

**Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side, safe to expose),
`SUPABASE_SERVICE_ROLE_KEY` (server-side only — Server Actions/Server
Components; MUST NEVER be referenced in client components or exposed to
the browser bundle).

**Storage backend flag**: `DATA_SOURCE` (`lib/data-config.ts`) selects
`"local"` | `"mock"` | `"supabase"`. `"local"` persists uploads to a
git-ignored directory on the server disk (interim backend, Principle
III); `"mock"` reads the read-only v7 folder snapshot with no writes;
`"supabase"` is the target production backend. Exactly one is active at
a time; component code MUST NOT branch on this flag directly — only
`lib/data.ts` and `lib/storage.ts` may.

**Accepted upload MIME types**: images (`image/*`), PDFs
(`application/pdf`), videos (`video/mp4`, `video/quicktime`, `video/webm`).
The allowlist and size ceiling live in `lib/validation.ts` as the single
source of truth (Principle VIII) — no module may define its own list.

**User roles**: `viewer` | `editor` | `admin` (Principle VII), stored in a
`profiles` table (`id` = `auth.users.id`, `role`, RLS: self-select only).
A trigger on `auth.users` insert creates each account's `profiles` row with
`role = 'viewer'` by default, covering both email/password sign-up and
first-time Google OAuth. Server-side enforcement is `requireRole(minRole)`
in `lib/supabase/server.ts`, used by every mutating Server Action; the pure
rank-comparison logic lives in `lib/roles.ts`.

## Governance

This constitution supersedes ad hoc conventions for the DG Warehouse 01
Progress Tracker application. Any change that touches the Supabase
client boundary, the auth model, or the environment variable set MUST
update the Technical Reference section in the same change.

**Amendment procedure**: Propose the change, update this file (principles
and/or Technical Reference as needed), bump the version per the policy
below, and update `LAST_AMENDED_DATE`.

**Versioning policy** (semantic versioning for this document):
- MAJOR: A principle is removed or redefined in a backward-incompatible
  way (e.g., reintroducing a Pages Router, moving mutations off Server
  Actions, or dropping Supabase Storage for local files).
- MINOR: A new principle or materially expanded guidance is added.
- PATCH: Wording clarifications, typo fixes, or non-semantic refinements.

**Compliance review**: Before merging any change, verify it does not
violate Principles I–VIII and that any stack/config change is reflected in
the Technical Reference section.

**Version**: 5.1.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-09
