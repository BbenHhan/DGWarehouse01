# Phase 0 Research: User Account Menu & Sign Out

## Decision 1: Sign out as a Server Action, not a client-side call

**Decision**: Implement sign out as a new Server Action (`signOut` in
`app/actions/auth.ts`) that uses `createSessionClient()` (cookie-aware) to call
`supabase.auth.signOut()`, then `redirect("/login")` from `next/navigation`.

**Rationale**: Constitution II centralizes mutations in Server Actions. A
Server Action can clear the auth cookies directly via the response (through
`@supabase/ssr`'s cookie adapter) and redirect in the same round trip, which is
simpler to reason about and test than a client-side `supabase.auth.signOut()`
call followed by a manual client-side `router.push`. The existing login page's
`signInWithOAuth`/`signInWithOtp` calls are client-side only because OAuth
*must* redirect the browser to an external provider — sign out has no such
requirement, so it can follow the same Server Action convention as every other
mutation in this app (`deletePhoto`, `deleteWeek`, etc.).

**Alternatives considered**:
- Client-side `supabase.auth.signOut()` + `router.push("/login")` — rejected:
  works, but puts a mutation outside the Server Action boundary Constitution II
  establishes, and adds a second round trip (client call, then a separate
  client-side navigation) instead of one server round trip.

## Decision 2: Reading the current user for display (non-throwing)

**Decision**: Add `getCurrentUser()` to `lib/supabase/server.ts`, distinct from
the existing `requireUser()`. It returns `{ email, name, avatarUrl } | null` and
never throws — when `AUTH_REQUIRED` is `false` or no session exists, it simply
returns `null`.

**Rationale**: `requireUser()` exists to *guard* privileged Server Actions — it
throws `"UNAUTHENTICATED"` so callers can turn that into a rejected
`ActionResult`. The header's use case is display-only and must never throw
(FR-007 requires the header to degrade quietly with no session), so reusing
`requireUser()` here would mean wrapping every layout render in a try/catch for
a case that isn't actually exceptional — a second, narrower helper is simpler
and keeps `requireUser()`'s contract (throws = "reject this mutation") clean.

**Alternatives considered**:
- Reuse `requireUser()` with a try/catch at the call site — rejected: conflates
  two different concerns (authorization guard vs. optional display data) and
  would need the same try/catch repeated anywhere the header's user info is
  read.

## Decision 3: Avatar source fields and fallback

**Decision**: Read `user.user_metadata.avatar_url` (Supabase's normalized field
for OAuth-provided profile photos, populated for Google sign-in) for the image,
and `user.user_metadata.full_name` (or `user.email` if absent) for the display
name. When no `avatar_url` exists, render initials derived from the display
name/email's local part instead of an `<img>`/`<Image>` at all.

**Rationale**: Supabase's Google provider maps Google's `picture` field into
`user_metadata.avatar_url` automatically, so this is the standard, documented
field rather than something Google-specific this app has to special-case.
Magic-link sign-in never populates it, which is exactly the "no profile
picture" case FR-002/FR-003 (Assumptions) require a non-broken fallback for.

**Alternatives considered**:
- Generic person icon instead of initials — spec's Assumptions section
  explicitly allows either; initials are chosen as slightly more
  identity-specific (helps confirm "yes, this is my account") at no extra cost.

## Decision 4: New shadcn/ui primitives via the existing CLI setup

**Decision**: Add `dropdown-menu` and `avatar` primitives using the project's
already-configured shadcn CLI (`components.json`, style `base-nova`, Base UI
under the hood) — the same mechanism that produced every existing
`components/ui/*` file — rather than hand-writing them from scratch.

**Rationale**: Every existing primitive (`alert-dialog`, `dialog`, `select`,
etc.) already follows the Base UI `render`-prop pattern documented in this
project (e.g. `<AlertDialogTrigger render={<Button .../>} />`). Generating the
two new ones through the same CLI guarantees they follow that exact pattern
too, instead of an implementer guessing at Base UI's API surface and
introducing an inconsistent one-off style.

**Alternatives considered**:
- Hand-write a minimal dropdown from scratch with raw ARIA — rejected: more
  code to maintain, and would not match the Base UI primitive family the rest
  of the app is built on (keyboard nav, focus trapping, etc. are already solved
  by the CLI-generated primitive).
