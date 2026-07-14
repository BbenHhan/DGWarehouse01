# Implementation Plan: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

**Branch**: `012-auth-link-prefetch-fix` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-auth-link-prefetch-fix/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a new `/auth/confirm` page that requires an explicit button click before exchanging the one-time PKCE code for a session, and repoint the sign-up and password-reset email links at it (instead of `/auth/callback`, which auto-exchanges on any GET and is therefore vulnerable to being silently consumed by email-security prefetching). `/auth/callback` itself is untouched and keeps serving Google OAuth, which was never vulnerable to this issue.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/supabase-js`/`@supabase/ssr` (browser client, already in use for every other auth operation on `app/login/page.tsx`/`app/reset-password/page.tsx`)

**Storage**: N/A — no schema changes (data-model.md)

**Testing**: No new Vitest coverage — this is a live Supabase Auth interaction with no pure-logic surface (consistent with Features 006/009); verified live via quickstart.md, including a simulated-prefetch scenario

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: One extra button click added to two flows (sign-up confirmation, password reset) — negligible relative to the round trip these flows already involve (email delivery)

**Constraints**: Thai-first UI text (Constitution IV), Tailwind-only styling via existing shadcn components (Constitution VI), explicit loading/error states (Constitution V), Google OAuth flow must be byte-for-byte unaffected (FR-007)

**Scale/Scope**: One new page (`app/auth/confirm/page.tsx`), two call-site changes in `app/login/page.tsx` (the `emailRedirectTo`/`redirectTo` values passed to `signUp()`/`resetPasswordForEmail()`) — `app/auth/callback/route.ts` unchanged

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ New route (`app/auth/confirm/page.tsx`) lives under `app/`; no Pages Router touched.
- **II. Server Actions & Supabase Client Boundary**: ✅ The code exchange uses the existing browser (anon-key) client, matching the pattern already established for every other auth operation on this page (sign-in, sign-up, forgot-password, `updateUser` on `/reset-password`) — none of which are app-data mutations requiring a Server Action (research.md Decision 3).
- **III. Storage-Agnostic File Persistence**: N/A.
- **IV. Thai-First, Mobile-First UI**: ✅ New page's copy (confirm button, error message) in Thai, reusing existing message patterns (research.md Decision 4), mobile-first layout consistent with `/login`/`/reset-password`.
- **V. Resilient Async UX**: ✅ Explicit loading state on the confirm button, explicit error state for invalid/expired links (FR-008).
- **VI. Tailwind-Only Styling**: ✅ Reuses existing `Button` component and the same layout pattern as `/login`/`/reset-password`.
- **VII. Multi-User Auth with Role-Based Access Control**: N/A — no role/account-creation logic changes; this only changes *when* an already-existing code gets exchanged, not what happens after (new accounts still land as `viewer` via the unchanged trigger).
- **VIII. Universal File Attachments**: N/A.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-auth-link-prefetch-fix/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — no new external interface, only a new page and two redirect-URL changes.

### Source Code (repository root)

```text
app/auth/confirm/page.tsx    # NEW: click-to-confirm page — reads code/next, exchanges on button click, shows error for invalid/expired links
app/login/page.tsx            # MODIFIED: handleSignUp's emailRedirectTo and handleForgotPassword's redirectTo point to /auth/confirm instead of /auth/callback
app/auth/callback/route.ts    # UNCHANGED — still serves Google OAuth only
```

**Structure Decision**: One new page plus a two-line change to where two existing email flows point — no changes to the OAuth path, no schema changes, no new Server Actions.

## Complexity Tracking

*No violations — this section is intentionally empty.*
