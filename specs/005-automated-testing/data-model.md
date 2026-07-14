# Phase 1 Data Model: Automated Testing Infrastructure

Not applicable — this feature is developer-facing tooling infrastructure
(a test runner and test files), not a feature that introduces, changes, or
reads application data entities. No `Week`/`Photo`/`Document`/etc. shape
changes are involved.

The only "entity" of note is process-level, not data-level: the temporary
directory Vitest points `lib/local/store.ts` at during a test run (see
research.md Decision 3), which is created and destroyed per test run and
never persisted or referenced by application code.
