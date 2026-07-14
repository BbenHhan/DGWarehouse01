# Research: Don't Show Expired-Link Error When Session Already Established

## Decision 1: Check for an existing session before committing to the error state

**Decision**: In `app/auth/confirm/page.tsx`'s `handleConfirm`, when `exchangeCodeForSession` returns an error, don't immediately show the error state — first call `supabase.auth.getUser()`. If a user is present (a session already exists), proceed to `next` exactly as the success path does. Only show the error state if `getUser()` also comes back empty.

**Rationale**: This directly implements FR-001/FR-002 — the observable bug is "a real session exists, but the user was told confirmation failed." Checking the actual, current authentication state before displaying the error is the direct fix for that specific inconsistency, regardless of which exact sequence of events produced the mismatch (FR-004's assumption that the precise race doesn't need to be pinned down). `getUser()` is the same call `app/reset-password/page.tsx` already uses to check for a session, so this is a consistent, already-established pattern in this codebase, not a new technique.

**Alternatives considered**: Retrying `exchangeCodeForSession` with the same code on failure — rejected, since a one-time code is one-time by design; retrying it can't succeed and doesn't address the actual question ("is the person already signed in"), only `getUser()` (or equivalently `getSession()`) answers that.

## Decision 2: Also guard against the button firing the exchange twice in the first place

**Decision**: Add a `useRef<boolean>(false)` "in flight" guard checked synchronously at the very start of `handleConfirm`, before any `await` or state update — if already `true`, return immediately without calling `exchangeCodeForSession` again.

**Rationale**: The existing `disabled={status === "loading"}` on the button relies on a React state update to take effect, which isn't synchronous — a fast double-click/double-tap can fire the handler twice before the button visually disables. A ref-based guard closes that specific window immediately, reducing how often the race in Decision 1 can even occur (fewer wasted duplicate calls to Supabase). This is a complement to Decision 1, not a replacement — Decision 1 is what makes the *outcome* correct even if some other duplicate-invocation path exists that this guard doesn't anticipate; this guard just makes the common cause (accidental double-click) not happen in the first place.

**Alternatives considered**: Relying solely on the `disabled` state prop — rejected as insufficient on its own, per the timing gap described above (this is presumably the actual mechanism behind the bug report).

## Decision 3: Scope stays inside `app/auth/confirm/page.tsx`

**Decision**: No changes to `app/auth/callback/route.ts`, `app/login/page.tsx`, or any Server Action — the fix is entirely local to the one component introduced by Feature 012.

**Rationale**: The bug is specific to the click-to-confirm page's own error-handling logic; nothing about how links are generated, how Google OAuth works, or how the rest of the app handles sessions is implicated.
