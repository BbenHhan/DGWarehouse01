# Implementation Plan: Don't Show Expired-Link Error When Session Already Established

**Branch**: `013-confirm-session-check` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-confirm-session-check/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix `app/auth/confirm/page.tsx` (Feature 012) so that when `exchangeCodeForSession` reports an error, the page checks `supabase.auth.getUser()` before showing the expired-link message — if a session already exists (e.g. from a duplicate/racing confirmation attempt that succeeded), the person is taken into the app instead of shown a contradictory error. Also add a synchronous in-flight guard to the confirm button so a fast double-click can't fire the exchange call twice in the first place.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` (browser client, already in use — `supabase.auth.getUser()` is the same call `app/reset-password/page.tsx` already uses)

**Storage**: N/A — no schema changes (data-model.md)

**Testing**: No new Vitest coverage — live Supabase Auth interaction with no pure-logic surface (consistent with Feature 012); verified live via quickstart.md

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: One extra `getUser()` call only on the (rare) error path — negligible

**Constraints**: Must not change the genuine-failure error message or path (FR-003)

**Scale/Scope**: One file (`app/auth/confirm/page.tsx`), two small additions (session-check fallback, in-flight ref guard)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: N/A — no routing changes.
- **II. Server Actions & Supabase Client Boundary**: ✅ `getUser()` uses the existing browser client, same as every other check on this page and its siblings.
- **III. Storage-Agnostic File Persistence**: N/A.
- **IV. Thai-First, Mobile-First UI**: N/A — no new UI copy, existing Thai messages unchanged.
- **V. Resilient Async UX**: ✅ This fix directly improves error-state accuracy, which is exactly what Principle V exists for (no misleading state).
- **VI. Tailwind-Only Styling**: N/A — no styling changes.
- **VII. Multi-User Auth with Role-Based Access Control**: N/A — no role logic touched.
- **VIII. Universal File Attachments**: N/A.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/013-confirm-session-check/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — no interface changes.

### Source Code (repository root)

```text
app/auth/confirm/page.tsx    # MODIFIED: session-check fallback before showing error; in-flight ref guard on the confirm button
```

**Structure Decision**: Single-file fix, entirely inside the one component Feature 012 introduced.

## Complexity Tracking

*No violations — this section is intentionally empty.*
