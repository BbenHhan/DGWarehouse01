# Research: Cover the Remaining Server Actions

## Decision 1 — Content actions run for real against the local backend

**Decision**: photos, documents and checklist are exercised with `DATA_SOURCE` pointed at the local backend, only the rights check mocked, and the Supabase client stubbed to throw if anything tries to construct one.

**Rationale**: The pattern feature 045 established. The gate, the schema validation, the store and the disk all run, so a check failing means the path is genuinely broken rather than a mock disagreeing with reality. The thrown-on-construction client is what proves Constitution II's boundary: in local mode nothing should reach for Supabase.

**Alternatives considered**: Mocking the store — would assert that the action calls a function, not that the outcome is right, and would have missed the class of bug feature 045 found.

## Decision 2 — Deleting is proved on disk, not by watching calls

**Decision**: For the local path, assert that the file is gone from the temp directory after a delete, using the path the store reports.

**Rationale**: FR-005 is about the file, not about a function call. The local backend writes real bytes into a temp directory the test setup already isolates, so "the file is gone" can be read from the filesystem.

## Decision 3 — The Supabase delete order is proved with a stand-in

**Decision**: Also run delete with `DATA_SOURCE` set to Supabase and a stand-in client that records calls, asserting the stored object is removed and that the row is not deleted when removing the object fails.

**Rationale**: Production runs this branch, not the local one. The rule worth protecting is the order: a row deleted while its file remains leaves an orphan nobody can reach, and a file removed while the row remains leaves a listing pointing at nothing. Only the Supabase branch expresses that order.

**Alternatives considered**: Trusting that the local path implies the Supabase one — exactly the assumption that hid the renumbering bug in feature 045.

## Decision 4 — Account actions are checked against a stand-in, and that is a finding worth recording

**Decision**: `app/actions/users.ts` and `auth.ts` are checked with a stand-in client, since neither has a local path.

**Rationale**: There is no alternative without a live database. The rules being proved — who may call, the last administrator, a request acted on twice — live in the action itself, above the database, so a stand-in exercises them honestly. What a stand-in cannot prove is that the queries are right against real tables; that gap is recorded here rather than papered over, and end-to-end scenarios (feature 049) are where it gets closed.

## Decision 5 — One shared stand-in client

**Decision**: `lib/supabase-stub.ts` builds a chainable query double whose result per table is configured per test, and records the calls made.

**Rationale**: Three test files need the same double. `lib/group-requirements-before-migration.test.ts` already grew one inline; sharing it stops three copies drifting. It lives in `lib/` rather than a test file because a `.test.ts` file is a suite, not a module to import.

## Decision 6 — Uploads are checked with in-memory files

**Decision**: Build `File` objects in the test — oversized by declaring a large size, disallowed by giving a type outside the allowlist.

**Rationale**: The size and type checks read the file's metadata before any bytes are stored, so a real multi-hundred-megabyte file is unnecessary; creating one would make the suite slow for nothing.

## Decision 7 — Report defects, do not fix them quietly

**Decision**: If a check cannot pass without changing an action, stop and report it (FR-017, SC-006).

**Rationale**: The account holder asked for checks over the current behaviour. A test written to match a bug entrenches it; a test quietly "fixed" by changing an action hides a decision that is theirs to make.
