# Implementation Plan: Automated Testing Infrastructure

**Branch**: `005-automated-testing` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-automated-testing/spec.md`

## Summary

Add Vitest as the project's test runner (from scratch — no test infra exists
today) and cover the four business rules named in FR-004 by testing the
underlying pure/logic-level functions directly, not through Server Actions or
a browser. One small, enabling refactor is required: `rangesOverlap` currently
lives unexported inside `app/actions/photos.ts` and must move to a shared,
framework-independent module to be unit-testable. The local disk-backed
storage module (`lib/local/store.ts`) already has no Next.js-specific
dependencies, so it's tested directly as-is, with one small addition (an
overridable base directory) so tests never touch the developer's real
`.local-data/` folder.

## Technical Context

**Language/Version**: TypeScript 5 (existing project — unchanged)

**Primary Dependencies**: `vitest` (test runner) + `vite-tsconfig-paths` (so
Vitest resolves the project's existing `@/*` path alias from `tsconfig.json`
automatically, instead of duplicating it in a separate config). No React
Testing Library / jsdom — this pass covers logic-level tests only (Assumptions
in spec.md), which run fine in Vitest's default Node environment.

**Storage**: The "local" backend (`lib/local/store.ts`) is the system under
test for storage-related rules; tests point it at a temporary directory via
a new `LOCAL_DATA_DIR` environment variable override (never the developer's
real `.local-data/`), created fresh and deleted after each test file runs.

**Testing**: This *is* the testing feature — Vitest, run via `npm test`.

**Target Platform**: Node.js (test runner), same as the rest of this Next.js
project — no browser required for this pass.

**Project Type**: Web application (single Next.js project) — tests live
alongside the source they cover, not a separate test project.

**Performance Goals**: Full suite completes in well under a minute (FR-007,
SC-001) — realistic for the scope here (a few dozen unit-level cases with no
I/O beyond temp-directory disk writes).

**Constraints**: Zero network access, zero Supabase credentials, zero
interference with the developer's own `.local-data/` folder (FR-002, FR-003).
Must not require rewriting `app/actions/photos.ts`'s Server Actions to be
testable — Server Actions stay as thin wrappers; the logic they call is what
gets extracted/tested.

**Scale/Scope**: 1 new dependency pair (`vitest`, `vite-tsconfig-paths`), 1
new config file (`vitest.config.ts`), 1 new small shared module
(`lib/date-range.ts`, extracted from `app/actions/photos.ts`), 1 small change
to `lib/local/store.ts` (overridable base directory), 1 npm script (`test`),
and 3 test files covering the FR-004 rules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only** — ✅ Not implicated; no routing changes.
- **II. Server Actions & Supabase Client Boundary** — ✅ Server Actions remain
  the only place mutations are triggered from the app; extracting
  `rangesOverlap` into a shared module doesn't move any mutation logic out of
  the Server Action layer, it moves a pure decision function that the Server
  Action still calls.
- **III. Storage-Agnostic File Persistence with a Cloud Migration Path** — ✅
  Tests exercise the "local" backend directly, consistent with this
  principle's existing local/Supabase split; no test talks to Supabase.
- **IV. Thai-First, Mobile-First UI** — ✅ Not implicated; no UI in this
  feature.
- **V. Resilient Async UX** — ✅ Not implicated directly, though the tests
  added here protect some of the async logic (cascading delete) this
  principle already requires to behave correctly.
- **VI. Tailwind-Only Styling** — ✅ Not implicated.
- **VII. Single-User Auth via Supabase** — ✅ Not implicated; session/auth
  logic is explicitly out of scope for automated coverage in this pass
  (spec.md Assumptions) since it requires a live Supabase project to exercise
  for real.
- **VIII. Universal File Attachments** — ✅ File/MIME/size validation (one of
  this principle's own requirements) is directly covered by FR-004.

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-automated-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output (N/A — no data entities; documents why)
├── quickstart.md         # Phase 1 output — how to run/add tests
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

No `contracts/` directory — this feature is internal developer tooling with
no interface exposed to users or other systems (plan-template's explicit
"skip if purely internal" case).

### Source Code (repository root)

```text
package.json              # + "test" script, + vitest/vite-tsconfig-paths devDependencies
vitest.config.ts          # new — Node environment, tsconfig-paths plugin
lib/date-range.ts          # new — rangesOverlap extracted from app/actions/photos.ts
lib/date-range.test.ts     # new
lib/validation.test.ts     # new
lib/local/store.test.ts    # new
app/actions/photos.ts       # updated — imports rangesOverlap from lib/date-range.ts instead of defining it inline
lib/local/store.ts          # updated — LOCAL_BASE_DIR overridable via LOCAL_DATA_DIR env var
```

**Structure Decision**: No new projects/directories beyond the spec folder.
Tests are colocated next to the source files they cover
(`<file>.test.ts` beside `<file>.ts`), matching common Vitest/Next.js
convention and keeping the "find the test for this file" question trivial for
a solo developer (spec.md User Story 3).

## Complexity Tracking

*No violations — table omitted.*
