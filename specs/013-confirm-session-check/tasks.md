---

description: "Task list for Don't Show Expired-Link Error When Session Already Established"

---

# Tasks: Don't Show Expired-Link Error When Session Already Established

**Input**: Design documents from `/specs/013-confirm-session-check/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — live Supabase Auth interaction with no pure-logic surface (research.md). Verified live via quickstart.md.

**Organization**: Tasks are grouped by user story (US1–US2 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None.*

## Phase 2: Foundational

*None — this is a self-contained fix to one existing component.*

---

## Phase 3: User Story 1 - A successful sign-in is never reported as a failure (Priority: P1) 🎯 MVP

**Goal**: Check for an existing session before showing the error; guard against double-invocation.

**Independent Test**: quickstart.md Scenario 1.

### Implementation for User Story 1

- [X] T001 [US1] In `app/auth/confirm/page.tsx`, add `const inFlight = useRef(false)` and check/set it synchronously at the very start of `handleConfirm` (return immediately if already `true`) — closes the timing gap where a fast double-click could fire the handler twice before the button's `disabled` state takes effect (research.md Decision 2)
- [X] T002 [US1] In `app/auth/confirm/page.tsx`'s `handleConfirm`, when `exchangeCodeForSession` returns an error, call `supabase.auth.getUser()` before setting the error state — if `data.user` is present, hard-navigate to `next` (same as the success path) instead of showing the error (research.md Decision 1)
- [X] T003 [US1] Live-verify (quickstart.md Scenario 1): rapidly double-click (or otherwise duplicate-trigger) the confirm button on a valid code and confirm the outcome is success, not the expired-link error
  **Fully verified**: tooling-side, a rapid triple-click on an invalid code was handled cleanly — no console errors, no duplicate/inconsistent UI state. **Closed out 2026-07-13**: the account holder confirmed with a real confirmation link that the false "link expired" message is gone and sign-in now succeeds correctly ("หายแระ").

**Checkpoint**: quickstart.md Scenario 1 passes.

---

## Phase 4: User Story 2 - A genuinely dead link still shows a clear error (Priority: P1)

**Goal**: Confirm the genuine-failure path is unchanged.

**Independent Test**: quickstart.md Scenario 2.

### Implementation for User Story 2

- [X] T004 [US2] Live-verify (quickstart.md Scenario 2): attempt confirmation with an invalid code while genuinely unauthenticated (no session from any path) and confirm the clear expired-link error still appears
  **Verified**: navigated to `/auth/confirm` with an invalid code, clicked confirm — `exchangeCodeForSession` failed, `getUser()` correctly found no session either, and the clear "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว" message appeared, unchanged from before this fix.

**Checkpoint**: quickstart.md Scenario 2 passes.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T005 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T006 [P] Run `npm test`, confirm no regressions
  **Result**: 33/33 pass, unchanged.
- [X] T007 Run all 3 scenarios in `specs/013-confirm-session-check/quickstart.md` live, confirming SC-001 through SC-003 (including Scenario 3 — normal single confirmation unaffected)
  **Fully verified** (see T003/T004): genuine-failure path and no-crash-on-rapid-clicks confirmed via tooling; the real-world race scenario confirmed fixed by the account holder on 2026-07-13. All scenarios closed.

---

## Dependencies & Execution Order

T001 and T002 both touch `app/auth/confirm/page.tsx` (sequential). T003 depends on T001/T002. T004 depends on the same file being in its final state (though it exercises a path T001/T002 don't change). T005–T007 depend on US1–US2 being complete; T005/T006 can run in parallel.

## Implementation Strategy

T001+T002 together deliver the entire fix; T003/T004 verify both the fixed path and the unchanged path; T005–T007 close out.
