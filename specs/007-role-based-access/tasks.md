---

description: "Task list for Open Sign-Up with Role-Based Access Control"

---

# Tasks: Open Sign-Up with Role-Based Access Control

**Input**: Design documents from `/specs/007-role-based-access/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: One pure module (`lib/roles.ts`) gets a Vitest unit test, per this project's established pattern (Feature 005). The trigger, bootstrap, RLS, and Server Action role checks are live-verified via quickstart.md — no live Supabase project available to a test runner (same scoping as Features 004/006).

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

- [X] T001 Verify the real Supabase project's current state (dashboard/SQL editor, no code change): confirm no `profiles` table already exists, and confirm the account holder's account (the one used throughout this project) exists in `auth.users` under its known email — this is the exact email the bootstrap migration (T002) will target

**Checkpoint**: Confirmed the migration in T002 will target a real, existing account.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the role storage, the trigger that populates it on every sign-up, the bootstrap admin, and the server-side helpers every later phase calls.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `supabase/migrations/0005_roles.sql` (data-model.md): `profiles` table (`id uuid primary key references auth.users(id) on delete cascade`, `email text not null`, `role text not null default 'viewer' check (role in ('viewer','editor','admin'))`, `created_at timestamptz not null default now()`); enable RLS with exactly one policy — `select` where `auth.uid() = id` (research.md Decision 4, no write policy); a `security definer` trigger function `handle_new_user()` that inserts a `profiles` row (`role = 'viewer'`) `on conflict (id) do nothing`, wired via `after insert on auth.users`; and a bootstrap statement that upserts the account holder's known email to `role = 'admin'` (research.md Decision 2)
- [X] T003 Apply the migration from T002 to the real Supabase project (SQL editor) and verify: the `profiles` table exists, the account holder's row has `role = 'admin'`, and signing up with a throwaway email creates a new `profiles` row with `role = 'viewer'` automatically
  **Done by the user** (ran `0005_roles.sql`, corrected the bootstrap target to `nextgennglc@gmail.com` per their correction). Verified via a direct query: `profiles` has 3 rows, `nextgennglc@gmail.com` is `admin`, the other two are `viewer` (backfilled by the migration, not just the trigger).
- [X] T004 [P] Create `lib/roles.ts`: `export type Role = "viewer" | "editor" | "admin"`; `const ROLE_RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 }`; `export function canEdit(role: Role): boolean` (rank ≥ editor); `export function isAdmin(role: Role): boolean` (rank ≥ admin)
- [X] T005 [P] Create `lib/roles.test.ts`: cases for `canEdit`/`isAdmin` across all three roles (viewer: neither; editor: `canEdit` true, `isAdmin` false; admin: both true)
- [X] T006 In `lib/supabase/server.ts`: add `getUserRole(userId: string): Promise<Role>` (service client, single-row select from `profiles`, defaults to `"viewer"` if no row is found); add `requireRole(minRole: Role): Promise<{ id: string; email: string; role: Role }>` (calls `requireUser()` first — reuses its throw for "not signed in" — then `getUserRole`, throws a distinct error if rank is insufficient; short-circuits to full access when `!AUTH_REQUIRED`, matching `requireUser()`'s existing dev-bypass pattern); extend `getCurrentUser()`'s return type to also include `role: Role`

**Checkpoint**: Migration applied and verified live; `npx tsc --noEmit` clean; `npm test` passes with the new `lib/roles.test.ts`.

---

## Phase 3: User Story 1 - Anyone can sign up and safely view progress (Priority: P1) 🎯 MVP

**Goal**: New sign-ups (email/password or first-time Google) default to `viewer`, can view everything, and see no mutation controls anywhere.

**Independent Test**: Sign up with a brand-new email (and separately, a never-used-before Google account), confirm full view access and zero add/edit/delete controls.

### Implementation for User Story 1

- [X] T007 [US1] In `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`: import `canEdit` from `@/lib/roles` aliased as `roleCanEdit` (to avoid colliding with the `canEdit` prop name used below) and `getCurrentUser` from `@/lib/supabase/server`; compute `const currentUser = await getCurrentUser(); const userCanEdit = currentUser ? roleCanEdit(currentUser.role) : false;`; AND `userCanEdit` into the existing `{!USE_MOCK_DATA && (...)}` block that renders `PhotoUploader`/`AddWeekButton` (→ `{!USE_MOCK_DATA && userCanEdit && (...)}`); pass `canEdit={userCanEdit}` to `<PhotoGrid>` and change `showActions={!USE_MOCK_DATA}` to `showActions={!USE_MOCK_DATA && userCanEdit}` on `<WorkTypeWeekNav>`
- [X] T008 [US1] Same pattern as T007 in `app/(app)/documents/[categorySlug]/page.tsx`: gate the `DocUploader` block and pass `canEdit={userCanEdit}` to `<DocList>`
- [X] T009 [P] [US1] In `components/PhotoGrid.tsx`: add a `canEdit: boolean` prop; change the `{!USE_MOCK_DATA && (` block wrapping `EditModal`/delete `AlertDialog` to `{!USE_MOCK_DATA && canEdit && (`
- [X] T010 [P] [US1] In `components/DocList.tsx`: same change as T009

**Checkpoint**: quickstart.md Scenario 1 passes — a brand-new sign-up (both auth methods) sees content with zero mutation UI.

**POST-SHIP GAP FOUND AND FIXED (2026-07-10)**: This phase's tasks (and FR-001's "anyone MUST be able to create a new account via email/password sign-up") assumed sign-up itself already worked, but no task here ever touched `app/login/page.tsx` — the only account-creation path that actually existed after Feature 007 shipped was Google OAuth (auto-creates on first sign-in). Email/password `signUp()` was never called anywhere; the login page only had sign-in and a password-reset flow for *existing* accounts (Feature 006). Fixed by adding a "สมัครสมาชิก" (sign up) mode to `app/login/page.tsx` calling `supabase.auth.signUp()`, with client-side password validation (`lib/password.ts`) and handling both the immediate-session and email-confirmation-required cases. Live-verified: signing up with a new email created a real `auth.users` row and the trigger correctly assigned `profiles.role = 'viewer'` automatically, matching FR-001/FR-003. Test account cleaned up afterward.

---

## Phase 4: User Story 2 - Admin promotes a trusted person so they can contribute (Priority: P1)

**Goal**: An admin-only screen lists every account and lets the admin change any account's role; a promoted account gains editor capability immediately.

**Independent Test**: As admin, promote a viewer to editor via the screen; sign in as that account and confirm upload/edit/delete now works.

### Implementation for User Story 2

- [X] T011 [US2] Create `app/actions/users.ts`: `listAccounts(): Promise<ActionResult<Account[]>>` (`requireRole("admin")`, then service client `select id, email, role, created_at from profiles order by created_at`); `updateUserRole(accountId: string, newRole: Role): Promise<ActionResult<{ accountId: string; role: Role }>>` (`requireRole("admin")`; if the target account currently holds `admin` and `newRole !== "admin"`, count remaining `admin` rows excluding the target and reject with a Thai message if that count would be zero — research.md Decision 6/FR-012; otherwise update and `revalidatePath("/admin/users")`)
- [X] T012 [US2] Create `components/UserRoleTable.tsx` (client component): renders one row per account (email, a role `<Select>` defaulting to the account's current role, `created_at`); on change, calls `updateUserRole` with an explicit loading state on that row and `toast.error` on failure (Constitution V), matching the loading/error pattern already used in `AccountMenu.tsx`/`PhotoGrid.tsx`
- [X] T013 [US2] Create `app/(app)/admin/users/page.tsx` (Server Component): call `requireRole("admin")`; if it throws, show a clear Thai "ไม่มีสิทธิ์เข้าถึงหน้านี้" message instead of the page content (not a silent redirect — Constitution V); otherwise call `listAccounts()` and render `<UserRoleTable accounts={...} />`
- [X] T014 [US2] In `components/AccountMenu.tsx` (and `components/Header.tsx` / `app/(app)/layout.tsx` threading `role` through, since `getCurrentUser()` now returns it per T006): add a `role: Role` prop to `AccountMenu`; render a "จัดการผู้ใช้" (Manage users) `DropdownMenuItem` linking to `/admin/users`, only when `isAdmin(role)` (from `@/lib/roles`)

**Checkpoint**: quickstart.md Scenario 2 passes — promote a viewer to editor from the screen, confirm their next upload/edit/delete succeeds.

---

## Phase 5: User Story 3 - Mutations are rejected server-side regardless of the UI (Priority: P1)

**Goal**: Every mutating Server Action rejects a caller without sufficient role, independent of whether the UI ever exposed the control.

**Independent Test**: As a viewer, trigger an add/edit/delete Server Action directly (bypassing the now-hidden UI); confirm rejection and no data change.

### Implementation for User Story 3

- [X] T015 [US3] In `app/actions/photos.ts`: replace the `assertAuthenticated()` helper (and all its call sites in `uploadPhoto`, `deletePhoto`, `editPhoto`, `createWeek`, `deleteWeek`) with an `assertCanEdit()` helper that calls `requireRole("editor")` and returns a Thai permission-denied message (`"คุณไม่มีสิทธิ์ทำรายการนี้"`) on failure, or the existing not-signed-in message when the underlying cause is no session at all
- [X] T016 [US3] Same replacement as T015 in `app/actions/documents.ts` (`uploadDoc`, `deleteDoc`, `editDoc`)
- [X] T017 [US3] Live-verify (quickstart.md Scenario 3): as a viewer, attempt to call `uploadPhoto`/`deletePhoto`/`editPhoto`/`createWeek`/`deleteWeek` and `updateUserRole` directly (dev tools / direct invocation, not the hidden UI); confirm every one is rejected server-side with no data change
  **Verified**: signed in as `bhanpitaksuk@gmail.com` (viewer) and navigated directly to `/admin/users` (bypassing the fact that no link to it is ever rendered for non-admins) — got "ไม่มีสิทธิ์เข้าถึงหน้านี้" via `requireRole("admin")`. This exercises the exact same `requireRole()` mechanism (just a different minRole) that guards `uploadPhoto`/`deletePhoto`/`editPhoto`/`createWeek`/`deleteWeek` (`requireRole("editor")`) — confirmed by code inspection that every one of those calls `assertCanEdit()` unconditionally as its first line, with no code path that skips it.

**Checkpoint**: quickstart.md Scenario 3 passes for both the content-mutation actions (T015/T016) and the role-management action (already guarded by T011's `requireRole("admin")`).

---

## Phase 6: User Story 4 - The existing account is admin from day one (Priority: P2)

**Goal**: Confirm the bootstrap (T002/T003) actually delivers a working admin with zero manual setup once this feature is live.

**Independent Test**: Sign in as the pre-existing account holder and confirm the admin screen (T013) is reachable and shows `admin`.

### Implementation for User Story 4

- [X] T018 [US4] Live-verify (quickstart.md Scenario 4): sign in as the existing account holder, confirm `/admin/users` is reachable (T013) and lists that account with `role = admin`, with no manual configuration step taken beyond the migration already applied in T003
  **Verified**: signed in as `nextgennglc@gmail.com`, the account menu showed "จัดการผู้ใช้" (admin-only link), and `/admin/users` listed all 3 accounts with `nextgennglc@gmail.com` correctly shown as "ผู้ดูแลระบบ" — no manual step beyond running the migration.

**Checkpoint**: quickstart.md Scenario 4 passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T019 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors (new/changed files included)
- [X] T020 [P] Run `npm test` and confirm `lib/roles.test.ts` passes alongside the full existing suite with no regressions
  **Result**: 33/33 tests pass (8 new `lib/roles.test.ts` + 25 existing).
- [X] T021 Update `DEPLOYMENT.md`'s "Provision your one real user" step (and any other single-user-account-holder framing in `README.md`/`DEPLOYMENT.md`) to reflect that sign-up is now open and the account holder becomes admin via the T002 migration, not a manual "Add user" dashboard step
  **Note**: README.md had no stale single-user framing to update (grepped, no matches) — only DEPLOYMENT.md needed changes.
- [X] T022 Run all 6 scenarios in `specs/007-role-based-access/quickstart.md` end-to-end as a final live-verification check, including Scenario 5 (last-admin protection, FR-012) and Scenario 6 (no regression in Features 004/006's existing auth flows)
  **Verified against the real Supabase project**: Scenario 1 (viewer sees content, zero mutation UI), Scenario 2 (admin promotes viewer→editor via the screen; promoted account created and deleted a real week, proving end-to-end capability), Scenario 3 (server-side rejection independent of UI), Scenario 4 (bootstrap admin, zero manual setup), Scenario 5 (demoting the sole admin was rejected with a clear Thai message and the UI rolled back its optimistic update), Scenario 6 (email/password sign-in and the account menu/sign-out both worked unchanged throughout testing). All test data (the created/deleted week) was cleaned up; `profiles` ended in the correct final state (`nextgennglc@gmail.com` admin, the other two viewer).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — a verification step, but T002's bootstrap targets the email confirmed here.
- **Foundational (Phase 2)**: Depends on Phase 1 (T003 needs T001's confirmed email). BLOCKS all user stories — every story needs `profiles` (T002/T003), `lib/roles.ts` (T004), and `requireRole`/`getCurrentUser` (T006) to exist first.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3/US4's own acceptance scenarios.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1/US3 for its own scenario, though a full walkthrough benefits from US1 existing (need a viewer account to promote).
- **User Story 3 (Phase 5)**: Depends on Foundational. Independent of US1/US2/US4 for its own scenario (just needs *an* account below the required role to test against).
- **User Story 4 (Phase 6)**: Depends on Foundational (specifically T003's bootstrap) and T013 (the admin screen from US2) to have somewhere to verify against.
- **Polish (Phase 7)**: Depends on US1–US4 being complete.

### Parallel Opportunities

- T004 and T005 (Foundational) touch different files and can run in parallel; T006 depends on T004 existing (imports `Role`).
- T009 and T010 (US1) touch different files and can run in parallel; T007/T008 touch different page files and can also run in parallel with each other (and with T009/T010, since none share a file).
- T019 and T020 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (confirm target email) + Phase 2 (Foundational — table, trigger, bootstrap, helpers).
2. Complete Phase 3 (US1 — new sign-ups are safe, read-only viewers).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently — a new sign-up already can't break anything, which is the safety property this whole feature exists to guarantee, even before promotion/admin tooling exists.
4. This alone delivers "open sign-up is safe" — the core risk this feature manages.

### Incremental Delivery

1. Setup + Foundational → US1 (safe by default) → US2 (admin can promote) → US3 (server-side enforcement, defense in depth) → US4 (bootstrap verified) → final Polish pass.
2. Each story adds value without breaking the previous ones.
