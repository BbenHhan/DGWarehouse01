# Research: Email/Password Authentication

## Decision 1: How the existing single account gets a password without an open sign-up form

**Decision**: Use Supabase Auth's `resetPasswordForEmail()` to send a "set/reset your password" link. This works whether or not the account already has a password (it's the same flow for "first password" and "forgot password") — Supabase doesn't distinguish the two cases at the API level.

**Rationale**: `signUp()` is semantically "create a new account" and, depending on Supabase's leak-prevention settings, its response for an email that already has a user can be ambiguous or misleading to build UX around. `resetPasswordForEmail()` is unambiguous: it only ever emails a link to whatever account matches that address, and never creates a new one (FR-004). It's also the same mechanism used for classic "forgot password," so one flow covers both User Story 2 acceptance scenarios (first-time set and later reset) without extra branching.

**Alternatives considered**: `signUp()` with a pre-registration allowlist check — rejected as unnecessary complexity (a whole allowlist mechanism) for a problem `resetPasswordForEmail()` already solves natively.

## Decision 2: Where the reset link lands, reusing the existing callback route

**Decision**: Call `resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` })`. The existing `app/auth/callback/route.ts` (used today for magic link and Google OAuth) already exchanges the PKCE `code` param for a session and redirects to whatever `next` query param was passed, defaulting to `/photos`. No changes to that route are needed — passing `next=/reset-password` is enough to land the account holder on a new page that lets them submit a new password while already holding a valid (recovery) session.

**Rationale**: Reuses a route that's already tested and working (this session) rather than building a parallel code-exchange handler — smallest change that satisfies FR-003/FR-005.

**Alternatives considered**: A dedicated `/auth/reset-callback` route — rejected, purely duplicative since the existing route is generic over `next`.

## Decision 3: Guaranteeing the server sees the new session right after password sign-in

**Decision**: After `signInWithPassword()` resolves successfully client-side, force a hard navigation (`window.location.assign(next)`) instead of `router.push()`.

**Rationale**: Feature 005 surfaced a real bug in this codebase where implicit state (an in-memory cache) silently desynced between a write and the next read because Next.js can bundle client and server code paths in ways that don't share state as naively expected. A client-side `router.push()` after `signInWithPassword()` risks the very next Server Component render not yet observing the cookie the Supabase browser client just set, depending on timing. A hard navigation guarantees the next request is a fresh request that reads the just-set session cookie server-side, matching FR-010 ("same authenticated session and app access" as OAuth, which already goes through a full server redirect via `/auth/callback`).

**Alternatives considered**: `router.push()` + `router.refresh()` — rejected as a subtler, less-guaranteed fix for a problem a hard navigation eliminates outright, and password sign-in is infrequent enough that a full page load costs nothing meaningful (SC-001 budget is 15s; a reload is imperceptible against that).

## Decision 4: Minimum password strength

**Decision**: Enforce an 8-character minimum, checked client-side via a small pure function (`lib/password.ts`) for immediate feedback, while treating Supabase Auth's own server-side minimum-length enforcement as the real security boundary (the client check is UX only — if Supabase's dashboard-configured minimum is ever raised, its own error message still surfaces via FR-002/FR-008's error-state handling).

**Rationale**: "Reasonable, standard practice" per the spec's Assumptions — 8 characters is the commonly recommended floor (Supabase's own default is 6; 8 is a small, defensible step up with no invented complexity-composition rules to maintain). Making it a pure, exported function keeps it consistent with this project's established testing pattern (Feature 005: extract pure business rules out of components/Server Actions so they're unit-testable without a live Supabase project).

**Alternatives considered**: Relying solely on Supabase's server response with no client-side check — rejected because it means every too-short password makes a wasted round trip before the account holder learns why it failed, worse UX for no real security gain.

## Decision 5: Not revealing account existence (SC-005)

**Decision**: No special handling needed. Supabase's `resetPasswordForEmail()` already returns the same success response regardless of whether the email matches an account (built-in user-enumeration protection) — the UI always shows the identical "check your email" confirmation after calling it, regardless of the email entered. `signInWithPassword()` with a wrong password or unknown email already returns Supabase's generic "Invalid login credentials" error for both cases, which is shown as-is.

**Rationale**: The behavior needed for SC-005 is already the default Supabase Auth behavior; documenting it here so the implementation phase doesn't second-guess or "fix" something that isn't broken (e.g., don't add a pre-check that queries whether the email exists before calling `resetPasswordForEmail`, which would defeat the protection).

**Alternatives considered**: N/A — this is confirming existing platform behavior, not choosing between options.
