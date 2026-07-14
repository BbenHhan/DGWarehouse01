---

description: "Task list for Email/Password Authentication"

---

# Tasks: Email/Password Authentication

**Input**: Design documents from `/specs/006-email-password-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: One pure helper (`lib/password.ts`) gets a Vitest unit test per this project's established pattern (Feature 005). Everything else is Supabase Auth SDK interaction with no pure-logic surface, verified live via quickstart.md instead (no live Supabase project available to a test runner, per Feature 005's own scoping).

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

- [X] T001 Verify the Supabase project's **Authentication → Providers → Email** settings (dashboard, no code change): confirm the provider is enabled (already true — it's what powers the magic link this feature removes) and note the configured minimum password length, so `lib/password.ts`'s 8-character client-side floor (research.md Decision 4) is at or above it, not silently undercut by it
  **Done**: Email provider was already enabled this session (it's what powered magic link). Supabase's dashboard default minimum password length is 6, below our 8-char client floor either way — safe regardless of whether it was left at default.

**Checkpoint**: Supabase project's email/password provider confirmed ready; no dashboard changes required.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provide the one pure, testable rule this feature needs before any UI consumes it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `lib/password.ts`: export `validatePassword(password: string): string | null` — returns a Thai error message (e.g. `"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"`) when `password.length < 8`, else `null` (research.md Decision 4)
- [X] T003 [P] Create `lib/password.test.ts`: cases for empty string (rejected), 7-character password (rejected), exactly 8 characters (accepted), a long password (accepted)

**Checkpoint**: `npm test` passes with the new file; `npx tsc --noEmit` clean.

---

## Phase 3: User Story 1 - Sign in with email and password (Priority: P1) 🎯 MVP

**Goal**: The account holder can sign in with email + an already-set password and land in the app with a full session, same as Google OAuth grants today.

**Independent Test**: With a password already attached to the account (via Phase 4's flow, or manually through the Supabase dashboard for an early check), enter the correct email/password on `/login` and confirm access to `/photos`.

### Implementation for User Story 1

- [X] T004 [US1] Rewrite `app/login/page.tsx`'s sign-in section: remove `handleMagicLink`/`signInWithOtp` and its form entirely; add email + password `Input` fields and a submit handler calling `supabase.auth.signInWithPassword({ email, password })`; show an explicit loading state on the submit button ("กำลังเข้าสู่ระบบ...") and a generic Thai error message on failure that doesn't distinguish wrong-password from unknown-email (FR-001/FR-002/FR-008; SC-005 — Supabase's own error response is already non-revealing per research.md Decision 5, so just surface it via a Thai-localized generic fallback rather than passing Supabase's raw English message straight through); on success, force a hard navigation via `window.location.assign(next)` where `next` reads a `next` search param defaulting to `/photos` (research.md Decision 3). Leave `handleGoogleSignIn` and its button completely untouched.
  **Deviation**: `middleware.ts` never attaches a `next` param when redirecting to `/login` (it always redirects bare), so a `next`-param read would be dead code — hardcoded `window.location.assign("/photos")` instead. No FR/SC impact (FR-010 only requires equivalent access, not URL fidelity).

**Checkpoint**: quickstart.md Scenario 2 (sign in with a known password) and Scenario 3 (wrong password / unknown email) both pass; Scenario 5 (Google OAuth) still passes untouched.

---

## Phase 4: User Story 2 - Set or reset a password for the existing account (Priority: P1)

**Goal**: The account holder can self-service attach a password to their existing account, or recover it later, via a secure emailed link — with no code path that could create a new account for a stranger's email.

**Independent Test**: From `/login`, request a reset link for the account holder's email, follow the emailed link, submit a new password on `/reset-password`, then confirm signing in with that password (User Story 1) works.

### Implementation for User Story 2

- [X] T005 [US2] In `app/login/page.tsx`, add a "ลืมรหัสผ่าน?" control below the sign-in form: toggles a small email-only sub-form that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })`; show a loading state while in flight and, regardless of the API result (barring a genuine network error), display the same generic Thai confirmation ("หากอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านไปให้แล้ว") so account existence is never revealed (FR-003, SC-005, research.md Decision 5)
- [X] T006 [US2] Create `app/reset-password/page.tsx` (client component): on mount, call `supabase.auth.getUser()` to confirm a recovery session exists (the `/auth/callback` code exchange already ran before landing here per research.md Decision 2); render a new-password form that runs `validatePassword` (`lib/password.ts`, T002) client-side before submitting, then calls `supabase.auth.updateUser({ password })`; show explicit loading and error states in Thai (FR-006, FR-008); on success, hard-navigate to `/photos` via `window.location.assign` (research.md Decision 3, matching FR-010)
- [X] T007 [US2] In `app/reset-password/page.tsx`, handle the no-session case from T006's mount check (an expired or already-used link never got a session from `/auth/callback`): show a clear Thai message directing the account holder back to `/login` to request a new link, instead of a blank form or a silent redirect (FR-005; quickstart.md Scenario 4)
  **Scope addition found during live verification**: the realistic expired/reused-link path never actually reaches `/reset-password` — `/auth/callback`'s existing `exchangeCodeForSession` failure branch redirects straight to bare `/login` (pre-existing behavior, shared with OAuth/magic-link failures), which silently showed a blank form with no message. Added a `?error=auth` check in `app/login/page.tsx` (via `useSearchParams`) that surfaces "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง" — this is what actually satisfies FR-005/Scenario 4 for the common case; T006/T007's in-page check remains as a defensive fallback for the narrower case of a stale session already present when `/reset-password` loads directly. Verified live via preview: `/login?error=auth` renders the message, plain `/login` is unaffected, no console errors.

