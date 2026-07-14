# Research: Open Sign-Up with Role-Based Access Control

## Decision 1: Where roles are stored

**Decision**: A new `profiles` table (`id` = `auth.users.id`, `email`, `role` — `viewer`/`editor`/`admin`, default `'viewer'`), populated automatically by a trigger on `auth.users` insert.

**Rationale**: Supabase Auth's `auth.users` table isn't meant to be extended with custom columns, and role must be "persisted server-side, never inferred from session claims alone" (Constitution VII) — a separate table keyed by the same id is the standard Supabase pattern for this. A trigger on insert means both sign-up paths (email/password `signUp()` and a first-time Google OAuth sign-in, which already creates an `auth.users` row today) get a profile row for free, with no new sign-in code needed — satisfies FR-001–FR-003 without touching the sign-in flow at all.

**Alternatives considered**: Storing role in `auth.users.user_metadata` — rejected because metadata is editable by the user themselves via the client SDK (`updateUser()`), which would let anyone grant themselves `admin` client-side; a separate server-owned table with no client update policy closes that off entirely.

## Decision 2: Bootstrapping the existing account to admin

**Decision**: The same migration that creates `profiles` also runs a one-time `insert ... on conflict (id) do update set role = 'admin'` targeting the account holder's known email (the account already exists in `auth.users` from this session's earlier testing), so it becomes `admin` immediately when the migration runs — before any application code for this feature even ships.

**Rationale**: Satisfies FR-013/SC-004 ("no manual setup step") by construction — a migration is something that runs once, automatically, as part of deploying this feature, not a manual dashboard action.

**Alternatives considered**: A runtime check ("if profiles is empty, make the first signed-in user admin") — rejected as more code and a subtler failure mode (race conditions, or accidentally re-triggering if the table is ever cleared) for a problem a one-time migration solves outright.

## Decision 3: Where role is actually enforced for mutations

**Decision**: Role enforcement lives entirely in Server Actions (a `requireRole()` check added right where `requireUser()` already runs), reading `profiles` via the service-role client. Existing RLS policies on `weeks`/`photos`/`documents` (currently "any authenticated user, full access") are left unchanged.

**Rationale**: Per Constitution II, every mutation already goes through a Server Action using the **service-role** Supabase client, which bypasses RLS entirely — RLS on those tables was never the actual authorization boundary for mutations, even before this feature (the client-side anon-key client is contractually "read-only display" only, per Principle II, and no code path uses it to write). So the real fix for FR-006 ("rejected ... independently of whether the UI control was ever shown") is a role check inside the Server Action itself, which covers every way to reach that function (normal click, or a crafted direct call bypassing the hidden button) — RLS changes on those three tables would add no additional protection a determined attacker couldn't already route around by... going through the Server Action, which is the only mutation path that exists. `profiles` itself is new and does get RLS (Decision 4), since it's the one table this feature adds real read access patterns for.

**Alternatives considered**: Also rewriting `weeks`/`photos`/`documents` RLS to require `editor`/`admin` — considered and rejected for this iteration as unnecessary work relative to the actual threat model of this app (no code path queries these tables with the anon-key client for writes); flagged as a possible future hardening step, not required to satisfy this feature's FRs.

## Decision 4: `profiles` table RLS

**Decision**: Enable RLS on `profiles` with exactly one policy — a user may `select` their own row (`auth.uid() = id`). No insert/update/delete policy is granted to authenticated users at all.

**Rationale**: Row creation happens via the trigger (runs as the function owner, bypasses RLS) and role changes happen via the admin-only Server Action (uses the service-role client, bypasses RLS) — nothing in this feature ever needs the anon-key client to write to `profiles`, so no write policy should exist for it. The one read policy exists only so a client-side query for "my own role" would work if ever needed for a snappier UI later; today's UI actually gets role from `getCurrentUser()` server-side (Decision 5), so even this read policy is precautionary rather than load-bearing.

**Alternatives considered**: Admin-can-select-all / admin-can-update-any RLS policies via a `security definer` helper function — considered, but the admin screen and role-change action both go through Server Actions with the service-role client anyway (Decision 3's same reasoning), so those policies would never actually be exercised by any code path. Left out to keep the migration's surface area matched to what's actually used.

## Decision 5: How role reaches the UI (gating add/edit/delete controls)

**Decision**: Extend the existing `getCurrentUser()` helper (`lib/supabase/server.ts`) to also return `role`. Every Server Component that currently gates mutation UI on the existing `USE_MOCK_DATA` flag (`app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`, `app/(app)/documents/[categorySlug]/page.tsx`, and the `PhotoGrid`/`DocList`/`WorkTypeWeekNav` components they pass a boolean into) gets a second condition ANDed in: `canEdit` (role is `editor` or `admin`).

**Rationale**: This app already has the exact right shape of gate in place — `{!USE_MOCK_DATA && (<uploader/>)}` — for a different reason (mock mode has nothing to write to). Role-gating is the same kind of "hide this control when it wouldn't work" decision, so extending the same conditions with `&& canEdit` is the smallest possible change that fits the codebase's existing pattern, rather than introducing a new gating mechanism.

**Alternatives considered**: A React Context provider for the current user/role — rejected as unnecessary; every page in this app already independently calls its own data-fetching functions server-side (no shared client-side state layer exists), so one more per-page `getCurrentUser()` call (cheap — a single-row indexed lookup) is consistent with the rest of the codebase, not a new pattern.

## Decision 6: Preventing zero admins (FR-012)

**Decision**: The `updateUserRole` Server Action, when the target account currently holds `admin` and the new role would not be `admin`, first counts remaining `admin` rows in `profiles` (excluding the target) and rejects the change if that count would be zero.

**Rationale**: A single, cheap `count` query directly in the one Server Action that can ever change roles is sufficient — this isn't a high-traffic path needing a database-level constraint (e.g., a trigger), and keeping the rule in application code alongside the rest of this feature's authorization logic (Decision 3) is consistent with where the codebase already puts its business rules.

**Alternatives considered**: A database check constraint or trigger enforcing "at least one admin always exists" — rejected as more moving parts than the single call site warrants.

## Decision 7: Testable pure logic for this feature

**Decision**: Extract the role-comparison rule ("does role X meet minimum role Y") into a small pure module, `lib/roles.ts` (`ROLE_RANK`, `canEdit(role)`, `isAdmin(role)`), with a Vitest unit test — the one piece of this feature's logic that's pure enough to test without a live Supabase project, matching this project's established pattern (Feature 005).
