# Quickstart: Role Requests & User Search

Prerequisites: dev server running against the real Supabase project, migration for `role_requests`/`profiles.full_name` applied, at least one `viewer` account and the `admin` account from Feature 007.

## Scenario 1 — Viewer requests editor access

1. Sign in as a `viewer` account.
2. From the account menu, submit a request for editor access.
3. Confirm the account menu now shows the request as pending (not the submit control again) and the account's role is still `viewer`.

**Expected**: Request recorded, role unchanged (FR-001/FR-002, SC-001).

## Scenario 2 — Can't submit a duplicate

1. As the same viewer from Scenario 1 (still pending), try to submit another request.

**Expected**: No second request is created; a clear message explains one is already pending (FR-003, SC-002).

## Scenario 3 — Admin approves

1. Sign in as `admin`, open `/admin/users`.
2. Confirm the pending request from Scenario 1 is listed with the requester's email.
3. Approve it.

**Expected**: Request disappears from the pending list; the requester's role is now `editor` (FR-005/FR-006, SC-003). Sign back in as that account and confirm editor capability (upload/edit/delete) works.

## Scenario 4 — Admin denies, requester can try again

1. Have a second `viewer` submit a request.
2. As admin, deny it.
3. Sign back in as that viewer and submit a new request.

**Expected**: Denial removes it from the pending list with no role change; a new request from the same account is accepted afterward (FR-007/FR-009).

## Scenario 5 — Server-side rejection

1. As a non-admin (viewer or the editor from Scenario 3), attempt to call the approve/deny action directly (bypassing the UI).
2. As an editor or admin, attempt to call the request-submission action directly.

**Expected**: Both rejected server-side (FR-004/FR-008, SC-004).

## Scenario 6 — Search

1. On `/admin/users` with several accounts present, type part of an email into the search field.
2. Clear it and type part of a Google-linked account's display name instead.
3. Type something matching nothing.

**Expected**: List filters correctly for both partial email and partial name; a "no matches" state appears for the non-matching search; clearing the field restores the full list (FR-010/FR-011, SC-005).

## Scenario 7 — No regression

1. Confirm sign-in, sign-up, the existing role-change control, and last-admin protection (Feature 007) all still work unchanged.
