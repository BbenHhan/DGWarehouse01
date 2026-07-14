# Quickstart: Open Sign-Up with Role-Based Access Control

Prerequisites: dev server running against the real Supabase project (`DATA_SOURCE = "supabase"`), migration for `profiles` applied, and access to at least one throwaway email/Google account to sign up as a "new person."

## Scenario 1 — New sign-up gets safe, read-only access (US1)

1. Sign up with a brand-new email + password on `/login`.
2. Confirm you land signed in with normal view access — every room/work-type/week's photos and every document category are visible.
3. Confirm no "add," "edit," "delete," or "delete week" control appears anywhere.
4. Repeat with a Google account that has never signed into this app before — same result.

**Expected**: New accounts default to `viewer`; view-only, no mutation UI anywhere (FR-001–FR-005, SC-001).

## Scenario 2 — Admin promotes a viewer to editor (US2)

1. Sign in as the admin account (the pre-existing account holder).
2. Go to the account-management screen and change the account from Scenario 1 to `editor`.
3. Sign in as that account again (or refresh if already signed in).
4. Confirm upload/edit/delete controls now appear and work — upload a photo, edit its note, delete it.

**Expected**: Role change takes effect on the very next action; editor capability matches pre-feature single-account behavior exactly (FR-006, FR-007, SC-003).

## Scenario 3 — Server-side rejection regardless of UI (US3)

1. While signed in as a `viewer` account, attempt to call the upload/delete/edit Server Action directly (e.g. via the browser's dev tools invoking the action, bypassing the hidden button).
2. Confirm the action is rejected with a clear error and no data changes.
3. While signed in as an `editor` account, attempt to call the role-change Server Action directly.
4. Confirm that's rejected too.

**Expected**: Both rejections happen even though no UI ever exposed the control (FR-006, FR-008, FR-011, SC-002).

## Scenario 4 — Existing account is admin from day one (US4)

1. After the migration for this feature has been applied, sign in as the pre-existing account holder.
2. Confirm the account-management screen is reachable and shows this account's role as `admin`, with no setup action taken.

**Expected**: Zero manual configuration needed (FR-013, SC-004).

## Scenario 5 — Can't demote the last admin

1. As the sole admin, open the account-management screen.
2. Attempt to change your own role away from `admin`.

**Expected**: The system rejects the change with a clear message, and the account remains `admin` (FR-012, SC-005).

## Scenario 6 — Existing single-account flows still work

1. Confirm sign-in (email/password and Google), the account menu, and sign-out all behave exactly as they did before this feature (Features 004/006), for every role.

**Expected**: Zero regression in already-shipped auth features.
