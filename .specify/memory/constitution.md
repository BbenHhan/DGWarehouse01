<!--
Sync Impact Report
==================
Version change: 2.0.0 → 3.0.0 (MAJOR — storage rule redefinition)
Rationale for MAJOR bump: Principle III previously mandated "no local
filesystem persistence anywhere in the app." This change carves out an
explicit, flagged interim exception (local disk-backed storage until a live
Supabase project exists) — the versioning policy itself names "dropping
Supabase Storage for local files" as a MAJOR-bump example, so this is MAJOR
even though the exception is scoped and temporary by design.
Modified principles (old → new):
  - III. Cloud-Only Storage & Optimized Images → III. Storage-Agnostic File
    Persistence with a Cloud Migration Path (permits a flagged interim local
    disk backend; still requires eventual migration to Supabase Storage;
    expands media handling from images-only to image/PDF/video)
Added principles:
  - VIII. Universal File Attachments (every module/data-record type must
    expose a working add-file control for image/PDF/video; validation of
    type/extension and size is mandatory and centralized, not per-page)
Added sections: none (Technical Reference expanded in place)
Removed sections: none
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
mobile-first, since the primary and sole user (Bell) uses the app on
mobile; desktop/tablet layouts are progressive enhancements of the mobile
layout, never the other way around.
**Rationale**: Matches the actual usage context and avoids a
desktop-first design that degrades on the primary device.

### V. Resilient Async UX
Every async action (upload, delete, edit, fetch) MUST present an explicit
loading state and an explicit error state — silent failures or
indefinite spinners are not acceptable. Delete operations specifically
MUST use optimistic UI: the item is removed from the view immediately,
with rollback and an error message if the Server Action fails.
**Rationale**: A single-user tool still needs to communicate system state
clearly, and optimistic deletes keep the app feeling responsive despite
network latency to Supabase.

### VI. Tailwind-Only Styling
Styling MUST be done exclusively with Tailwind CSS v4 utility classes and
shadcn/ui components. Inline `style` attributes MUST NOT be used except
for values that are fundamentally dynamic and cannot be expressed as a
utility class (e.g., a computed transform or a server-provided color
value); such exceptions MUST be justified in a code comment at the call
site.
**Rationale**: Keeps styling consistent, themeable, and reviewable through
one system instead of two competing ones.

### VII. Single-User Auth via Supabase
The application is single-tenant, single-user (Bell). Authentication
MUST be handled by Supabase Auth using either magic link or Google OAuth
— no custom auth system, no multi-user account model, and no
unauthenticated write access.
**Rationale**: Building multi-user auth (roles, permissions, invites) for
a one-person tool is unneeded complexity; Supabase Auth's built-in flows
cover the real requirement.

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

**Version**: 3.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-06
