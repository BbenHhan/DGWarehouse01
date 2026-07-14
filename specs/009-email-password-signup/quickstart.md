# Quickstart: Email/Password Sign-Up

Prerequisites: dev server running against the real Supabase project.

## Scenario 1 — New sign-up creates a working, viewer-role account

1. On `/login`, switch to "สมัครสมาชิก" (sign up).
2. Enter a brand-new email and a password meeting the minimum length.
3. Submit.
4. Depending on the project's email-confirmation setting: either you land signed in on `/photos`, or you see a "check your email" message.

**Expected**: A real account now exists for that email with `role = 'viewer'` (FR-002/FR-003/FR-005/FR-006, SC-001/SC-002).

## Scenario 2 — Weak password rejected client-side

1. On the sign-up form, enter a password under 8 characters.
2. Submit.

**Expected**: Rejected with a clear message before any account-creation attempt (FR-004, SC-003).

## Scenario 3 — Existing flows unaffected

1. Confirm password sign-in, "ลืมรหัสผ่าน?", and "เข้าสู่ระบบด้วย Google" all still work exactly as before, on the same page.

**Expected**: Zero regressions (FR-008, SC-004).

## Scenario 4 — No account-existence leakage

1. Attempt sign-up with an email that already has an account, and separately with a brand-new one.

**Expected**: No response distinguishes the two cases (FR-007, SC-005).
