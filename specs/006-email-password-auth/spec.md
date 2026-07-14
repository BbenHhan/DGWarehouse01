# Feature Specification: Email/Password Authentication

**Feature Branch**: `006-email-password-auth`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Replace magic-link sign-in with real email + password sign-in/sign-up (Supabase Auth's native email/password provider), keeping Google OAuth as the alternative sign-in method. Single-user app — sign-up must work for the one real account holder to set/reset their password without becoming an open registration endpoint for strangers."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with email and password (Priority: P1)

The account holder opens the login page, enters their email and password, and is signed in and taken to the app — the same way Google OAuth sign-in already works today.

**Why this priority**: This is the core capability being added; without it, nothing else in this feature matters.

**Independent Test**: With a password already set on the account, enter the correct email/password on the login page and confirm the app grants access to the normal authenticated experience.

**Acceptance Scenarios**:

1. **Given** the account holder has a password set on their account, **When** they enter the correct email and password on the login page and submit, **Then** they are signed in and land on the app's main screen.
2. **Given** the account holder enters an incorrect password, **When** they submit the form, **Then** they see a clear error message and remain on the login page with their session unaffected.

---

### User Story 2 - Set or reset a password for the existing account (Priority: P1)

The account holder, who previously only ever signed in via magic link or Google, needs a way to attach a password to their existing account (or recover it later if forgotten) — without this turning into an open sign-up form anyone could use.

**Why this priority**: Without this, User Story 1 is unusable — there is no way to ever obtain a password to sign in with.

**Independent Test**: From the login page, request a password-set/reset link for the account holder's email, receive the email, follow the link, choose a new password, and confirm signing in with that password afterward succeeds.

**Acceptance Scenarios**:

1. **Given** the account holder is on the login page, **When** they request a password-set/reset link for their email address, **Then** they receive an email with a secure, time-limited link.
2. **Given** the account holder opens a valid, unused reset link, **When** they submit a new password meeting the minimum requirements, **Then** their account's password is updated and they can immediately sign in with it.
3. **Given** the account holder opens a reset link that has expired or was already used, **When** they try to submit a new password, **Then** they see a clear message telling them to request a new link, and no password is changed.

---

### User Story 3 - Google OAuth keeps working unchanged (Priority: P2)

The account holder can still sign in with their Google account exactly as before — this feature only adds a new sign-in method, it doesn't touch the existing one.

**Why this priority**: Protects an already-working, already-tested flow from regressing while this feature is built.

**Independent Test**: Click "เข้าสู่ระบบด้วย Google" on the login page and confirm the sign-in flow and post-login experience are unchanged from before this feature shipped.

**Acceptance Scenarios**:

1. **Given** the login page now also shows email/password fields, **When** the account holder clicks the Google sign-in button instead, **Then** they are taken through the same Google OAuth flow as before and signed in successfully.

---

### Edge Cases

- What happens when the account holder enters an email with no matching account? The system shows a generic error/confirmation that does not reveal whether that email has an account, to avoid leaking account existence to strangers.
- What happens when someone repeatedly requests password-reset links for the same or different emails? Standard Supabase Auth rate-limiting applies; no custom throttling is built for this feature.
- What happens when the reset link is opened on a different device or browser than the one that requested it? It still works — the link itself carries the authorization, not the device/session that requested it.
- What happens if the account holder submits a new password that doesn't meet the minimum strength requirement? The form rejects it with a clear message before any request is sent.
- What happens if someone who is not the account holder tries to use the reset-link flow to gain access? They can only ever affect the one existing account tied to the account holder's email; no new account can be created through this flow, and they cannot choose which account the link applies to.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The login page MUST let the account holder sign in with email and password, in addition to the existing Google OAuth option.
- **FR-002**: The system MUST validate the email/password combination and reject sign-in with a clear, non-revealing error message when the combination is invalid.
- **FR-003**: The system MUST provide a self-service way for the account holder to set a password on their account for the first time, or reset it later if forgotten, via a secure link sent to their registered email address.
- **FR-004**: The password-set/reset flow MUST NOT create new accounts for arbitrary email addresses — it MUST only ever apply to the application's single existing account, never function as open self-registration.
- **FR-005**: The password-reset link MUST expire after a limited time and MUST NOT be usable more than once.
- **FR-006**: The system MUST enforce a minimum password strength requirement when a new password is set or reset.
- **FR-007**: The existing Google OAuth sign-in flow MUST continue to work exactly as it does today, unchanged by this feature.
- **FR-008**: Every sign-in and password-set/reset action MUST show an explicit loading state while in progress and an explicit, clear error state on failure — no silent failures or indefinite spinners.
- **FR-009**: Magic-link sign-in MUST be removed from the login page — email/password and Google OAuth are the only sign-in methods offered afterward.
- **FR-010**: A successful email/password sign-in MUST grant the account holder the same authenticated session and app access as signing in via Google OAuth — no reduced or expanded capability based on sign-in method.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The account holder can sign in with email and password in under 15 seconds under normal conditions.
- **SC-002**: 100% of failed sign-in attempts (wrong password, unknown email) show a clear, actionable message instead of a silent failure, a crash, or a generic unhandled error.
- **SC-003**: The account holder can go from "no password set" to "signed in with a password" entirely self-service, with no manual/developer intervention required.
- **SC-004**: After this feature ships, Google OAuth sign-in has zero regressions compared to its behavior before this change.
- **SC-005**: No sign-in or password-reset error message reveals whether a given email address has an account on the system.

## Assumptions

- The application's single account already exists in Supabase Auth (created during earlier sign-in testing via Google OAuth), so "sign-up" in this feature means attaching a password to that existing account, not creating a brand-new one.
- No public self-service registration form is introduced; the only way to associate a password with the account is the emailed set/reset link, which keeps this a single-tenant system per Constitution Principle VII.
- Password strength requirements follow Supabase Auth's standard default policy (e.g., minimum length) rather than a custom-invented policy, since no specific compliance requirement drives this feature.
- Magic-link sign-in is fully removed from the login page per Constitution v4.0.0 (Principle VII); anyone who previously relied on it will use password or Google OAuth going forward.
- Sign-in/reset rate-limiting and brute-force protection are provided by Supabase Auth's built-in behavior, not custom application logic.
- Route protection (redirect to `/login` when unauthenticated) and the existing account menu/sign-out feature are unaffected — this feature only changes the sign-in methods available on the login page.
