# Implementation Plan: Email/Password Sign-Up

**Branch**: `009-email-password-signup` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-email-password-signup/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Close a gap in Feature 007 (FR-001 was specified but never implemented): add a real "สมัครสมาชิก" sign-up mode to `app/login/page.tsx` calling Supabase Auth's `signUp()`, client-side-validated with the existing `lib/password.ts`, handling both the immediate-session and email-confirmation-required outcomes — with no changes needed to the account/role data model, since Feature 007's `on_auth_user_created` trigger already assigns every new account `role = 'viewer'` regardless of how the account was created.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` (browser client, already in use for sign-in/forgot-password/Google on this same page), `lib/password.ts` (existing validator)

**Storage**: N/A — no schema changes; reuses Feature 007's `auth.users`/`profiles`/trigger unchanged (data-model.md)

**Testing**: No new Vitest coverage — the one piece of new logic (branching on `data.session`) is a thin wrapper around a live Supabase Auth call with no pure-logic surface, same reasoning as Features 006–008's non-`lib/`-helper pieces; verified live via quickstart.md

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: One additional Supabase Auth call on sign-up, same cost class as the existing sign-in/reset calls on this page

**Constraints**: Thai-first UI text (Constitution IV), Tailwind-only styling via existing shadcn components (Constitution VI), explicit loading/error states (Constitution V), no custom credentials system (Constitution VII — must use Supabase Auth's native `signUp()`)

**Scale/Scope**: One file changed (`app/login/page.tsx`) — no new files, no new routes, no new Server Actions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ No new routes — sign-up is a mode on the existing `app/login/page.tsx`.
- **II. Server Actions & Supabase Client Boundary**: ✅ `signUp()` is called via the browser (anon-key) client, matching the exact pattern already used on this page for sign-in, forgot-password, and Google OAuth — none of which are app-data mutations requiring a Server Action.
- **III. Storage-Agnostic File Persistence**: N/A.
- **IV. Thai-First, Mobile-First UI**: ✅ New "สมัครสมาชิก" mode and its copy in Thai, same mobile-first layout as the rest of the page.
- **V. Resilient Async UX**: ✅ Explicit loading (`"กำลังสมัคร..."`) and error states on sign-up, matching the page's existing pattern (FR-009).
- **VI. Tailwind-Only Styling**: ✅ Reuses the existing `Input`/`Button` components already on this page.
- **VII. Multi-User Auth with Role-Based Access Control**: ✅ This feature directly fulfills FR-001, which Principle VII's Feature 007 amendment already required; new accounts still land as `viewer` via the unchanged trigger.
- **VIII. Universal File Attachments**: N/A.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-email-password-signup/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — no new external API/interface, same as Features 006–008.

### Source Code (repository root)

Single Next.js project (existing structure, no new project/package):

```text
app/login/page.tsx    # MODIFIED: adds "signup" mode alongside existing "signin"/"forgot" modes
```

**Structure Decision**: The smallest possible footprint — one file, no new components, no new Server Actions, no schema changes. Sign-up reuses exactly the pattern already established on this page for its other two modes.

## Complexity Tracking

*No violations — this section is intentionally empty.*
