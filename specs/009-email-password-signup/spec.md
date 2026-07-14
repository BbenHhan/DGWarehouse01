# Feature Specification: Email/Password Sign-Up

**Feature Branch**: `009-email-password-signup`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Feature 007's FR-001 ('anyone MUST be able to create a new account via email/password sign-up') was never actually implemented — only Google OAuth could create new accounts. Add a real email/password sign-up flow to the login page, using Supabase Auth's native signUp(), landing new accounts as viewer (already guaranteed by Feature 007's trigger)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Someone without an account signs up with email and password (Priority: P1)

A person who doesn't yet have an account creates one directly with their own email and a password they choose, without needing a Google account and without anyone else's involvement.

**Why this priority**: This is the literal gap being closed — right now the only way to create a new account at all is Google OAuth, which excludes anyone who doesn't want to use (or doesn't have) a Google account. Without this, Feature 007's "open sign-up" promise is only half true.

**Independent Test**: From the login page, switch to sign-up, submit a new email and a valid password, and confirm an account now exists for that email with the `viewer` role.

**Acceptance Scenarios**:

1. **Given** someone is on the login page with no account, **When** they switch to the sign-up form and submit a new email with a valid password, **Then** an account is created for that email.
2. **Given** a newly created account, **When** its role is checked, **Then** it is `viewer` — the same default every other sign-up method already produces (Feature 007).
3. **Given** the account was created and no further confirmation step is required by the system, **When** sign-up completes, **Then** the person is signed in and taken into the app immediately.
4. **Given** the account was created but a confirmation step is required by the system, **When** sign-up completes, **Then** the person sees a clear message telling them to check their email before they can sign in.

---

### User Story 2 - Weak passwords are rejected before submission (Priority: P2)

Someone signing up gets immediate feedback if their chosen password is too weak, instead of a failed round trip.

**Why this priority**: Consistent with how password strength is already handled elsewhere in the app (Feature 006's password-reset flow); prevents a confusing wasted submission.

**Independent Test**: Attempt to sign up with a password below the minimum length and confirm it's rejected before any account-creation attempt is made.

**Acceptance Scenarios**:

1. **Given** someone enters a password shorter than the app's minimum, **When** they submit the sign-up form, **Then** they see a clear message about the minimum requirement and no account-creation attempt is made.

---

### User Story 3 - Existing sign-in methods are unaffected (Priority: P1)

Everyone who could already get into the app before this feature — via password sign-in, the forgot-password flow, or Google — can still do so exactly as before.

**Why this priority**: This feature only adds a new way in; it must not touch the ways that already work, several of which were already live-verified in this project (Features 006/007).

**Independent Test**: Confirm password sign-in, forgot-password, and Google sign-in all still work after this feature ships.

**Acceptance Scenarios**:

1. **Given** the login page now also offers sign-up, **When** an existing account holder signs in with their password, uses "forgot password," or signs in with Google, **Then** each works exactly as it did before this feature.

---

### Edge Cases

- What happens when someone tries to sign up with an email that already has an account? The system does not create a duplicate or reveal whether the email is already registered — consistent with how the existing forgot-password flow already avoids revealing account existence (Feature 006).
- What happens if sign-up is attempted with no network connectivity or the system is otherwise unable to complete it? A clear error is shown; no partial or inconsistent state is left behind.
- What happens if someone switches from the sign-up form back to sign-in mid-entry? Nothing is submitted; they land back on the sign-in form cleanly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The login page MUST offer a way to switch to a sign-up form and back to sign-in, without navigating to a different page.
- **FR-002**: The sign-up form MUST accept an email and a password and submit them to create a new account.
- **FR-003**: A successfully created account MUST default to the `viewer` role, with no way for the person signing up to choose a different role for themselves (already the system-wide invariant from Feature 007 — this feature must not weaken it).
- **FR-004**: The system MUST reject a sign-up attempt whose password does not meet the app's existing minimum password strength requirement, before attempting to create the account.
- **FR-005**: If account creation results in an immediately usable session, the system MUST sign the person in and take them into the app.
- **FR-006**: If account creation requires a confirmation step before the session is usable, the system MUST show a clear message instructing the person to check their email, not a silent or ambiguous result.
- **FR-007**: The system MUST NOT reveal whether a given email already has an account, whether sign-up is attempted for a new or existing email.
- **FR-008**: Existing sign-in, forgot-password, and Google sign-in flows on the login page MUST continue to work unchanged.
- **FR-009**: Every sign-up attempt MUST present an explicit loading state while in progress and an explicit error state on failure — no silent failures.

### Key Entities

- No new entities — this feature creates accounts through the same Supabase Auth identity and `profiles`/role mechanism Feature 007 already established; it adds a creation path, not a new data shape.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person without a Google account can create a working account and reach the app in under a minute, entirely through email and password.
- **SC-002**: 100% of new accounts created through this flow start with `viewer` role — never anything else.
- **SC-003**: 100% of sign-up attempts with a too-weak password are rejected before any account-creation attempt, with a clear explanation.
- **SC-004**: Zero regressions in existing sign-in, forgot-password, or Google sign-in behavior after this feature ships.
- **SC-005**: No sign-up outcome (success or failure) reveals whether a given email was already registered.

## Assumptions

- Whether Supabase issues an immediate session on sign-up or requires email confirmation first is a project-level setting outside this feature's control; the feature must handle both outcomes gracefully rather than assume one.
- The minimum password strength requirement is the one already established in Feature 006 (`lib/password.ts`, 8 characters) — this feature reuses it rather than defining a new one.
- This feature does not change how existing accounts (created via Google OAuth, or the account holder's original account) work — it only adds a new creation path for accounts that don't exist yet.