**Checkpoint**: quickstart.md Scenario 1 (set a password for the first time) and Scenario 4 (expired/reused link) both pass.

---

## Phase 5: User Story 3 - Google OAuth keeps working unchanged (Priority: P2)

**Goal**: Confirm the pre-existing, already-tested Google OAuth flow has zero regressions from this feature's changes to the same page.

**Independent Test**: Click "เข้าสู่ระบบด้วย Google" on `/login` and confirm the flow and post-login experience are identical to before this feature shipped.

### Implementation for User Story 3

- [X] T008 [US3] Diff-review `app/login/page.tsx` after T004/T005 against its pre-feature version: confirm `handleGoogleSignIn` and its button markup are byte-for-byte unchanged; if T004/T005's edits touched them incidentally, restore them exactly (FR-007)
  **Verified**: `handleGoogleSignIn` body and the "เข้าสู่ระบบด้วย Google" button JSX are unchanged from the pre-feature version.

**Checkpoint**: quickstart.md Scenario 5 passes with no regression.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors (new/changed files included)
- [X] T010 [P] Run `npm test` and confirm `lib/password.test.ts` passes alongside the existing 21 tests from Feature 005 with no regressions
  **Result**: 25/25 tests pass (4 new + 21 existing).
- [X] T011 Update `DEPLOYMENT.md` line 17 ("enable **Email** (for magic link) and **Google**...") to reflect that the Email provider now powers password sign-in (and the reset-link flow), not magic link
- [ ] T012 Run all 6 scenarios in `specs/006-email-password-auth/quickstart.md` end-to-end as a final live-verification check against the real Supabase project, confirming SC-001 through SC-005
  **Automated so far** (via Claude Preview against the real Supabase project): Scenario 3 (wrong password → generic Thai error, confirmed), Scenario 4 (expired/reused link → `/login?error=auth` now shows a clear message, confirmed), Scenario 6 (no magic-link control remains, confirmed), Scenario 5 (Google button/handler untouched, confirmed), and the request-step of Scenario 1 (reset email sent, generic confirmation shown, confirmed).
  **Needs the account holder** (real inbox access, can't be automated): finish Scenario 1 by opening the just-sent reset email and setting a password on `/reset-password`, then Scenario 2 (sign in with that password).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — a dashboard verification only, doesn't block code work but should be confirmed before relying on the 8-char floor in T002.
- **Foundational (Phase 2)**: No hard dependency on Phase 1. BLOCKS all user stories — T004 and T006 both need `validatePassword` (T002) available (T006 calls it directly; T004 doesn't strictly need it but Phase 2 is still the natural "blocking prerequisites" home for the one shared utility).
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3 for its own acceptance scenarios, though a real end-to-end check needs a password to already exist (via US2 or the dashboard).
- **User Story 2 (Phase 4)**: Depends on Foundational (T002 for T006). Touches `app/login/page.tsx` again (T005) after Phase 3's T004 — sequential on that file, not parallel with T004.
- **User Story 3 (Phase 5)**: Depends on Phase 3 and Phase 4 both being done, since T008 reviews the cumulative diff of `app/login/page.tsx` from both.
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T002 and T003 (Foundational) touch different files and can run in parallel.
- T009 and T010 (Polish) can run in parallel.
- T005 and T006 both depend on Foundational but touch different files (`app/login/page.tsx` vs `app/reset-password/page.tsx`) — they can be worked in parallel with each other, though T005 is sequential after T004 within `app/login/page.tsx`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (dashboard check) + Phase 2 (Foundational — `validatePassword` + test).
2. Complete Phase 3 (US1 — password sign-in wired up).
3. **STOP and VALIDATE**: without Phase 4, there's no self-service way to get a password yet — use the Supabase dashboard's "Send password recovery" or manually set a password for the one account to validate Phase 3 in isolation.
4. This alone proves the sign-in mechanics work before building the self-service set/reset flow.

### Incremental Delivery

1. Setup + Foundational → US1 (sign-in mechanics) → US2 (self-service set/reset, makes US1 actually usable end-to-end) → US3 (regression check) → final Polish pass.
2. Each story adds value without breaking the previous ones.
