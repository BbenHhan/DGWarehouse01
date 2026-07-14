# Quickstart: Email/Password Authentication

Prerequisites: dev server running (`npm run dev`), `.env.local` pointed at the real Supabase project, and access to the account holder's real inbox (Supabase sends real emails via its default SMTP for this project).

## Scenario 1 — Set a password for the first time

1. Go to `/login`.
2. Enter the account holder's email and click "ลืมรหัสผ่าน?" (forgot password).
3. Confirm the page shows a generic "check your email" confirmation.
4. Open the email, click the link.
5. Confirm you land on `/reset-password` already signed into a recovery session (no separate login step).
6. Enter a new password (≥ 8 characters) and submit.
7. Confirm you're redirected to `/photos` signed in — no leftover recovery banner or state.

**Expected**: Password is now attached to the account; SC-003 (fully self-service) holds.

## Scenario 2 — Sign in with the password just set

1. Sign out via the account menu.
2. Go to `/login`, enter the email + the password from Scenario 1.
3. Submit.

**Expected**: Signed in within a few seconds (SC-001), landing on `/photos` with full normal access (FR-010) — same as a Google OAuth sign-in would grant.

## Scenario 3 — Wrong password / unknown email

1. On `/login`, enter the correct email with a deliberately wrong password. Submit.
2. Confirm a clear, generic error appears (not a stack trace, not silence) and the form stays usable.
3. Repeat with an email that has no account at all.

**Expected**: Both cases show the same generic "invalid email or password"-style message (SC-005 — never reveals which case it was).

## Scenario 4 — Expired or already-used reset link

1. Request a reset link (Scenario 1, steps 1–3).
2. Use the link once to successfully set a password (Scenario 1, steps 4–7).
3. Go back and click the same email link again.

**Expected**: A clear message telling the account holder to request a new link; no password is changed by the stale link.

## Scenario 5 — Google OAuth is unaffected

1. On `/login`, click "เข้าสู่ระบบด้วย Google".
2. Complete the Google sign-in flow as before.

**Expected**: Identical behavior to before this feature shipped — no regression (SC-004).

## Scenario 6 — Magic link is gone

1. Inspect `/login`.

**Expected**: No email-only "send magic link" control remains — only email+password fields, the "ลืมรหัสผ่าน?" link, and the Google button (FR-009).
