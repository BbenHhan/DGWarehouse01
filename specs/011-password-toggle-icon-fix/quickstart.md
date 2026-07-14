# Quickstart: Password Toggle Icon Correction

Prerequisites: dev server running.

## Scenario 1 — Icon matches state on any password field

1. On `/login`, note the icon on the (masked, default) sign-in password field — confirm it's the crossed-eye.
2. Click it to reveal the password — confirm the icon changes to the open-eye.
3. Click again to mask — confirm it changes back to the crossed-eye.

**Expected**: Icon always matches actual display state (FR-001/FR-002, SC-001/SC-002).

## Scenario 2 — Applies everywhere at once

1. Repeat Scenario 1 on the sign-up field and the reset-password field.

**Expected**: Identical corrected behavior on all three, since all three share the one component (FR-003).

## Scenario 3 — No other regression

1. Confirm toggling still preserves the typed value, the accessible label still states the correct next action, and sign-in/sign-up/reset submission are unaffected.

**Expected**: Zero regressions beyond the icon mapping (FR-004, SC-003).
