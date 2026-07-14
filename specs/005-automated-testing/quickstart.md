# Quickstart: Verify Automated Testing Infrastructure

## Prerequisites

- Dependencies installed (`npm install`) after `vitest`/`vite-tsconfig-paths`
  are added.

## Scenario 1: Single command runs the whole suite (US3)

1. Run `npm test` from the repo root.
2. **Expect**: the suite runs to completion and prints a clear pass/fail
   summary, with no manual browser interaction.

## Scenario 2: Works with zero network / zero Supabase credentials (US2)

1. Temporarily unset (or rename) `.env.local` so no Supabase env vars are
   present, and/or disconnect from the network.
2. Run `npm test` again.
3. **Expect**: identical results to Scenario 1 — no test fails due to a
   missing credential or unreachable network call.
4. Restore `.env.local`.

## Scenario 3: Business rules are actually covered (US1, FR-004)

1. Open `lib/date-range.ts` and temporarily break the overlap check (e.g.
   make it always return `false`).
2. Run `npm test`. **Expect**: the overlap-detection test fails, clearly
   naming what broke.
3. Revert the change; run `npm test` again. **Expect**: passes again.
4. Repeat the same "break it, see it fail, revert, see it pass" check for
   one rule in each of the other three covered areas (file/MIME/size
   validation in `lib/validation.ts`, cascading delete and chronological
   sort in `lib/local/store.ts`) to confirm each is a real, meaningful test
   and not a no-op.

## Scenario 4: Test runs don't touch real dev data (FR-003)

1. Before running tests, note whether `.local-data/db.json` exists in the
   repo root and what it contains (if you've been using the app locally).
2. Run `npm test`.
3. **Expect**: `.local-data/db.json`'s contents (or absence) are unchanged
   after the test run — tests must have operated entirely in a separate
   temporary directory.

## Scenario 5: Repeatability (FR-006, SC-004)

1. Run `npm test` five times in a row with no code changes in between.
2. **Expect**: identical pass/fail results every time.
