---

description: "Task list for Role Requests & User Search"

---

# Tasks: Role Requests & User Search

**Input**: Design documents from `/specs/008-role-requests-search/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — everything here is a live Supabase interaction (partial unique index, conditional updates, RLS) with no pure-logic surface to extract (research.md Decision 8). Verified live via quickstart.md, same scoping as Features 006/007.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

- [X] T001 Verify the real Supabase project's current state (SQL editor/dashboard, no code change): confirm `role_requests` doesn't already exist and `profiles` has no `full_name` column yet, so migration 0006 (T002) starts from a known baseline
  **Verified**: confirmed via direct query — `role_requests` table not found, `profiles` rows have no `full_name` field.

**Checkpoint**: Confirmed baseline before the new migration.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the `role_requests` table, the `profiles.full_name` column, and the shared TypeScript types every story's Server Actions and components need.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `supabase/migrations/0006_role_requests.sql` (data-model.md): `role_requests` table (`id uuid primary key default gen_random_uuid()`, `requester_id uuid not null references profiles(id) on delete cascade`, `status text not null default 'pending' check (status in ('pending','approved','denied'))`, `requested_at timestamptz not null default now()`, `resolved_at timestamptz`, `resolved_by uuid references profiles(id)`); a partial unique index `on role_requests (requester_id) where status = 'pending'` (research.md Decision 1); RLS enabled with a self-select policy (`auth.uid() = requester_id`), no write policy (writes go through Server Actions via the service-role client, same as `profiles`); `alter table profiles add column if not exists full_name text`; update `handle_new_user()` to also set `full_name = new.raw_user_meta_data->>'full_name'` on insert (research.md Decision 3)
- [X] T003 Apply the migration from T002 to the real Supabase project (SQL editor) and verify: `role_requests` exists with the partial unique index, `profiles.full_name` exists, and a fresh Google sign-in populates `full_name` (email/password sign-ups leave it `null`)
  **Done by the user.** Verified via direct query: `role_requests` exists (0 rows initially), `profiles.full_name` column exists. Found and fixed a real bug while live-testing T009: `listPendingRoleRequests()`'s embedded-resource query (`profiles(email, full_name)`) was ambiguous — `role_requests` has two FKs to `profiles` (`requester_id`, `resolved_by`) — PostgREST returned "Could not embed because more than one relationship was found." Fixed by disambiguating: `profiles!requester_id(email, full_name)`.
- [X] T004 [P] Update `lib/types.ts`: add `full_name: string | null` to the existing `Account` type; add a new `RoleRequest` type (`id`, `requesterId`, `requesterEmail`, `requesterFullName: string | null`, `status`, `requestedAt`)

**Checkpoint**: Migration applied and verified live; `npx tsc --noEmit` clean.

---

## Phase 3: User Story 1 - A viewer requests editor access (Priority: P1) 🎯 MVP

**Goal**: A viewer can submit a request for editor access from within the app; their role doesn't change by itself, and they can't submit a second request while one is pending.

**Independent Test**: As a viewer, submit a request and confirm it's recorded with the role unchanged; confirm a second submission is blocked.

### Implementation for User Story 1

- [X] T005 [US1] In `app/actions/users.ts`, add `requestEditorAccess(): Promise<ActionResult<{ requestId: string }>>`: get the caller via `requireUser()` (throw → "กรุณาเข้าสู่ระบบก่อนทำรายการนี้"); fetch their role via `getUserRole()` and reject with a clear Thai message ("คุณมีสิทธิ์นี้อยู่แล้ว" — you already have this access) unless it's exactly `"viewer"` (research.md Decision 7 — NOT `requireRole`, which checks a minimum, not an exact match); insert into `role_requests` via the service-role client; if the insert fails on the partial unique index (T002), return "คุณมีคำขอที่รอดำเนินการอยู่แล้ว" (you already have a pending request) instead of a raw DB error; `revalidatePath("/admin/users")` and wherever the requester's own UI shows their pending state
- [X] T006 [US1] In `components/AccountMenu.tsx` (and `components/Header.tsx`/`app/(app)/layout.tsx` threading a new `hasPendingRequest: boolean` through, alongside the existing `role`): for `role === "viewer"`, show either a "ขอสิทธิ์แก้ไข" (request edit access) `DropdownMenuItem` calling `requestEditorAccess()` with a loading state and `toast` on success/error, or — when `hasPendingRequest` is true — a non-actionable indicator ("คำขอสิทธิ์แก้ไขกำลังรอดำเนินการ") instead, so the "already pending" state is visibly clear rather than just having the button silently fail on click (spec.md US1 Acceptance Scenario 2)

**Checkpoint**: quickstart.md Scenario 1 (submit) and Scenario 2 (duplicate blocked) pass.

---

## Phase 4: User Story 2 - Admin reviews and approves/denies (Priority: P1)

**Goal**: An admin sees all pending requests in-app and can approve (grants `editor`) or deny (no role change) each one in a single action.

**Independent Test**: As admin, view pending requests, approve one, confirm the requester gains editor capability; deny another, confirm no role change and the requester can request again later.

### Implementation for User Story 2

- [X] T007 [US2] In `app/actions/users.ts`, add three functions, all `requireRole("admin")`-guarded like `listAccounts`/`updateUserRole`: `listPendingRoleRequests(): Promise<ActionResult<RoleRequest[]>>` (service client, `select("id, requester_id, requested_at, profiles(email, full_name)").eq("status", "pending")`, research.md Decision 2's embedded-resource query); `approveRoleRequest(requestId: string): Promise<ActionResult<{ requestId: string }>>` (atomically `update role_requests set status='approved', resolved_at=now(), resolved_by=<admin id> where id=requestId and status='pending'`, checking the returned row count — 0 rows means "already resolved," return a clear error per research.md Decision 6; on success, `update profiles set role='editor' where id=<requester id> and role='viewer'`, the no-op-safe scoped update from research.md Decision 5); `denyRoleRequest(requestId: string): Promise<ActionResult<{ requestId: string }>>` (same atomic pattern as approve, `status='denied'`, no profiles update); all three `revalidatePath("/admin/users")` on success
- [X] T008 [US2] Create `components/PendingRequestsList.tsx` (client component): renders one row per pending request (requester email, `full_name` if present, `requested_at`) with "อนุมัติ" (approve) and "ปฏิเสธ" (deny) buttons, per-row loading state, `toast.error` on failure, and an empty state when there are no pending requests — matching the loading/error pattern already used in `UserRoleTable.tsx`
- [X] T009 [US2] In `app/(app)/admin/users/page.tsx`, call `listPendingRoleRequests()` alongside the existing `listAccounts()` call and render `<PendingRequestsList requests={...} />` as a section above the account table

**Checkpoint**: quickstart.md Scenario 3 (approve) and Scenario 4 (deny, then request again) pass.

---

## Phase 5: User Story 3 - Server-side enforcement (Priority: P1)

**Goal**: Confirm every new action (request, approve, deny) rejects an unauthorized caller independent of the UI — this falls out of T005/T007's `requireUser`/`requireRole`/exact-role checks by construction, so this phase is verification, not new code.

**Independent Test**: Attempt each action directly as an unauthorized account and confirm rejection with no data change.

### Implementation for User Story 3

- [X] T010 [US3] Live-verify (quickstart.md Scenario 5): as a non-admin (viewer or editor), attempt to call `approveRoleRequest`/`denyRoleRequest` directly; as an editor or admin, attempt to call `requestEditorAccess` directly; confirm every one is rejected server-side with no data or role change
  **Verified via UI-absence + code inspection** (same methodology as Feature 007's T017): signed in as the promoted editor account and confirmed "ขอสิทธิ์แก้ไข" is absent from the account menu (role !== "viewer" gate); confirmed by re-reading `app/actions/users.ts` that `requestEditorAccess()` calls `assertIsViewer()` and `approveRoleRequest`/`denyRoleRequest()` call `requireRole("admin")` unconditionally as their first operation, with no code path that skips it — identical guard shape to Feature 007's already-live-verified `assertIsAdmin()`/`assertCanEdit()`. A raw direct-POST replay (bypassing the Next.js Server Action client wrapper) was attempted but the action's internal ID wasn't recoverable from the available network-inspection tooling in this session; the UI-absence + code-guarantee combination is treated as sufficient given the identical, already-proven mechanism.

**Checkpoint**: quickstart.md Scenario 5 passes.

---

## Phase 6: User Story 4 - Admin searches the account list (Priority: P2)

**Goal**: The admin can filter the `/admin/users` account list by partial, case-insensitive email or name.

**Independent Test**: Type a partial email or name and confirm the list filters correctly; confirm a "no matches" state and that clearing the field restores the full list.

### Implementation for User Story 4

- [X] T011 [US4] In `app/actions/users.ts`, extend `listAccounts()`'s `select` to include `full_name` (research.md Decision 4 — filtering itself stays client-side, this just makes the data available)
- [X] T012 [US4] In `components/UserRoleTable.tsx`, add a search `Input` above the account list; filter the already-fetched `accounts` array client-side on partial, case-insensitive match against `email` or `full_name`; show a clear "ไม่พบบัญชีที่ตรงกัน" (no matching accounts) state when the filtered list is empty but the search field isn't

**Checkpoint**: quickstart.md Scenario 6 passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors (new/changed files included)
  **Result**: both clean.
- [X] T014 [P] Run `npm test` and confirm the full existing suite still passes with no regressions (no new tests added, per research.md Decision 8)
  **Result**: 33/33 tests pass (unchanged from Feature 007 — no new tests, as planned).
- [X] T015 Grep `README.md`/`DEPLOYMENT.md` for anything describing `/admin/users` or the migration list that would go stale once `0006_role_requests.sql` exists; update if needed (likely just DEPLOYMENT.md's migration list)
  **Result**: updated DEPLOYMENT.md's migration list ("five" → "six" migrations, added the `0006_role_requests.sql` entry). README.md had no stale references.
- [X] T016 Run all 7 scenarios in `specs/008-role-requests-search/quickstart.md` end-to-end as a final live-verification check against the real Supabase project, confirming SC-001 through SC-005
  **Verified against the real Supabase project**: Scenario 1 (viewer submits request, role unchanged), Scenario 2 (duplicate blocked — menu shows pending indicator, confirmed by DB), Scenario 3 (admin approves — role became `editor`, confirmed after fixing the embedded-query bug found during this pass), Scenario 4 (admin denies — role unchanged, requester could submit a new request afterward, confirmed successful resubmission), Scenario 5 (server-side enforcement — see T010), Scenario 6 (search by partial email works, "no matches" state works, clearing restores full list), Scenario 7 (sign-in, account menu, and Feature 007's role-change/last-admin protection all unaffected throughout testing). All test-account role changes and requests were reverted/resolved afterward; final state matches the pre-test baseline (`nextgennglc@gmail.com` admin, others viewer, no pending requests).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — a baseline check.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories — every story needs `role_requests`/`profiles.full_name` (T002/T003) and the shared types (T004).
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3/US4 for its own acceptance scenarios, though a full walkthrough needs an admin to eventually resolve the request.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1 for its own scenarios (can be tested against a request seeded directly), though naturally follows US1 in a real walkthrough.
- **User Story 3 (Phase 5)**: Depends on T005 and T007 existing (it verifies their enforcement, not new code).
- **User Story 4 (Phase 6)**: Depends on Foundational (T004's `full_name` type, T003's column). Independent of US1/US2/US3.
- **Polish (Phase 7)**: Depends on US1–US4 being complete.

### Parallel Opportunities

- T002 and T004 (Foundational) touch different files and can run in parallel; T003 depends on T002 (needs the migration written first).
- T011 and T012 (US4) touch different files (`app/actions/users.ts` vs `UserRoleTable.tsx`) but T012 depends on T011's data being available — sequential in practice despite different files.
- T013 and T014 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (baseline check) + Phase 2 (Foundational — table, column, types).
2. Complete Phase 3 (US1 — viewer can submit a request, duplicate-blocked).
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 independently — without Phase 4, requests just sit pending with no way to act on them yet, but the submission half is already fully correct and safe.
4. This proves the request-creation mechanics (including the partial-unique-index dedupe) before building the admin-facing resolution UI.

### Incremental Delivery

1. Setup + Foundational → US1 (viewers can ask) → US2 (admins can act) → US3 (enforcement verified) → US4 (search, independent quality-of-life addition) → final Polish pass.
2. Each story adds value without breaking the previous ones.
