# Feature Specification: Don't Show Expired-Link Error When Session Already Established

**Feature Branch**: `013-confirm-session-check`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "The confirm page showed 'link expired' but refreshing landed on the home page, already signed in — meaning the confirmation actually succeeded. Don't show the expired error if login actually worked."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A successful sign-in is never reported as a failure (Priority: P1)

Someone confirming their email or completing a password reset, whose confirmation actually succeeds and leaves them signed in, never sees an error message claiming otherwise.

**Why this priority**: This is the entire defect — a person who is, in fact, successfully signed in should never be told the opposite. It directly undermines trust in the app and causes real confusion (the user thought something was broken when it wasn't).

**Independent Test**: Trigger the confirmation flow in a way that causes the specific code-exchange call to report failure while a valid session has nonetheless already been established, and confirm the person is taken into the app rather than shown an error.

**Acceptance Scenarios**:

1. **Given** the confirmation action is triggered more than once in close succession (e.g. an accidental double-click), and one of those attempts succeeds in establishing a session while a later one fails, **When** the page decides what to show, **Then** the person is taken into the app — no error is shown.
2. **Given** a person's confirmation attempt fails and they are shown the expired-link message, **When** they refresh the page while genuinely still unauthenticated, **Then** they see the same message again (no false success either).

---

### User Story 2 - A genuinely dead link still shows a clear error (Priority: P1)

If a confirmation link truly never worked for anyone — expired, tampered, or already fully used in a prior separate visit — the person still sees a clear message telling them so.

**Why this priority**: This fix must not swing to the opposite failure mode of hiding real problems; a truly broken link must still be reported clearly, matching the existing, already-shipped behavior for genuine failures.

**Independent Test**: Attempt confirmation with a link that has no valid session behind it at all (never succeeded for anyone), and confirm the clear error message still appears.

**Acceptance Scenarios**:

1. **Given** a confirmation link that never resulted in a valid session (truly expired, invalid, or already fully consumed in an earlier, separate visit), **When** the person attempts to confirm it, **Then** they see the clear expired/error message, unchanged from before this fix.

---

### Edge Cases

- What happens if the confirmation genuinely fails and the person is not signed in at all? The clear error message shows, exactly as it did before this fix (User Story 2).
- What happens if checking for an existing session itself fails (e.g. a network hiccup)? Falls back to the existing error-message behavior — this fix only adds a *more accurate* success path, it doesn't need to invent new failure handling for a check that itself can't complete.
- What happens on a normal, non-duplicated confirmation attempt (the common case — no double-click, no race)? Behavior is unchanged: success shows success, genuine failure shows the error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before displaying the expired/error message, the system MUST check whether a valid, authenticated session already exists in the browser.
- **FR-002**: If a valid session already exists at that point, the system MUST proceed into the app (the same outcome as a successful confirmation) instead of showing an error, regardless of whether the specific confirmation attempt that just ran reported failure.
- **FR-003**: If no valid session exists, the system MUST continue to show the existing clear expired/error message — this fix must not suppress genuine failures.
- **FR-004**: This behavior applies wherever the expired/error message could currently appear on the confirmation page introduced in the prior feature.

### Key Entities

- No new entities — this changes how an existing outcome (session established or not) is checked before deciding what to display, not any stored data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time a confirmation attempt results in a valid session (by any path), the person is taken into the app — never shown an error.
- **SC-002**: 100% of the time no valid session exists after a confirmation attempt, the clear error message is shown — zero silent or misleading successes.
- **SC-003**: Zero change in behavior for a normal, single, successful confirmation (no duplicate trigger involved).

## Assumptions

- The specific trigger that caused the observed race (e.g. exact double-click timing, or another duplicate-invocation path) doesn't need to be pinned down precisely — the fix targets the actual observable inconsistency (error shown despite a real session existing), which is checkable directly and covers the root cause regardless of exactly how the race occurs.
