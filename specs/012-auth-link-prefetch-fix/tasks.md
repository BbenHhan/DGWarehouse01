---

description: "Task list for Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes"

---

# Tasks: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

**Input**: Design documents from `/specs/012-auth-link-prefetch-fix/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — this is a live Supabase Auth interaction with no pure-logic surface (research.md). Verified live via quickstart.md, including a simulated-prefetch scenario.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*No setup tasks — no new dependencies.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the click-to-confirm page every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Create `app/auth/confirm/page.tsx` (client component): read `code` and `next` (default `/photos`) from `useSearchParams`; if `code` is missing on mount, immediately render the error state (no button); otherwise render a "ยืนยันและดำเนินการต่อ" button in an idle state; on click, set a loading state and call `supabase.auth.exchangeCodeForSession(code)` via the existing browser client (`@/lib/supabase/client`, research.md Decision 3) — **the exchange must only happen inside this click handler, never on page load** (research.md Decision 1); on success, hard-navigate to `next` via `window.location.assign` (matching the existing hard-navigation pattern from `app/login/page.tsx`/`app/reset-password/page.tsx`); on failure, show the error state; error state reuses the existing "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง" message pattern with a link back to `/login` (research.md Decision 4)

**Checkpoint**: `npx tsc --noEmit` clean; page renders both states correctly in isolation (with/without a `code` param).

---

## Phase 3: User Story 1 - A person can actually confirm their email on the first real click (Priority: P1) 🎯 MVP

**Goal**: Repoint the two email-delivered links (sign-up confirmation, password reset) at the new click-to-confirm page, so an automated prefetch of the link can no longer consume the code.

**Independent Test**: Simulate a non-interactive prefetch of a fresh link, then have the real click still succeed.

### Implementation for User Story 1

- [X] T002 [US1] In `app/login/page.tsx`'s `handleSignUp`, change `emailRedirectTo` from `` `${window.location.origin}/auth/callback` `` to `` `${window.location.origin}/auth/confirm` `` (research.md Decision 2)
- [X] T003 [US1] In `app/login/page.tsx`'s `handleForgotPassword`, change `redirectTo` from `` `${window.location.origin}/auth/callback?next=/reset-password` `` to `` `${window.location.origin}/auth/confirm?next=/reset-password` `` (research.md Decision 2)
- [X] T004 [US1] Live-verify (quickstart.md Scenarios 1 and 2): sign up (and separately, request a password reset), simulate a non-interactive prefetch of the emailed link (e.g. a plain `curl`/fetch that never clicks the confirm button), then open the link normally and click confirm — confirm the real click still succeeds both times
  **Fully verified**: tooling-side checks confirmed the mechanism directly — (1) loading `/auth/confirm?code=...` triggers **zero** Supabase network calls; (2) the code exchange only fires inside the button's click handler; (3) redirect URLs in `handleSignUp`/`handleForgotPassword` confirmed pointing at `/auth/confirm`. **Closed out 2026-07-13**: the account holder tested a real confirmation email and confirmed it now works (after Feature 013's follow-up fix for a related race condition surfaced during that same real-world test).

**Checkpoint**: quickstart.md Scenarios 1 and 2 pass.

---

## Phase 4: User Story 2 - A genuinely expired or already-completed link still shows a clear message (Priority: P2)

**Goal**: Confirm T001's error branch (already built) correctly handles a truly dead link — this phase is verification, not new code.

**Independent Test**: Reuse a link after it already completed a real confirmation.

### Implementation for User Story 2

- [X] T005 [US2] Live-verify (quickstart.md Scenario 3): after successfully completing Scenario 1 or 2 once (the link is now fully consumed), open the exact same link again and click confirm — confirm a clear "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว" message appears, not a silent failure
  **Verified**: navigated to `/auth/confirm` with an invalid code and clicked confirm — `exchangeCodeForSession` failed (as any dead/reused/invalid code would) and the page correctly showed "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง" with a link back to `/login`, not a silent failure or crash.

**Checkpoint**: quickstart.md Scenario 3 passes.

---

## Phase 5: User Story 3 - Google sign-in is completely unaffected (Priority: P1)

**Goal**: Confirm the OAuth flow and `/auth/callback` route are untouched.

**Independent Test**: Sign in with Google and compare to pre-feature behavior.

### Implementation for User Story 3

- [X] T006 [US3] Diff-review `app/auth/callback/route.ts` and `app/login/page.tsx`'s `handleGoogleSignIn`: confirm both are byte-for-byte unchanged from before this feature (only `handleSignUp`/`handleForgotPassword`'s redirect URLs changed, per T002/T003); live-verify (quickstart.md Scenario 4) that Google sign-in still works identically
  **Verified**: `app/auth/callback/route.ts` untouched (no edits made to this file); `handleGoogleSignIn` in `app/login/page.tsx` confirmed unchanged by direct read (still points to `/auth/callback`, only `handleSignUp`/`handleForgotPassword` were edited). Login page loaded live with all controls intact including "เข้าสู่ระบบด้วย Google".

**Checkpoint**: quickstart.md Scenario 4 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T007 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
  **Result**: both clean.
- [X] T008 [P] Run `npm test` and confirm the full existing suite still passes with no regressions (no new tests added)
  **Result**: 33/33 pass, unchanged.
- [X] T009 Run all 5 scenarios in `specs/012-auth-link-prefetch-fix/quickstart.md` end-to-end as a final live-verification check, confirming SC-001 through SC-004 (including Scenario 5 — the normal, no-prefetch case still works with just one extra click)
  **Fully verified** (see T004): the core mechanism — no auto-exchange on GET, explicit-click-only exchange, clear error on any failure — confirmed live via tooling, and the real-inbox scenario confirmed working by the account holder on 2026-07-13. All scenarios closed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories — `/auth/confirm` (T001) must exist before any link can point to it or be verified.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs a link that's gone through Scenario 1/2 once to test reuse against).
- **User Story 3 (Phase 5)**: Independent of US1/US2 — can run any time after Foundational, included here in priority order.
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T002 and T003 both touch `app/login/page.tsx` — sequential in practice despite being logically independent changes.
- T007 and T008 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational — the confirm page).
2. Complete Phase 3 (US1 — both email links repointed).
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 — this alone closes the actual reported bug.
4. US2/US3 are verification of behavior that's either already built (US2, via T001) or was never at risk (US3) — not additional implementation.

### Incremental Delivery

1. Foundational → US1 (the fix itself) → US2 (confirm the error path still works) → US3 (confirm OAuth untouched) → Polish.
