# Feature Specification: Automated Testing Infrastructure

**Feature Branch**: `005-automated-testing`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Feature: Automated Testing Infrastructure. Add automated testing infrastructure to the project and start covering it, so regressions can be caught without a human re-testing every page by hand every time something changes. No test runner, test config, or test file exists anywhere in the repo yet. Tests should be able to run without a live Supabase project or real credentials. The project is actively developed solo by one person, so the setup needs to be maintainable by that one person going forward."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catch business-logic regressions automatically (Priority: P1)

As the solo developer/maintainer of this app, I want the app's core business
rules (not just its UI) to be checked automatically, so that when I change
code for one feature, I find out immediately if I silently broke a rule
established by an earlier feature — instead of finding out days later because
I happened to click through that specific page again.

**Why this priority**: This is the actual regression-safety-net value the
feature exists to deliver. Several real bugs this project already hit (an
in-memory cache desyncing between Server Actions and Server Component
renders, a schema too strict for non-UUID IDs) were logic bugs a human had to
manually re-discover by clicking around — exactly the class of problem this
story prevents from recurring silently.

**Independent Test**: Deliberately reintroduce one of this project's past
real bugs (e.g. loosen the week date-overlap check so it wrongly allows an
overlapping range) and confirm the test suite fails clearly, pointing at the
broken rule, without any manual browser interaction.

**Acceptance Scenarios**:

1. **Given** the test suite is run, **When** it completes, **Then** it reports
   pass/fail for each of the app's core business rules (at minimum: week
   date-range overlap detection, file type/size validation, cascading delete
   of a week's files, chronological week sorting) without needing a browser.
2. **Given** a business rule is broken by a code change, **When** the test
   suite is run, **Then** it fails with a message that identifies which rule
   broke, not just "something is wrong somewhere."
3. **Given** a business rule continues to behave correctly, **When** the test
   suite is run repeatedly with no relevant code changes, **Then** it passes
   consistently (no flaky/random failures).

---

### User Story 2 - Run tests without any live external dependency (Priority: P1)

As the developer, I want to run the full test suite at any time — including
with no internet connection, no live Supabase project configured, and no
real credentials available — so testing is never blocked by external service
availability or account setup.

**Why this priority**: This is a hard constraint carried over from the rest
of the project's architecture (the "local" storage backend exists precisely
so the app is usable/testable without a live Supabase project) — without it,
the test suite would inherit the exact dependency problem this project has
already gone out of its way to avoid elsewhere.

**Independent Test**: Disconnect from the internet (or block outbound
network access) and run the test suite; confirm it still runs to completion
with the same results as when online.

**Acceptance Scenarios**:

1. **Given** no `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`
   environment variables are set (or they point at nothing reachable),
   **When** the test suite runs, **Then** it completes normally with no
   test failing due to a network/connection error.
2. **Given** the test suite has just run successfully, **When** it is run
   again immediately after with no code changes, **Then** results are
   identical — nothing depends on real-world state that could have changed
   between runs (e.g. a real database's contents).

---

### User Story 3 - Fits the solo developer's normal workflow (Priority: P2)

As the developer, I want to run the tests with one simple, memorable command
and get a fast result, so testing becomes something I actually do before
committing rather than a chore I skip.

**Why this priority**: A safety net nobody actually runs provides no safety.
This is about adoption/habit-forming, which matters less than the tests
existing and being correct (US1/US2), but determines whether the investment
actually pays off day to day.

**Independent Test**: From a clean checkout with dependencies installed, run
the single documented test command and confirm it completes in well under a
minute, clearly reporting pass/fail.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repo with dependencies installed, **When**
   the developer runs the single documented test command, **Then** the full
   suite runs and reports a clear pass/fail summary.
2. **Given** the developer wants to add a test for a new piece of logic,
   **When** they look at how existing tests are written, **Then** the
   pattern is clear enough to copy without consulting external
   documentation for the basics.

---

### Edge Cases

- What happens if a test needs to check behavior that only differs between
  the "local" and "mock"/"supabase" backends? The test suite should be able
  to exercise the "local" and "mock" backends directly (no real credentials
  needed for either), while Supabase-specific code paths are validated by
  type-checking and manual review only, consistent with how the project has
  already been operating with no live Supabase project for most of its life.
- What happens when a test needs a clean starting state (e.g. no pre-existing
  weeks in the local backend)? Each test run must not depend on leftover
  state from a previous run or interfere with a developer's own local
  `.local-data/` folder used for manual testing.
- What happens when someone runs the tests on a machine that has never
  configured any environment variables at all? Covered by User Story 2 —
  must still run to completion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST have a test suite runnable via a single
  command, documented for anyone (i.e. future-the-developer) picking the
  project back up.
- **FR-002**: The test suite MUST run to completion without any live
  Supabase project, real credentials, or internet access.
- **FR-003**: The test suite MUST NOT read from or write to the developer's
  own manual-testing data (the local disk-backed storage folder used when
  running the app normally) — test runs must be isolated from it.
- **FR-004**: The test suite MUST include coverage for, at minimum: week
  date-range overlap detection, file/MIME/size validation rules, cascading
  deletion of a week's files, and chronological week ordering.
- **FR-005**: Each test failure MUST clearly identify which specific rule or
  behavior failed, not just that "a test failed."
- **FR-006**: Test results MUST be consistent across repeated runs with no
  code changes (no flakiness/randomness).
- **FR-007**: The test suite MUST complete quickly enough to run before
  every commit without being a deterrent (target: well under a minute for
  the coverage established in this feature).
- **FR-008**: Adding a new test for a new piece of logic MUST be possible by
  following the pattern of an existing test, without requiring new
  infrastructure to be built each time.

### Key Entities

- N/A — this feature is developer-facing tooling infrastructure, not a
  feature involving application data entities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from "I changed some code" to "I know
  whether I broke an existing business rule" in under a minute, without
  opening a browser.
- **SC-002**: 100% of the test suite runs successfully with zero network
  access and zero Supabase credentials configured.
- **SC-003**: At least 4 of this project's previously-manually-discovered
  business rules (overlap detection, validation, cascading delete,
  chronological sort) are now covered by a test that would fail if the rule
  were broken again.
- **SC-004**: A test run produces the same pass/fail result every time it is
  run against unchanged code, across at least 5 consecutive runs.

## Assumptions

- **Scope is unit/integration-level, not full browser E2E**: Given the hard
  "no live Supabase, no network" constraint, this feature covers logic-level
  testing (business rules, data-layer functions) rather than full
  browser-driven end-to-end tests. Browser-based E2E testing (e.g. clicking
  through the actual rendered UI) is a reasonable future extension but is not
  required to satisfy this feature's success criteria.
- **"Local" and "mock" backends are the testable surface**: Since both run
  with no external dependency (disk-backed and read-only-folder-backed,
  respectively), they are what the test suite exercises directly. The
  Supabase-backed code paths remain protected the same way they already are
  today — type-checking (`tsc --noEmit`) and manual verification once a live
  project exists — since testing them for real would reintroduce the exact
  live-dependency problem this feature exists to avoid.
- **No coverage percentage target**: "Solo developer, maintainable" is
  prioritized over a specific code-coverage number — this feature establishes
  the infrastructure and covers the specific rules named in FR-004, not every
  line of the codebase.
- **No CI pipeline changes**: This feature adds the ability to run tests
  locally; wiring them into a CI/CD pipeline (e.g. GitHub Actions) is a
  separate, later concern not required for this feature's success criteria.
