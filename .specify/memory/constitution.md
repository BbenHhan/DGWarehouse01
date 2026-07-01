<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0 (MAJOR — architecture pivot)
Rationale for MAJOR bump: The project moves from a single-file, zero-build,
local-filesystem HTML viewer to a hosted Next.js 15 + Supabase web
application. This directly redefines/removes the prior Principle I
("Single-File, Zero-Build Architecture") and Principle VI ("Local-Only File
Operations"), which is backward-incompatible with v1.0.0 — a MAJOR bump per
this document's own versioning policy.
Modified principles (old → new):
  - I. Single-File, Zero-Build Architecture → I. App Router Only (Next.js 15)
  - II. Folder Structure Is the Source of Truth → removed (no local folder
    hierarchy; Supabase Storage + DB are now source of truth)
  - III. Defensive State Restoration → removed (was localStorage/DOM-specific
    to the old viewer; superseded by Server Actions + Supabase state model)
  - IV. No Nested-Quote Inline Handlers → removed (was a vanilla-JS inline
    handler bug class; not applicable to React/JSX)
  - V. Design Token Consistency → VI. Tailwind-Only Styling (Tailwind utility
    classes + shadcn/ui replace the CSS custom-property token system)
  - VI. Local-Only File Operations → III. Cloud-Only Storage & Optimized
    Images (Supabase Storage + Next.js <Image>, direct contradiction of the
    old "no network dependency" rule — intentional, per user direction)
Added principles:
  - II. Server Actions & Supabase Client Boundary
  - IV. Thai-First, Mobile-First UI
  - V. Resilient Async UX (loading/error states, optimistic delete)
  - VII. Single-User Auth via Supabase
Added sections:
  - Technical Reference (stack, environment variables)
Removed sections:
  - Old Technical Reference (folder structure, panel/WT/week IDs, old
    localStorage keys, old CSS token values) — no longer applicable to the
    new stack
  - Regression Guardrails (old vanilla-JS/localStorage bug list) — bug class
    does not exist in the new architecture
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no change needed (Technical
    Context / Constitution Check gate are generic and now apply to the new
    stack via this file)
  - .specify/templates/spec-template.md — ✅ no change needed
  - .specify/templates/tasks-template.md — ✅ no change needed (path
    conventions are advisory; Next.js App Router paths fit "Single project"
    convention already documented)
  - .specify/templates/checklist-template.md — ✅ no change needed
Follow-up TODOs: none — all placeholders resolved from user-supplied stack
and principle list.
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

### III. Cloud-Only Storage & Optimized Images
All file uploads (photos, documents) MUST go through Supabase Storage —
no local filesystem persistence anywhere in the app. Images MUST be
rendered with Next.js `<Image>` pointed at Supabase public URLs, never
plain `<img>` tags or unoptimized paths.
**Rationale**: The app is a hosted, multi-device Vercel deployment; local
disk state would not survive redeploys or be visible across devices, and
`<Image>` is required for responsive/optimized delivery.

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
violate Principles I–VII and that any stack/config change is reflected in
the Technical Reference section.

**Version**: 2.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
