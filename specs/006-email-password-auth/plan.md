# Implementation Plan: Email/Password Authentication

**Branch**: `006-email-password-auth` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-email-password-auth/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the login page's magic-link flow with real email/password sign-in, plus a self-service "set/reset password" flow (via Supabase's `resetPasswordForEmail`) for the single existing account — while leaving Google OAuth untouched. No new app data model; this only touches the `/login` page, adds a `/reset-password` landing page, and reuses the existing `/auth/callback` route unchanged (research.md Decision 2).

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js` (already in use for the existing magic-link/Google OAuth flows), shadcn/ui `Button`/`Input`, Tailwind CSS v4

**Storage**: N/A — no new app data; Supabase Auth's built-in `auth.users` store handles the password itself (data-model.md)

**Testing**: Vitest (Feature 005 infra) for the one new pure function (`lib/password.ts`); everything else in this feature is a live Supabase Auth interaction with no meaningful pure-logic surface, so it's verified via quickstart.md live scenarios, consistent with how magic-link/Google OAuth were verified in this project (no unit tests possible without a live Supabase project, per Feature 005's own scoping)

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: Sign-in completes within a few seconds under normal network conditions (SC-001: <15s)

**Constraints**: Thai-first UI text (Constitution IV), Tailwind-only styling via existing shadcn components (Constitution VI), explicit loading/error states on every async action (Constitution V)

**Scale/Scope**: Single-user app (Constitution VII) — one login page rewrite, one new page (`/reset-password`), one new pure helper + its test; no new Server Actions (sign-in/reset/set-password are Supabase Auth SDK calls via the browser client, matching the existing precedent set by the magic-link/OAuth code this replaces)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ New page (`app/reset-password/page.tsx`) lives under `app/`; no Pages Router touched.
- **II. Server Actions & Supabase Client Boundary**: ✅ No app-data mutations here, so no new Server Action is required. Sign-in/reset-request/set-password all call the Supabase Auth SDK directly via the anon-key browser client (`lib/supabase/client.ts`) — the exact pattern the current magic-link and Google OAuth code already uses on this same page. `signOut` (the one auth action already going through a Server Action) is untouched.
- **III. Storage-Agnostic File Persistence**: N/A — no file uploads in this feature.
- **IV. Thai-First, Mobile-First UI**: ✅ All new/changed UI text in Thai; single-column mobile-first layout consistent with the existing login page.
- **V. Resilient Async UX**: ✅ Sign-in, "request reset link," and "set new password" each get explicit loading and error states (FR-008); planned in tasks.md.
- **VI. Tailwind-Only Styling**: ✅ Reuses existing `Button`/`Input` shadcn components; no new inline styles.
- **VII. Single-User Auth via Supabase**: ✅ This feature *is* the implementation of the just-amended principle (email/password + Google OAuth via native Supabase Auth providers, no custom credentials store).
- **VIII. Universal File Attachments**: N/A — no data records or file attachments involved.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-email-password-auth/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this feature exposes no new API/interface contract of its own; it only calls Supabase Auth's existing SDK surface (already the pattern for the magic-link/OAuth code it replaces).

### Source Code (repository root)

Single Next.js project (existing structure, no new project/package):

```text
app/
├── login/
│   └── page.tsx              # MODIFIED: email+password form + "ลืมรหัสผ่าน?" link, replaces magic-link form; Google OAuth button unchanged
├── reset-password/
│   └── page.tsx               # NEW: lands here after the emailed reset link's code exchange; lets the account holder submit a new password
└── auth/callback/route.ts     # UNCHANGED: already forwards to `next` after exchanging the PKCE code (research.md Decision 2)

lib/
├── password.ts                 # NEW: validatePassword(password): string | null — pure minimum-length check (research.md Decision 4)
├── password.test.ts            # NEW: Vitest coverage for validatePassword
└── supabase/
    ├── client.ts                # UNCHANGED: browser client used for signInWithPassword/resetPasswordForEmail/updateUser
    └── server.ts                 # UNCHANGED: requireUser()/getCurrentUser() already cover the resulting session
```

**Structure Decision**: No new Server Actions, no new data model, no new project — this is a two-page change (`app/login/page.tsx` rewritten, `app/reset-password/page.tsx` added) plus one small testable helper (`lib/password.ts`), following the same client-side Supabase Auth SDK pattern the magic-link/OAuth code already established on this exact page.

## Complexity Tracking

*No violations — this section is intentionally empty.*
