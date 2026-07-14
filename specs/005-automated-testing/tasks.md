---

description: "Task list for Automated Testing Infrastructure"

---

# Tasks: Automated Testing Infrastructure

**Input**: Design documents from `/specs/005-automated-testing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: This feature *is* the test infrastructure — its own tasks are the tests.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

- [X] T001 Install `vitest` and `vite-tsconfig-paths` as devDependencies (`npm install -D vitest vite-tsconfig-paths`)
- [X] T002 Create `vitest.config.ts` at the repo root: Node environment, `tsconfigPaths()` plugin so `@/*` imports resolve the same way they do in the rest of the project, `setupFiles: ["./vitest.setup.ts"]` (created in T005)
- [X] T003 Add a `"test": "vitest run"` script to `package.json` (and optionally `"test:watch": "vitest"` for local iteration)

**Checkpoint**: `npm test` runs (even with zero test files yet) and exits cleanly.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the target logic testable in isolation, per research.md Decisions 2–3.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Create `lib/date-range.ts`: move the `rangesOverlap(aStart, aEnd, bStart, bEnd): boolean` function here (exported) from `app/actions/photos.ts`; update `app/actions/photos.ts` to `import { rangesOverlap } from "@/lib/date-range"` instead of defining it inline — behavior unchanged, `createWeek`'s overlap check still calls the same function
- [X] T005 [P] Add the `LOCAL_DATA_DIR` env-var override to `lib/local/store.ts` per research.md Decision 3: `LOCAL_BASE_DIR` resolves `process.env.LOCAL_DATA_DIR` (via `path.resolve`) when set, else keeps today's `path.join(process.cwd(), ".local-data")`
- [X] T006 [P] Create `vitest.setup.ts` at the repo root: in a `beforeAll`, create a fresh OS temp directory (`fs.mkdtempSync`) and set `process.env.LOCAL_DATA_DIR` to it before any test module imports `lib/local/store.ts`; in an `afterAll`, remove the temp directory recursively

**Checkpoint**: `tsc --noEmit` passes; `lib/local/store.ts` writes only ever land under the Vitest temp dir when `LOCAL_DATA_DIR` is set; `createWeek`'s overlap behavior is unchanged (verify via a quick manual local-mode check).

---

## Phase 3: User Story 1 - Catch business-logic regressions automatically (Priority: P1) 🎯 MVP

**Goal**: The four named rules (overlap detection, file validation, cascading delete, chronological sort) each have a test that fails clearly if the rule breaks.

**Independent Test**: Deliberately break one rule, watch its test fail with a clear message, revert, watch it pass (quickstart.md Scenario 3).

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `lib/date-range.test.ts`: cases for non-overlapping ranges (false), fully-overlapping ranges (true), partial overlap on each side (true), identical ranges (true), and adjacent-but-not-overlapping ranges (false, boundary case)
- [X] T008 [P] [US1] Create `lib/validation.test.ts`: cases for `validateFile()` — accepted image/PDF/video MIME types pass, a disallowed MIME type is rejected with a message naming the file, an oversized file (mock a `File` with `size` over `MAX_FILE_SIZE_BYTES`) is rejected; plus `createWeekSchema`'s date-order refinement (end before start is rejected)
- [X] T009 [US1] Create `lib/local/store.test.ts` covering cascading delete: create a week via `localCreateWeek`, save a photo into it via `localSavePhotoFile`, confirm the file exists on disk under the test temp dir, call `localDeleteWeek`, then assert the week is gone from `localGetWeeks`, the photo is gone from `localGetPhotos`, and the file no longer exists on disk
- [X] T010 [US1] In the same `lib/local/store.test.ts`, cover chronological sort: create three weeks via `localCreateWeek` with out-of-order date ranges (e.g. June, then May, then July), call `localGetWeeks`, and assert the returned order is ascending by `start_date` regardless of creation order

**Checkpoint**: All four FR-004 rules have a real, breakable test (verified via quickstart.md Scenario 3's "break it and watch it fail" check for each).

---

## Phase 4: User Story 2 - Run tests without any live external dependency (Priority: P1)

**Goal**: Confirm the suite genuinely requires no network access or Supabase credentials — mostly a verification pass, since Phase 2/3's design already avoids both.

**Independent Test**: Run with `.env.local` removed and/or network disconnected; results are identical to a normal run (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T011 [US2] Verify (temporarily rename `.env.local`, run `npm test`, restore it) that no test fails due to a missing Supabase env var or network call — if a gap is found (e.g. an accidental import of a Supabase client module at the top level of a tested file), fix it by ensuring test files only import `lib/date-range.ts`, `lib/validation.ts`, and `lib/local/store.ts` (none of which import `@supabase/*`)
- [X] T012 [US2] Verify test runs don't touch the developer's real `.local-data/` folder: check `.local-data/db.json`'s contents before and after a test run and confirm no change (quickstart.md Scenario 4)

**Checkpoint**: `npm test` passes identically with zero Supabase credentials and zero network access, and never touches real `.local-data/`.

---

## Phase 5: User Story 3 - Fits the solo developer's normal workflow (Priority: P2)

**Goal**: One simple command, fast feedback, and a clear pattern to copy for the next test.

**Independent Test**: From a clean checkout, `npm install && npm test` completes in well under a minute with a clear summary (quickstart.md Scenario 1).

### Implementation for User Story 3

- [X] T013 [US3] Add a short "Running tests" section to `README.md`: the `npm test` command, one sentence on where test files live (colocated `*.test.ts`), and one sentence pointing at `lib/date-range.test.ts` as the simplest example to copy for a new test
- [X] T014 [US3] Time a full `npm test` run and confirm it completes in well under a minute (FR-007/SC-001) — if not, identify and address the slow part before closing this task

**Checkpoint**: A developer unfamiliar with the setup can read `README.md`, run one command, and know how to add the next test.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors (test files included)
- [X] T016 [P] Run `npm test` 5 consecutive times with no code changes and confirm identical results each time (quickstart.md Scenario 5, FR-006/SC-004)
- [X] T017 Run all 5 scenarios in `specs/005-automated-testing/quickstart.md` end-to-end as a final check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — BLOCKS everything (no test can run before Vitest exists).
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories — T007–T010 need `lib/date-range.ts` (T004) and the isolated temp-dir setup (T005–T006) to exist first.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on US1's tests existing (T011/T012 verify the suite T007–T010 produced, not new tests of their own).
- **User Story 3 (Phase 5)**: Depends on Phase 1 (T003's `npm test` script) and benefits from US1 existing (T014 times the real suite) — otherwise independent of US2.
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T001–T003 (Setup) are sequential (each depends on the last existing) but T004, T005, T006 (Foundational) touch three unrelated files and can run in parallel.
- T007 and T008 (US1) touch different files and can run in parallel; T009/T010 share a file (sequential within it).
- T015 and T016 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Vitest installed and wired) + Phase 2 (Foundational —
   extraction + isolation).
2. Complete Phase 3 (US1 — the four rules actually covered).
3. **STOP and VALIDATE**: run quickstart.md Scenario 3 independently.
4. This alone already delivers the core regression-safety-net value.

### Incremental Delivery

1. Setup + Foundational → US1 (rules covered, MVP) → US2 (offline-safety
   verified) → US3 (workflow polish + docs) → final Polish pass.
2. Each story adds value without breaking the previous ones.
