---

description: "Task list for Email/Password Sign-Up"

---

# Tasks: Email/Password Sign-Up

**Input**: Design documents from `/specs/009-email-password-signup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — the new logic is a thin branch around a live Supabase Auth call with no pure-logic surface (research.md). Verified live via quickstart.md.

**Note**: This feature's implementation predates this task list — the code was written and live-verified in the same session, at the user's request to formalize it through the full workflow afterward. Tasks below are checked based on verification against the existing code, not fresh implementation; any real gap found during that verification is called out explicitly.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*No setup tasks — no new dependencies, no new files, no schema changes (data-model.md).*

---

## Phase 2: Foundational (Blocking Prerequisites)

*No foundational tasks — this feature reuses `lib/password.ts` (Feature 006) and the `on_auth_user_created` trigger (Feature 007) entirely as-is.*

---

## Phase 3: User Story 1 - Someone without an account signs up with email and password (Priority: P1) 🎯 MVP

**Goal**: A real sign-up mode on the login page creates a working account, landing as `viewer`.

**Independent Test**: Sign up with a new email; confirm the account exists with `role = 'viewer'`.

### Implementation for User Story 1

- [X] T001 [US1] In `app/login/page.tsx`, add a `mode: "signin" | "signup" | "forgot"` state (replacing the prior `showForgotPassword` boolean) and a "สมัครสมาชิก" control on the sign-in form that switches to `"signup"`, plus a "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" control on the sign-up form that switches back to `"signin"` (FR-001)
- [X] T002 [US1] In `app/login/page.tsx`, add `handleSignUp()`: calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: \`${window.location.origin}/auth/callback\` } })`; on success, branch on `data.session` — if present, hard-navigate to `/photos` (research.md Decision 2); if absent, show a "check your email" message reusing the same pattern as the existing forgot-password `"sent"` state (FR-002/FR-005/FR-006)
- [X] T003 [US1] Verify (no code change expected): a newly created account's `profiles.role` is `'viewer'`, via the unchanged `on_auth_user_created` trigger from Feature 007 (FR-003)

**Checkpoint**: quickstart.md Scenario 1 passes.

---

## Phase 4: User Story 2 - Weak passwords are rejected before submission (Priority: P2)

**Goal**: Sign-up reuses the existing password-strength check, rejecting weak passwords before any account-creation attempt.

**Independent Test**: Submit a sub-8-character password; confirm rejection with no `signUp()` call attempted.

### Implementation for User Story 2

- [X] T004 [US2] In `app/login/page.tsx`'s `handleSignUp()`, call `validatePassword` (`lib/password.ts`, Feature 006) before calling `supabase.auth.signUp()`; on a validation error, show the message and return without attempting sign-up (FR-004, research.md Decision 4)

**Checkpoint**: quickstart.md Scenario 2 passes.

---

## Phase 5: User Story 3 - Existing sign-in methods are unaffected (Priority: P1)

**Goal**: Sign-in, forgot-password, and Google OAuth on the same page are unchanged by adding sign-up.

**Independent Test**: Exercise all three existing flows after this feature and confirm no behavior change.

### Implementation for User Story 3

- [X] T005 [US3] Diff-review `app/login/page.tsx`: confirm `handleSignIn`, `handleForgotPassword`, and `handleGoogleSignIn` are unchanged in behavior — only the surrounding mode-switch UI and state variable naming (`showForgotPassword` → `mode === "forgot"`) changed, not their logic (FR-008)

**Checkpoint**: quickstart.md Scenario 3 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T006 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
- [X] T007 [P] Run `npm test` and confirm the full existing suite still passes with no regressions (no new tests added)
- [X] T008 Run all 4 scenarios in `specs/009-email-password-signup/quickstart.md` end-to-end as a final live-verification check against the real Supabase project, confirming SC-001 through SC-005
  **Verified against the real Supabase project**: Scenario 1 (new sign-up created a real `auth.users` row + `profiles.role = 'viewer'` via the trigger, confirmed by direct query — done during the original gap-fix, test account cleaned up); Scenario 2 (an under-8-character password was rejected client-side with "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" and confirmed via `auth.admin.listUsers()` that no account was created); Scenario 3 (sign-in, forgot-password, and Google OAuth were all exercised extensively during Feature 008's live testing, which happened after this fix landed, with no issues — confirms no regression); Scenario 4 (no code path distinguishes existing vs. new email on sign-up failure, matching the already-verified forgot-password behavior from Feature 006).

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 3)**: No dependencies — reuses existing infrastructure entirely.
- **User Story 2 (Phase 4)**: Depends on T002 (the `handleSignUp` function it adds a check inside).
- **User Story 3 (Phase 5)**: Depends on T001/T002 existing (it reviews their diff for unintended side effects on the other handlers).
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T006 and T007 (Polish) can run in parallel.
- All other tasks touch the same single file (`app/login/page.tsx`) and are inherently sequential.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1) — sign-up creates a working, viewer-role account.
2. **STOP and VALIDATE**: run quickstart.md Scenario 1 — this alone closes the FR-001 gap.

### Incremental Delivery

1. US1 (the gap closed) → US2 (password validation reused, not reinvented) → US3 (no regression confirmed) → Polish.
2. Given the small footprint (one file), all three stories were implemented together in practice; this ordering reflects logical dependency, not separate work sessions.
