# Feature Specification: Role Requests & User Search

**Feature Branch**: `008-role-requests-search`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Viewer view should not show add/edit/delete buttons (already true). Admin gets an in-app list of pending role requests on the account-management screen, with search by email or name. Viewers get a button to request editor access, which lands in the admin's in-app 'inbox' for approval."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A viewer requests editor access (Priority: P1)

A viewer who wants to start contributing (uploading/editing/deleting photos and documents) can ask for that access from within the app, without needing to contact the admin outside the system.

**Why this priority**: This is the entry point for the whole feature — without it, there's nothing for an admin to review.

**Independent Test**: As a viewer, submit a request for editor access and confirm it's recorded and the requester's own role hasn't changed.

**Acceptance Scenarios**:

1. **Given** a viewer with no pending request, **When** they submit a request for editor access, **Then** the request is recorded and their role remains `viewer` until an admin acts on it.
2. **Given** a viewer who already has a pending request, **When** they look for a way to submit another one, **Then** they can't — the system makes clear one is already pending.
3. **Given** an account that already holds `editor` or `admin`, **When** they attempt to submit a request for editor access (e.g. by bypassing the UI), **Then** the system rejects it, since they already have that capability or more.

---

### User Story 2 - Admin reviews and approves a pending request (Priority: P1)

The admin sees who's asking for editor access and can grant it in one action, without leaving the app.

**Why this priority**: This is what makes User Story 1 actually useful — a request that's never seen or actioned delivers no value.

**Independent Test**: As admin, view the pending requests, approve one, and confirm the requester now has editor access.

**Acceptance Scenarios**:

1. **Given** one or more pending requests, **When** the admin opens the account-management screen, **Then** they see each pending request and which account submitted it.
2. **Given** a pending request, **When** the admin approves it, **Then** the requester's role becomes `editor`, and the request no longer appears in the pending list.
3. **Given** a pending request, **When** the admin denies it, **Then** the request no longer appears in the pending list and the requester's role is unchanged.
4. **Given** a request was denied, **When** the requester later wants to try again, **Then** they can submit a new request (a denial doesn't permanently block future requests).

---

### User Story 3 - Approve/deny is enforced server-side (Priority: P1)

Even if someone finds a way to trigger an approve/deny action without going through the admin screen, the system still refuses it unless they're actually an admin.

**Why this priority**: Matches the same defense-in-depth requirement Feature 007 established for role changes generally — a hidden button is not real security.

**Independent Test**: As a non-admin, attempt to approve or deny a request directly (bypassing the UI) and confirm rejection.

**Acceptance Scenarios**:

1. **Given** a non-admin account (viewer or editor), **When** an approve or deny action is attempted for any request, regardless of whether the triggering UI was ever shown to them, **Then** the system rejects the action and no request status or role changes.

---

### User Story 4 - Admin searches the account list (Priority: P2)

As the number of registered accounts grows, the admin can quickly find a specific one by typing part of their email or name instead of scrolling the full list.

**Why this priority**: A quality-of-life improvement for the account-management screen that becomes more valuable as sign-ups accumulate — independent of the request/approval flow itself.

**Independent Test**: On the account-management screen, type a partial email or name and confirm the list filters to matching accounts only.

**Acceptance Scenarios**:

1. **Given** multiple accounts exist, **When** the admin types part of an email or name into a search field, **Then** only matching accounts remain visible.
2. **Given** a search that matches nothing, **When** the admin views the result, **Then** they see a clear "no matches" message, not a blank or confusing list.
3. **Given** the admin clears the search field, **When** the list re-renders, **Then** all accounts are visible again.

---

### Edge Cases

- What happens when an admin approves a request for an account whose role already changed by other means (e.g. another admin already promoted them) while the request sat pending? Approving still succeeds — it's a harmless no-op if they're already `editor` or higher, not an error.
- What happens if two admins act on the same pending request at nearly the same time (one approves, one denies)? Whichever action completes first resolves the request; the second admin's action on the now-already-resolved request is rejected with a clear message rather than double-processed.
- What happens to a pending request if the requester's account is somehow no longer a viewer by the time an admin reviews it (see above)? Covered by the no-op approval behavior — no separate error state needed.
- What happens when the search field contains no matches for a large account list? A clear empty state, not silence (see User Story 4, Scenario 2).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A viewer MUST be able to submit a request for editor access from within the app.
- **FR-002**: Submitting a request MUST create a pending record and MUST NOT change the requester's role by itself.
- **FR-003**: The system MUST prevent an account from submitting a new request while it already has one pending.
- **FR-004**: The system MUST reject a request submission from an account that isn't a `viewer` (an `editor` or `admin` already has that capability or more), enforced independently of the UI.
- **FR-005**: An admin MUST be able to see every pending request in-app, including which account submitted each one.
- **FR-006**: An admin MUST be able to approve a pending request, which changes the requester's role to `editor` and removes it from the pending list.
- **FR-007**: An admin MUST be able to deny a pending request, which removes it from the pending list without changing the requester's role.
- **FR-008**: The system MUST reject any approve/deny action from a non-admin account, enforced independently of whether the corresponding UI was ever shown to them.
- **FR-009**: A denied request MUST NOT prevent the same account from submitting a new request later.
- **FR-010**: The admin account-management screen MUST support filtering the account list by email or name.
- **FR-011**: A search with no matching accounts MUST show a clear "no results" state, not a blank or silent list.
- **FR-012**: Every request submission, approval, denial, and search interaction MUST present explicit loading/error/empty states — no silent failures.

### Key Entities

- **Role Request**: A viewer's ask to become an `editor`. Has a requester (the account that submitted it), a status (pending, approved, or denied), when it was submitted, and — once resolved — when and by whom (which admin) it was resolved. An account can have at most one *pending* request at a time, but may have multiple resolved (approved/denied) requests over time as a history of past asks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer can submit a request for editor access in a single action, in under 15 seconds.
- **SC-002**: 100% of attempts to submit a duplicate request while one is already pending are prevented, with a clear message explaining why.
- **SC-003**: An admin can take a requester from "pending request" to "has editor access" in a single approve action, with no additional steps.
- **SC-004**: 100% of approve/deny attempts by non-admin accounts are rejected, whether attempted through the visible UI or by bypassing it.
- **SC-005**: An admin can locate any specific account among all registered accounts via search in under 10 seconds, regardless of how many accounts exist.

## Assumptions

- The viewer-facing "request editor access" control lives in the same place the existing admin-only "Manage users" link already lives for admins (the account menu) — a reasonable default consistent with how role-based navigation already works in this app (Feature 007), not explicitly dictated by the request.
- Only "editor" is ever requestable through this mechanism — there is no path to request "admin" access this way; admin status can only be granted through the existing admin-only role-change control (Feature 007).
- Search matches partial, case-insensitive text against an account's email and display name (where available) — the standard behavior expected of an admin search box.
- Pending requests are shown as a section on the existing `/admin/users` screen rather than a separate page, consistent with the user's own framing ("หน้านั้นควรจะขึ้นทุก account ... admin สามารถ search") describing one screen that does both account management and request review.
- A resolved (approved/denied) request's history is retained rather than deleted, so there's a record of past decisions — no requirement was given to purge it, and keeping it is the lower-risk default.
