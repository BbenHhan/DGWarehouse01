# Quickstart: Don't Show Expired-Link Error When Session Already Established

Prerequisites: dev server running against the real Supabase project.

## Scenario 1 — Double-click no longer shows a false error

1. Get to `/auth/confirm` with a valid, unused code (e.g. via a fresh sign-up or password-reset email).
2. Rapidly double-click the confirm button (or trigger the handler twice in close succession).
3. Observe the result.

**Expected**: Taken into the app (signed in / landed on `/reset-password`) — not shown the expired-link error, even though one of the two exchange attempts necessarily failed (FR-001/FR-002, SC-001).

## Scenario 2 — Genuinely dead link still shows the clear error

1. Visit `/auth/confirm` with an invalid/already-fully-consumed code and no existing session.
2. Click confirm.

**Expected**: The clear "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว" message still appears — unchanged from before this fix (FR-003, SC-002).

## Scenario 3 — Normal, single confirmation is unaffected

1. Sign up (or request a reset), open the email, click the link once, click confirm once (no duplication).

**Expected**: Same outcome as before Feature 012/013 — signed in / landed on set-new-password (SC-003).
