# Phase 0 Research: Automated Testing Infrastructure

## Decision 1: Vitest over Jest

**Decision**: Use Vitest as the test runner.

**Rationale**: Native ESM and TypeScript support with no extra transform
configuration (this project already targets ESM-friendly output, `"module":
"esnext"` in `tsconfig.json`); fast (esbuild-based); zero-friction path alias
resolution via `vite-tsconfig-paths` instead of manually duplicating the
`@/*` mapping in a separate Jest `moduleNameMapper`. For a solo developer
(spec.md User Story 3), fewer moving config pieces means the setup stays
maintainable.

**Alternatives considered**:
- Jest — rejected: heavier config for a Next.js App Router + ESM project
  (needs `ts-jest`/Babel transforms and manual path-alias mapping that
  duplicates `tsconfig.json`), for no capability this project's initial
  logic-level test scope actually needs.
- Next.js's built-in `next test` (Playwright-based, still experimental in
  this Next version) — rejected for this pass: browser-based E2E is out of
  scope per spec.md Assumptions ("logic-level, not full browser E2E"); would
  also reintroduce a heavier, slower feedback loop than FR-007's "well under
  a minute" target calls for at this stage.

## Decision 2: Extract `rangesOverlap` into `lib/date-range.ts`

**Decision**: Move the existing `rangesOverlap` function out of
`app/actions/photos.ts` (where it's currently defined inline, unexported)
into a new `lib/date-range.ts`, and import it back into the Server Action.

**Rationale**: `app/actions/photos.ts` has a `"use server"` directive at the
top of the file, and Server Actions can depend on Next.js request-scoped APIs
(`cookies()`, `revalidatePath()`) that only work inside an actual Next.js
request/render — calling `createWeek` directly from a Vitest test would hit
`revalidatePath`'s "outside request scope" failure. `rangesOverlap` itself has
no such dependency — it's a pure function of four date strings — so moving it
to its own module makes it directly testable with no Next.js runtime needed
at all, while the Server Action keeps calling it exactly the same way.

**Alternatives considered**:
- Test `createWeek` directly and mock `next/cache`/`next/navigation` —
  rejected: adds mocking complexity for every Server Action test going
  forward, when the actual rule worth protecting (the overlap math) has
  nothing to do with Next.js at all. Extracting it is less code, not more.
- Leave it inline and skip testing it — rejected: it's explicitly named in
  FR-004 and spec.md's own example of a rule worth protecting.

## Decision 3: Isolating the "local" backend's disk state from real dev data

**Decision**: Add an environment-variable override to `lib/local/store.ts`:
`LOCAL_BASE_DIR` resolves from `process.env.LOCAL_DATA_DIR` when set,
falling back to today's `path.join(process.cwd(), ".local-data")` otherwise.
A Vitest `setupFiles` script sets `LOCAL_DATA_DIR` to a fresh OS temp
directory (`fs.mkdtempSync`) before any test module is collected/imported, so
`LOCAL_BASE_DIR` picks up the override at module-load time; the temp
directory is removed after the full run.

**Rationale**: `lib/local/store.ts` already re-reads `db.json` from disk on
every call (no in-memory cache — a real desync bug earlier in this project
was fixed by removing exactly that cache), so pointing it at an isolated,
disposable directory for the duration of a test run is sufficient for
isolation (FR-003) without needing per-test directories or any change to the
module's core read/write pattern.

**Alternatives considered**:
- Mock `node:fs` entirely — rejected: more moving parts than necessary, and
  would test the mocks' behavior more than the real disk-write code path
  (`writeUploadedFile`, `deleteUploadedFile`) this feature specifically wants
  covered (cascading delete actually removing files).
- Make `LOCAL_BASE_DIR` a function parameter threaded through every exported
  function — rejected: a much larger refactor across every call site in
  `app/actions/photos.ts`/`documents.ts` for a solo-developer testing setup
  that an environment variable already solves cleanly.

## Decision 4: What stays out of automated coverage in this pass

**Decision**: Sign-in/sign-out session lifecycle and any Supabase-backed code
path are not given automated test coverage in this feature — they continue to
rely on `tsc --noEmit` (already run today) and manual verification once
Supabase credentials exist, exactly as documented in spec.md's Assumptions.

**Rationale**: Testing real auth/session behavior meaningfully requires a
live Supabase project (or a heavy mock of `@supabase/ssr`'s cookie-based
session handling) — either would violate FR-002's "no live Supabase, no
credentials" constraint, or would test a mock's behavior rather than
anything real. This is a deliberate, documented scope boundary, not an
oversight.

**Alternatives considered**:
- Mock the entire Supabase client for auth tests — rejected for this pass:
  high effort for tests that mostly re-verify the mock does what was told,
  with limited confidence gained about real Supabase behavior.
