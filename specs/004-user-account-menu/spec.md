# Feature Specification: User Account Menu & Sign Out

**Feature Branch**: `004-user-account-menu`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Feature: User Account Menu & Sign Out. Add a user avatar to the app's header/top bar, with a dropdown menu that lets the user sign out. Make the authentication system good and comprehensive, covering realistic edge cases of a sign-in/sign-out UX, not just a bare-minimum button, and test it end-to-end. Single-user app — no multi-user account switching, no user list. The account menu should only appear when there's a real authenticated session; the app also has an interim 'auth disabled' dev mode with no session at all, and the header must not break or show a broken/empty account menu in that mode. Sign out must actually clear the Supabase session and land the user back on the login page. The avatar should show something meaningful even with no profile picture (initials or icon fallback). The header is shared across every page in the authenticated app shell."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who is signed in (Priority: P1)

As the site's single user, I want to see a small account indicator (avatar) in the header on every page, so I have a persistent, at-a-glance confirmation that I'm signed in and to whom, without having to go looking for it.

**Why this priority**: This is the visual anchor the rest of the feature (the dropdown, sign out) hangs off of — without it there's nothing to click.

**Independent Test**: Sign in, land on any page in the app, confirm an avatar is visible in the header without scrolling or navigating anywhere extra.

**Acceptance Scenarios**:

1. **Given** I am signed in, **When** I view any page in the app, **Then** an avatar representing my account is visible in the header.
2. **Given** my account has a profile picture (e.g. from Google sign-in), **When** the avatar renders, **Then** it shows that picture.
3. **Given** my account has no profile picture (e.g. signed in via magic link, or a Google account with no photo), **When** the avatar renders, **Then** it shows a clear fallback (e.g. an icon or my initials) instead of a broken image.

---

### User Story 2 - Sign out (Priority: P1)

As the user, I want to click my avatar and choose "sign out" from a dropdown, so I can end my session deliberately (e.g. before handing the device to someone else, or when troubleshooting login issues).

**Why this priority**: This is the actual capability being added — the app currently has no way to sign out at all once logged in.

**Independent Test**: Sign in, click the avatar, click "sign out", confirm I land back on the login page and that reloading any app page redirects me to login again (session is genuinely gone, not just hidden).

**Acceptance Scenarios**:

1. **Given** I am signed in, **When** I click the avatar, **Then** a dropdown opens showing at least my account's identifying info (e.g. email) and a "sign out" option.
2. **Given** the dropdown is open, **When** I click "sign out", **Then** my session is ended and I am taken to the login page.
3. **Given** I have just signed out, **When** I try to visit any page in the app directly (e.g. via back button or a bookmarked URL), **Then** I am redirected to the login page, not shown stale content.
4. **Given** I am on any page in the app (not just the home page), **When** I click the avatar and sign out, **Then** the same behavior occurs regardless of which page I started from.

---

### User Story 3 - Account menu behaves correctly with no session (Priority: P2)

As the person developing/operating this app, when authentication is temporarily disabled (an interim mode used before a live Supabase project existed) or a session otherwise doesn't exist, I want the header to keep working normally without showing a broken or empty account menu, so this mode remains usable for local development.

**Why this priority**: This protects an existing, still-useful dev mode from regressing; it's a safety/robustness requirement rather than new user-facing value.

**Independent Test**: Run the app with authentication disabled, confirm the header renders normally with no avatar/account menu present and no errors.

**Acceptance Scenarios**:

1. **Given** authentication is disabled (no session exists), **When** any page renders, **Then** the header shows no avatar or account menu, and no error occurs.
2. **Given** authentication is enabled but, unexpectedly, no session is available, **When** the header renders, **Then** it degrades the same way (no broken menu) rather than crashing the page.

---

### Edge Cases

- What happens if sign out is clicked but the network request to end the session fails? The user sees a clear error and remains signed in (no false "you're signed out" state while a session cookie still silently exists).
- What happens while the sign-out request is in progress? The dropdown/button shows a busy state so a second click doesn't fire a duplicate sign-out attempt.
- What happens if the user's account has an email but no display name? The dropdown falls back to showing the email, since that's the only identifying info guaranteed to exist for both magic-link and Google sign-in.
- What happens on very small (mobile) screens? The avatar and dropdown remain usable and don't overlap or crowd out the existing header content (logo, stat chips).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST display an avatar representing the signed-in user on every page of the authenticated app, whenever a real session exists.
- **FR-002**: The avatar MUST show the account's profile picture when one is available, and a clear non-broken fallback (icon or initials derived from the account's email/name) when it is not.
- **FR-003**: Clicking the avatar MUST open a dropdown menu showing the account's identifying information (at minimum, its email) and a sign-out control.
- **FR-004**: Choosing sign out MUST end the user's actual authenticated session (not just hide the UI), such that subsequent requests to any app page are treated as unauthenticated.
- **FR-005**: After signing out, the user MUST be taken to the login page.
- **FR-006**: The account menu MUST behave identically no matter which page it is triggered from, since the header is shared across the whole authenticated app shell.
- **FR-007**: When no authenticated session exists (including the interim auth-disabled dev mode), the header MUST render without any avatar or account menu and MUST NOT error.
- **FR-008**: While a sign-out request is in progress, the control MUST indicate a busy/pending state and MUST NOT allow a second sign-out attempt to be triggered concurrently.
- **FR-009**: If sign out fails, the user MUST see a clear error message and MUST remain in the signed-in state (no misleading success indication).

### Key Entities

- **Session**: The signed-in state of the single user, already established by the existing Supabase Auth integration (magic link / Google). This feature reads whether a session exists and its user's display info (email, name, avatar URL), and adds the ability to end it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can identify that they're logged in within 1 second of looking at any page (no navigation required).
- **SC-002**: A user can go from "signed in, viewing any page" to "fully signed out, viewing the login page" in 2 clicks (avatar, then sign out).
- **SC-003**: 100% of sign-out attempts either fully succeed (session ended, redirected to login) or fully fail with a visible error — no case leaves the user in an ambiguous or partially-signed-out state.
- **SC-004**: The auth-disabled dev mode continues to work with 0 regressions (no new errors, no broken UI) after this feature ships.

## Assumptions

- **Single account, no switching**: Since this is a single-user app (Constitution VII), the dropdown never needs an account-switcher, invite flow, or multi-user list — just identity display + sign out.
- **Identifying info shown**: Email is the guaranteed-available field (works for both magic-link and Google sign-in); display name/picture are shown opportunistically when Google sign-in provides them, but are not required.
- **Fallback avatar content**: Initials derived from the email's local part (before the `@`) or a generic person icon when even that can't be reasonably derived — either is acceptable; the requirement is "not a broken image," not a specific visual design.
- **No "remember me" / session-length changes**: This feature does not change how long a session lasts or add session-management options beyond sign out — that's out of scope.
- **Placement**: The avatar lives in the existing header (`components/Header.tsx`), which already appears on every authenticated page via `app/(app)/layout.tsx` — no new layout structure is introduced.
