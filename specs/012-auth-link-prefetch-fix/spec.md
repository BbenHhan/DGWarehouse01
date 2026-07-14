# Feature Specification: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

**Feature Branch**: `012-auth-link-prefetch-fix`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Sign-up confirmation link shows 'expired or already used' on the very first click. Root cause: email security scanners auto-prefetch links in emails, consuming the one-time confirmation code before the real person clicks. Fix so only an explicit human action can consume the code."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A person can actually confirm their email on the first real click (Priority: P1)

Someone who just signed up (or requested a password reset) clicks the link in their email and it works — even though an automated email-security scanner may have already "visited" that same link in the background before they did.

**Why this priority**: This is the core defect — right now, a real first click can fail with a confusing "expired/already used" message through no fault of the person clicking it, which blocks account creation and password recovery entirely for anyone whose email provider does link-scanning (a large share of real inboxes, including Gmail and virtually all corporate email).

**Independent Test**: Simulate an automated prefetch of a fresh confirmation link (a plain, non-interactive visit), then have the actual person click the same link afterward, and confirm the person's click still succeeds.

**Acceptance Scenarios**:

1. **Given** a fresh sign-up confirmation link that has already been automatically prefetched once (simulating an email scanner), **When** the actual person then opens the link and takes the explicit confirmation action, **Then** they are signed in successfully.
2. **Given** a fresh password-reset link that has already been automatically prefetched once, **When** the actual person then opens the link and takes the explicit confirmation action, **Then** they reach the set-new-password screen successfully.
3. **Given** a person opens a confirmation or reset link that was never prefetched at all, **When** they take the explicit confirmation action, **Then** the outcome is identical to before this fix (signed in / land on set-new-password) — no new friction for the common case.

---

### User Story 2 - A genuinely expired or already-completed link still shows a clear message (Priority: P2)

If a link truly has expired, or the person already used it to complete their confirmation once, clicking it again still tells them clearly what happened.

**Why this priority**: This fix must not turn a real "this link is actually dead" case into a silent failure or an infinite retry loop — the existing clear-error behavior for genuinely invalid links must be preserved.

**Independent Test**: Use a confirmation link a second time after it already completed a real confirmation, and confirm a clear error is shown.

**Acceptance Scenarios**:

1. **Given** a confirmation link that a person already used to successfully complete sign-up or password reset, **When** the same link is opened again, **Then** a clear message explains the link is no longer valid, matching the app's existing error messaging.

---

### User Story 3 - Google sign-in is completely unaffected (Priority: P1)

Everyone who signs in with Google continues to work exactly as before — this fix only touches links delivered by email.

**Why this priority**: Google OAuth was never vulnerable to this issue (its authorization code arrives via a direct browser redirect from Google, not an emailed link), and it must not be touched or slowed down by this fix.

**Independent Test**: Sign in with Google after this feature ships and confirm identical behavior to before.

**Acceptance Scenarios**:

1. **Given** this fix has shipped, **When** someone signs in with Google, **Then** the flow and outcome are identical to before this feature.

---

### Edge Cases

- What happens if the same link is prefetched multiple times by more than one scanner (some organizations run several security layers)? The real person's click must still succeed regardless of how many automated prefetches happened first — the fix must not merely tolerate one extra visit, it must make automated visits harmless entirely.
- What happens if the person waits a long time between prefetch and their real click? No different from today's existing link-expiry window — this fix addresses "consumed by prefetch," not "how long a link stays valid."
- What happens if someone forwards their confirmation email to another device and opens it there? Should behave the same as opening it on the original device, since the vulnerability being fixed and its solution are both independent of which device performs the real, explicit action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An automated, non-interactive visit to a sign-up confirmation or password-reset link (one that takes no explicit action beyond loading the page) MUST NOT consume that link's one-time confirmation code.
- **FR-002**: A confirmation code MUST only be consumed when the actual person takes an explicit, deliberate action confirming they intend to proceed.
- **FR-003**: After an automated prefetch of a confirmation link, the real person's subsequent explicit confirmation on that same link MUST still succeed.
- **FR-004**: A link that is genuinely expired, or whose code has already been consumed by a completed confirmation, MUST continue to show a clear error message — this fix must not mask real invalid-link cases.
- **FR-005**: Sign-up confirmation MUST still result in the person being signed into the app once they complete the (now explicit) confirmation step, matching today's outcome.
- **FR-006**: Password-reset confirmation MUST still land the person on the set-new-password screen once they complete the (now explicit) confirmation step, matching today's outcome.
- **FR-007**: The Google sign-in flow MUST NOT be altered by this fix in any way.
- **FR-008**: The explicit confirmation step MUST present clear loading and error states, consistent with the rest of the app's async actions.

### Key Entities

- No new entities — this changes when/how an existing one-time code (already part of Supabase Auth's session-exchange flow) gets consumed, not what data is stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of real, first-time clicks on a sign-up or password-reset link succeed, even when an automated scanner has already visited that link once beforehand.
- **SC-002**: 100% of genuinely expired or already-completed links still show a clear error message — zero silent failures.
- **SC-003**: Zero change in behavior or outcome for the Google sign-in flow.
- **SC-004**: Zero change in the final outcome (signed in / land on set-new-password) for a person who completes confirmation normally, compared to before this fix.

## Assumptions

- The root cause is automated email-security prefetching visiting the link with a plain, non-interactive request (no script execution, no user-driven click) — the fix targets exactly that distinction (interactive vs. non-interactive visit), which is a reasonable and standard way to characterize "was this a bot or a person" for this kind of link.
- This applies to both links currently generated by the app that are delivered via email: the sign-up confirmation link (introduced when open sign-up shipped) and the password-reset link (part of the existing forgot-password flow) — both are equally exposed to the same prefetching risk since both are plain emailed links today.
- No change is needed to which events cause Supabase to send these emails, or to the email content itself beyond the link's destination — only what happens when that destination is visited.
