# Quickstart: Password Visibility Toggle

Prerequisites: dev server running.

## Scenario 1 — Toggle works and preserves the value (sign-in)

1. On `/login`, type a password into the sign-in password field.
2. Click the reveal icon.
3. Confirm the typed text is now visible in plain form.
4. Click it again; confirm it's masked again.
5. Submit the form (with a real password) and confirm sign-in behaves exactly as before this feature.

**Expected**: Toggle works; value and submission are unaffected (FR-001/FR-002/FR-006, SC-001).

## Scenario 2 — Consistency across all three fields

1. Switch to "สมัครสมาชิก" (sign up) — confirm its password field has the identical control.
2. Trigger a password-reset link and land on `/reset-password` — confirm its password field has the identical control.

**Expected**: Same control, same behavior, on all three fields (FR-003/SC-002).

## Scenario 3 — Keyboard operable

1. Tab to a password field's reveal control (not click it).
2. Press Enter or Space.

**Expected**: Toggles the same as a click (FR-005).

## Scenario 4 — No regression

1. Confirm sign-in, sign-up, and password-reset all still submit and validate correctly after this feature.

**Expected**: Zero behavior change beyond the visual toggle (SC-003).
