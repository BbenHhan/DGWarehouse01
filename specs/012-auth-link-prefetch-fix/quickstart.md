# Quickstart: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

Prerequisites: dev server running against the real Supabase project, custom SMTP configured (or Supabase's default email works too).

## Scenario 1 — Simulated prefetch doesn't break the real click (sign-up)

1. Sign up with a new email/password on `/login`.
2. Open the confirmation email; copy the link (don't click it yet).
3. Simulate a scanner "prefetch": fetch that URL with a plain, non-interactive HTTP request (e.g. `curl` or opening it in a way that doesn't click the confirm button) — confirm the page loads but shows the "ยืนยัน" button, not an immediate redirect.
4. Now actually open the link normally and click the confirm button.

**Expected**: Step 4 succeeds — signed in and landed on `/photos` (FR-001–FR-003/FR-005, SC-001).

## Scenario 2 — Same for password reset

1. Request a password-reset link from `/login`.
2. Repeat the prefetch simulation (step 3 above) against the reset link.
3. Open the link normally and click confirm.

**Expected**: Lands on `/reset-password` able to set a new password (FR-006, SC-001).

## Scenario 3 — Genuinely dead link still shows a clear error

1. Successfully complete Scenario 1 or 2 once (link now fully consumed).
2. Open the exact same email link again and click confirm.

**Expected**: Clear "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว" message, with a way back to `/login` (FR-004, SC-002).

## Scenario 4 — Google sign-in unaffected

1. Sign in with Google.

**Expected**: Identical to before this feature — no new step, no change (FR-007, SC-003).

## Scenario 5 — Normal case (no prefetch at all) still works exactly as before

1. Sign up (or request a reset), open the email, click the link, click confirm — with no simulated prefetch in between.

**Expected**: Same outcome as Scenario 1/2's step 4 (SC-004) — the only change visible to a normal user is one extra button click.
