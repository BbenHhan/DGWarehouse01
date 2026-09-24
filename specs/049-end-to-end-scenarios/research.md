# Research: End-to-End Scenarios in a Real Browser

## Decision 1 — Playwright, Chromium only

**Decision**: `@playwright/test`, one browser engine, a dev dependency.

**Rationale**: It starts and stops the app itself, waits on real page state rather than on timers, and opens downloads as files — which US2 needs to read the archive. One engine keeps a run near a minute; the app has no browser-specific code, and the extraction difference that matters is an operating system question (specs/047 T012), not an engine one.

**Alternatives considered**: Cypress — no straightforward download handling, and a heavier runner for the same result. Driving the in-app browser by hand — what happened twice already; it found the 375px defect but nothing kept it from coming back.

## Decision 2 — The sign-in switch is settable, and refused on a deployment

**Decision**: `AUTH_REQUIRED` stays `true` unless `NEXT_PUBLIC_AUTH_REQUIRED=false` **and** the app is not running on a deployment (Vercel sets `VERCEL` in its environment). The data source reads `NEXT_PUBLIC_DATA_SOURCE`, defaulting to `supabase` exactly as today.

**Rationale**: The assistant cannot enter a password or create an account, so a run that needs a session cannot happen. Everything else — the checklist, uploads, the archive, the room rules, phone width — does not need one. The danger is obvious: an instance deployed with sign-in off. Refusing the switch whenever the deployment environment is present closes that by construction rather than by remembering.

**Alternatives considered**: A test account with credentials in the environment — the scenarios would prove more, but the account holder would have to create and hold a real password for a test, and the assistant still could not use it. Left on the manual list instead (FR-014).

## Decision 3 — A fixture seeded through the app's own storage layer

**Decision**: Before a run, write `.e2e-data/` by calling the same local-store functions the app uses, then point the app at that directory with `LOCAL_DATA_DIR`.

**Rationale**: Hand-writing a JSON file would encode assumptions about a format the app owns; calling the store means the fixture is always in whatever shape the app currently reads. `LOCAL_DATA_DIR` already exists for the Vitest suite, so the developer's own `.local-data/` is never touched (FR-008).

## Decision 4 — Each run starts from a fresh fixture

**Decision**: Delete and rebuild `.e2e-data/` at the start of every run.

**Rationale**: FR-006 and SC-004. Scenarios add, re-status and delete; leftovers would make a second run disagree with the first. Rebuilding is a few files and costs nothing.

## Decision 5 — Two run modes, two app instances

**Decision**: One instance with sign-in off on one port for most scenarios, a second with sign-in required on another port for the redirect scenario. Playwright starts both.

**Rationale**: The setting is read at start-up, so one instance cannot be both. Two ports is simpler and faster than restarting between scenarios, and it means US5 exercises the guard in exactly the position production uses.

## Decision 6 — Scenarios assert what a person sees

**Decision**: Locate by role and visible Thai text, and check the page after a reload rather than trusting the screen immediately after a click.

**Rationale**: FR-002 and the point of the exercise: an optimistic update that never reached storage looks right until the page comes back. Reloading is what tells them apart, and it is what no existing check does.

## Decision 7 — With sign-in off, a local development identity

**Decision**: When sign-in is off, `getCurrentUser()` reports a local administrator instead of nobody.

**Rationale**: Without it the page hides every editing control and the scenarios could only read. `requireUser` and `requireRole` already short-circuit in this mode; this makes the display side agree with them. It only applies where the switch applies — never on a deployment.
