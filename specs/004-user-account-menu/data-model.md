# Phase 1 Data Model: User Account Menu & Sign Out

No new persisted entity or database change. This feature reads and ends the
existing Supabase Auth session; nothing is added to `lib/types.ts` or any
storage backend.

## Read-only view: Current user (display shape)

Returned by the new `getCurrentUser()` helper — not a stored entity, just the
shape the header consumes:

| Field       | Type            | Source                                                        |
|-------------|-----------------|----------------------------------------------------------------|
| `email`     | string          | `user.email` — always present for both magic-link and Google   |
| `name`      | string \| null  | `user.user_metadata.full_name` — present for Google, absent for magic-link |
| `avatarUrl` | string \| null  | `user.user_metadata.avatar_url` — present for Google (if the Google account has a photo), absent otherwise |

Returns `null` (not this shape) when there is no session — the single signal
the header needs to decide whether to render the account menu at all (FR-007).

## Operation: Sign out

**Input**: none (acts on the caller's own session via cookies).

**Effects**:
1. The Supabase session tied to the request's cookies is invalidated
   server-side.
2. The response clears the session cookies.
3. The caller is redirected to `/login`.

**Failure mode**: If step 1 fails, no cookies are cleared and no redirect
happens — the Server Action returns an error result instead, so the caller
(the `AccountMenu` component) can show `toast.error` and leave the user visibly
still signed in (FR-009), rather than partially clearing state.
