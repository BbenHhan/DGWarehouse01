# Quickstart: Verify User Account Menu & Sign Out

## Prerequisites

- `AUTH_REQUIRED = true` and `DATA_SOURCE = "supabase"` in `lib/data-config.ts` /
  `lib/auth-config.ts` (the real Supabase project set up this session).
- A real signed-in session (via Google or magic link) — the Google OAuth test-user
  configuration issue from earlier this session must already be fixed.

## Scenario 1: Avatar visible everywhere while signed in (US1)

1. Sign in (Google or magic link).
2. Land on `/photos`. **Expect**: an avatar is visible in the header.
3. Navigate to `/documents` and to a specific room/work-type photos page.
   **Expect**: the same avatar is visible on every page, unchanged.
4. If signed in via Google and the account has a profile photo, **expect**: the
   avatar shows that photo. If signed in via magic link (or a Google account
   with no photo), **expect**: a non-broken fallback (initials or icon) instead.

## Scenario 2: Sign out ends the real session (US2)

1. While signed in, click the avatar. **Expect**: a dropdown opens showing at
   least the account's email and a sign-out control.
2. Click sign out. **Expect**: redirected to `/login`.
3. Try to navigate directly to `/photos` (e.g. via the address bar or back
   button). **Expect**: redirected back to `/login`, not shown stale content —
   confirms the session was actually invalidated server-side, not just hidden.
4. Repeat steps 1–3 starting from a different page (e.g. `/documents`).
   **Expect**: identical behavior regardless of starting page.

## Scenario 3: Busy state and failure handling

1. Click the avatar → sign out, and (as best as can be observed) confirm the
   sign-out control shows a busy/disabled state immediately after the click,
   before the redirect completes.
2. (If reproducible) simulate a sign-out failure — **expect**: a clear error
   toast appears and the user remains on the current page, still signed in
   (the avatar/menu is still present afterward, not stuck in a half-signed-out
   state).

## Scenario 4: No-session mode is unaffected (US3)

1. Temporarily set `AUTH_REQUIRED = false` in `lib/auth-config.ts`.
2. Reload any page. **Expect**: the header renders normally with no avatar and
   no account menu, and no console/runtime error.
3. Revert `AUTH_REQUIRED` back to `true`.

## Scenario 5: Mobile width

1. Resize the viewport to 375px wide (or use the Claude Preview mobile preset).
2. **Expect**: the avatar and header stat chips/logo remain usable and don't
   overlap or get clipped.
