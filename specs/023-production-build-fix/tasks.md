---

description: "Task list for Production Build Fix"

---

# Tasks: Production Build Fix

**Input**: Design documents from `/specs/023-production-build-fix/`

**Status**: Retroactively documented — already implemented and verified.

## Phase 1: Fix

- [X] T001 [P] In `app/login/page.tsx`, extract the existing component body into `LoginPageContent`; make the default-exported `LoginPage` a wrapper rendering `<Suspense><LoginPageContent /></Suspense>`
- [X] T002 [P] In `app/auth/confirm/page.tsx`, same pattern: extract into `AuthConfirmPageContent`, wrap in `<Suspense>`

## Phase 2: Verification

- [X] T003 [P] `npx tsc --noEmit` — clean
- [X] T004 [P] `npx next lint` — clean
- [X] T005 Clean `rm -rf .next && npm run build` — succeeds, all 13 routes generated (one pre-existing, unrelated Edge Runtime warning from `@supabase/supabase-js` noted but not blocking)
- [X] T006 `npm test` — 36/36 passing, unaffected

## Summary

6/6 tasks complete.
