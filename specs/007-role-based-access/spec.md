# Feature Specification: Open Sign-Up with Role-Based Access Control

**Feature Branch**: `007-role-based-access`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Open sign-up so anyone can create an account, with three roles — viewer (default, read-only), editor (can add/edit/delete photos and documents), and admin (everything editor can do, plus can change any account's role via a management screen). The existing account holder becomes admin automatically."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anyone can sign up and safely view progress (Priority: P1)

A new person — someone the account holder wants to give visibility to, e.g. a client, contractor, or teammate — creates their own account (email/password or Google) and can immediately see all photos and documents, without being able to change anything.

**Why this priority**: This is the core value of "open sign-up" — letting more people see progress — and it has to be safe by default before anything else in this feature matters.

**Independent Test**: Sign up with a brand-new email (or a Google account that has never signed in before), confirm the new account can view every room/work-type/week's photos and documents, and confirm no add/edit/delete control is visible or usable anywhere.

**Acceptance Scenarios**:

1. **Given** someone with no existing account, **When** they sign up with a new email and password, **Then** an account is created for them with read-only access and they can view all photos and documents.
2. **Given** someone signs in with a Google account that has never been used with this app before, **When** the sign-in completes, **Then** an account is created for them with the same read-only access as an email/password sign-up.
3. **Given** a newly signed-up account, **When** they browse any room, work type, or document category, **Then** they see the content but no "add," "edit," "delete," or "delete week" controls anywhere in the interface.

---

### User Story 2 - Admin promotes a trusted person so they can contribute (Priority: P1)

The admin wants a specific person (e.g. a site supervisor) to be able to add and manage photos/documents, not just view them, so the admin grants that account editor access.

**Why this priority**: Without a way to grant more than view access, open sign-up only ever produces read-only accounts — the whole point of promoting trusted contributors would be unreachable.

**Independent Test**: As an admin, change a viewer account to editor, then sign in as that account and confirm add/edit/delete controls now appear and work.

**Acceptance Scenarios**:

1. **Given** an admin viewing the account-management screen, **When** they change a viewer's role to editor, **Then** that account gains the ability to add, edit, and delete photos and documents on their next action.
2. **Given** an account was just promoted to editor, **When** that person uploads a photo, edits a caption, or deletes a document, **Then** the action succeeds exactly as it would have for the original single account holder before this feature.
3. **Given** an editor account, **When** they look for a way to view or change another account's role, **Then** no such control is available to them.

---

### User Story 3 - Mutations are rejected server-side regardless of the UI (Priority: P1)

Even if someone finds a way to trigger an add/edit/delete action without going through the normal UI (e.g. a stale page, a replayed request), the system still refuses it unless their account's role actually allows it.

**Why this priority**: Hiding buttons in the UI is not real security — without a server-side check, a viewer account could still mutate data by other means, which would defeat the entire purpose of a safe-by-default open sign-up.

**Independent Test**: As a viewer account, attempt to trigger an add/edit/delete action directly (bypassing the hidden UI), and confirm the system rejects it and makes no change to the data.

**Acceptance Scenarios**:

1. **Given** a viewer account, **When** an add, edit, or delete action is attempted for photos, documents, or weeks — regardless of whether the triggering UI control is visible — **Then** the system rejects the action and no data changes.
2. **Given** an editor account, **When** they attempt to change another account's role directly, **Then** the system rejects the action.

---

### User Story 4 - The existing account is admin from day one (Priority: P2)

The account holder who has been using the app throughout this project doesn't want to do anything manually to become admin once this feature ships — their account should already have full control, including the ability to manage everyone else's roles.

**Why this priority**: Without at least one working admin the moment this feature goes live, nobody could promote anyone or manage the new account-management screen at all.

**Independent Test**: After this feature ships, sign in with the existing account and confirm the account-management screen is available and shows that account as admin, with no setup step performed.

**Acceptance Scenarios**:

1. **Given** this feature has just shipped, **When** the existing account holder signs in, **Then** they already have admin access with no manual configuration needed.

---

### Edge Cases

- What happens when an admin is the only remaining admin and tries to change their own role away from admin? The system prevents it, so the account-management screen never becomes unreachable to everyone.
- What happens when someone signs up with an email that already has an account? The system handles it the same way Feature 006's sign-in already does (existing account, no duplicate created).
- What happens when a role change happens while the affected person is actively using the app? Their new permissions (or restrictions) take effect on their next action; nothing forces an immediate session interruption.
- What happens if two admins change the same account's role at nearly the same time? The last change applied wins — no special conflict handling needed for this scale of use.
- What happens when a viewer's account is later promoted, then demoted back to viewer? Their access reverts to view-only immediately on their next action, same as any other role change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let anyone create a new account via email/password sign-up, with no invitation, allowlist, or approval step required.
- **FR-002**: The system MUST let anyone sign in with a Google account, creating a new account automatically the first time a given Google account is used, exactly as it does today.
- **FR-003**: Every newly created account (whether via email/password sign-up or a first-time Google sign-in) MUST be assigned the viewer role, with no way for the person signing up to choose a different role for themselves.
- **FR-004**: Viewer accounts MUST be able to sign in and view all photos and documents across every room, work type, and document category.
- **FR-005**: Viewer accounts MUST NOT see add, edit, delete, or delete-week controls anywhere in the interface.
- **FR-006**: The system MUST reject any add, edit, or delete action for photos, documents, or weeks unless the account performing it holds the editor or admin role — enforced independently of whether the corresponding UI control was ever shown.
- **FR-007**: Editor accounts MUST retain full ability to add, edit, and delete photos and documents, matching the capability that existed before this feature for the single account holder.
- **FR-008**: Editor accounts MUST NOT be able to view or change any account's role.
- **FR-009**: The system MUST provide an admin-only screen listing every account with identifying information (at minimum, email) and its current role.
- **FR-010**: The admin-only screen MUST let an admin change any account's role to viewer, editor, or admin.
- **FR-011**: The system MUST reject any role-change action unless the account performing it holds the admin role — enforced independently of the admin screen's own visibility.
- **FR-012**: The system MUST prevent an action that would leave zero accounts holding the admin role.
- **FR-013**: The account holder's existing account (the one used throughout this project prior to this feature) MUST already hold the admin role the moment this feature ships, requiring no manual setup step.
- **FR-014**: Every sign-up, role-change, and access-denied outcome MUST be communicated to the person taking the action with an explicit result — no silent failures.

### Key Entities

- **Account**: Represents a person who can sign in. Has an identity (email, and optionally a display name/photo from Google), and exactly one role (viewer, editor, or admin) at any given time. Every account that can sign in has exactly one of these roles — there is no "no role" state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new person can sign up and begin viewing photos/documents in under a minute, with no action required from an admin.
- **SC-002**: 100% of add/edit/delete attempts by an account without editor or admin role are rejected, whether attempted through the visible UI or by bypassing it.
- **SC-003**: An admin can grant a viewer full contribution ability (editor role) in a single action, and that account can add/edit/delete on its very next attempt.
- **SC-004**: The pre-existing account holder has complete, uninterrupted admin-equivalent capability immediately after this feature ships, with zero manual setup.
- **SC-005**: At no point can the system reach a state where no account holds the admin role.

## Assumptions

- Google OAuth sign-in already creates a new Supabase Auth account on first use (established in this project); this feature only adds the role assignment on top of that existing behavior, not a new sign-in mechanism.
- An admin may change their own role, including demoting themselves, as long as at least one other admin remains afterward (FR-012's protection is about the *last* admin, not self-changes in general).
- There is no email verification or approval step beyond what Supabase Auth already does by default for sign-up — this feature does not add a moderation queue.
- "Identifying information" on the admin screen means whatever Supabase Auth already provides per account (email, and Google-provided name/photo when available) — no new profile fields are being collected.
- Existing single-account behavior (Feature 006's sign-in, Feature 004's account menu) continues to work unchanged for every role; this feature only adds the role dimension on top.
