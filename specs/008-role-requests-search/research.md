# Research: Role Requests & User Search

## Decision 1: Enforcing "one pending request per account"

**Decision**: A Postgres partial unique index — `create unique index role_requests_one_pending_per_requester on role_requests (requester_id) where status = 'pending'`.

**Rationale**: This makes the FR-003 constraint impossible to violate at the database level, not just an application-level check that could race under concurrent requests. The Server Action still checks first (for a clean error message before attempting the insert), but the index is the actual guarantee — consistent with how `weeks`'s overlap rule is enforced in application code but the FR-012 "never zero admins" rule from Feature 007 is enforced at the one call site that can violate it. Here, since the constraint is expressible as a plain index, the database is a strictly better place for it (no race window at all).

**Alternatives considered**: Application-only check-then-insert (query for an existing pending row, insert if none) — rejected as it has a real (if narrow) race window between the check and the insert; the partial unique index costs nothing extra to add and closes it entirely.

## Decision 2: Linking a request to an account

**Decision**: `role_requests.requester_id references profiles(id) on delete cascade` (not directly `auth.users(id)`).

**Rationale**: Since `profiles.id` already equals `auth.users.id` (Feature 007), pointing the foreign key at `profiles` instead lets `listPendingRoleRequests()` fetch each request's requester email/name via Supabase's embedded-resource query syntax (`select("*, profiles(email, full_name)")`) in one round trip, instead of fetching requests and profiles separately and joining them in application code.

**Alternatives considered**: FK to `auth.users(id)` directly — rejected only because it forfeits the one-query embed; functionally equivalent otherwise since the two tables share the same primary key today.

## Decision 3: Searching by name requires storing a name

**Decision**: Add a `full_name` column to `profiles` (nullable), populated by the existing `handle_new_user()` trigger from `new.raw_user_meta_data->>'full_name'` — present for Google sign-ins, null for email/password sign-ups (mirrors how `getCurrentUser()` already reads `user.user_metadata?.full_name` today).

**Rationale**: FR-010 requires searching by "email or name," but Feature 007's `profiles` table only ever stored `email` — there was no name to search. Since the account already provides a name via Google's OAuth metadata at sign-up time, capturing it into `profiles` at the same moment the row is created (same trigger, one extra column) is the smallest change that makes name search possible, without a new Admin API call in `listAccounts()` on every request.

**Alternatives considered**: Call `supabase.auth.admin.listUsers()` inside `listAccounts()` to get names live instead of storing them — rejected as an extra privileged API call on every render of the admin screen, for data that's already available for free at account-creation time.

## Decision 4: Where search happens

**Decision**: Client-side filtering in `UserRoleTable.tsx` over the already-fetched account list — no new search parameter on `listAccounts()` or the database query.

**Rationale**: This app has no user base at a scale where server-side search/pagination would matter (a single construction site's small set of accounts, per Constitution's own framing of the app's scope) — `listAccounts()` already fetches every account in one query today (Feature 007). Filtering that same array client-side as the admin types satisfies FR-010/FR-011 instantly (no round trip per keystroke) with materially less code than a search-aware Server Action.

**Alternatives considered**: A `search` parameter threaded through `listAccounts()` into an `ilike` Postgres query — rejected as premature for the account volumes this app will realistically ever have; revisit only if that assumption stops holding.

## Decision 5: Approving a stale request is a no-op, not an error

**Decision**: `approveRoleRequest()` updates `profiles` with `.eq("id", requesterId).eq("role", "viewer")` (not just `.eq("id", ...)`) — if the requester is no longer `viewer` (already promoted some other way), this `UPDATE` matches zero rows and does nothing, while the request itself is still marked `approved`.

**Rationale**: Directly implements the spec's edge case: approving a request for someone whose role already changed by other means "succeeds — it's a harmless no-op ... not an error." Scoping the role update to `role = 'viewer'` is what makes it a no-op instead of an accidental *demotion* (e.g. silently dropping an `admin` back to `editor`), which the edge case explicitly rules out.

## Decision 6: Detecting the "two admins act on the same request" race

**Decision**: Both `approveRoleRequest()` and `denyRoleRequest()` update `role_requests` with `.eq("id", requestId).eq("status", "pending")` and check the returned row count; zero rows updated means someone else already resolved it, and the action returns a clear "already resolved" error instead of silently double-processing.

**Rationale**: This is the same atomic conditional-update pattern Feature 007's `updateUserRole` doesn't need (it has no analogous race) but which this feature's edge case explicitly calls for — the database's own row-matching semantics are what make the race safe, not an application-level lock.

## Decision 7: Viewer-only request eligibility, enforced server-side

**Decision**: `requestEditorAccess()` fetches the caller's current role (via the existing `requireUser()` + `getUserRole()` pair, not `requireRole()`, since this needs an *exact* match rather than a minimum) and rejects with a clear message if it isn't exactly `"viewer"` — before checking for an existing pending request.

**Rationale**: `requireRole(minRole)` (Feature 007) checks "at least" a role, which is the wrong shape for FR-004 ("reject if the caller isn't a viewer" — editor and admin are rejected too, even though they rank higher). Reusing `requireUser()`/`getUserRole()` directly, then comparing for exact equality, avoids adding a second role-check helper with subtly different semantics next to `requireRole()`.

## Decision 8: No new pure-logic module

**Decision**: Unlike Features 005–007, this feature adds no new Vitest unit tests — everything here (the partial unique index, the conditional updates, the trigger's new column, the RLS policy) is a live Supabase interaction with no meaningful pure-logic surface to extract, same reasoning as Feature 006/007's non-`lib/`-helper pieces.

**Rationale**: Keeps the testing story honest — Feature 005 explicitly scoped unit tests to pure functions callable without a live project; forcing a test around, say, `assertIsRequestEligible`'s trivial string comparison would be test-for-test's-sake, not real coverage of this feature's actual risk (which is all in the database constraints and RLS, verified live via quickstart.md instead).
