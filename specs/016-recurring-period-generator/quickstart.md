# Quickstart: Recurring Time-Period Generator for Week Selection

Prerequisites: dev server running, admin account for setup steps, editor account for usage steps.

## Scenario 1 — No cadence configured yet: free-text fallback (Edge Case, FR-009)

1. Before configuring anything, open `/upload` or a room/work-type page's "+ สัปดาห์ใหม่".

**Expected**: Two date fields to type into, exactly like today — no error, no empty picker.

## Scenario 2 — Admin configures the sitewide cadence (US2)

1. Sign in as admin, go to the new cadence settings screen.
2. Set interval 7, unit "day", origin date 2026-06-01. Save.

**Expected**: Saved without a page reload requirement to take effect; confirmed by immediately checking Scenario 3.

## Scenario 3 — Picker shows generated periods, most recent includes today (US1)

1. As editor, open the room/work-type page's add-week control.

**Expected**: A list of periods (01-07 Jun, 08-14 Jun, ...), the last one containing today's date (2026-07-17 → the period covering that date), not stopping short of it and not showing periods past it.

## Scenario 4 — Picking an unused period creates a week normally (US1)

1. Pick a period with no existing week for this room + work type. Confirm.

**Expected**: A week is created with exactly that period's dates — same outcome as typing those dates today.

## Scenario 5 — Picking a period that exactly matches an existing week reuses it (US1)

1. Pick a period that already has a week for this room + work type (e.g. repeat Scenario 4's exact period).

**Expected**: No duplicate created; taken to/using the existing week, no error shown.

## Scenario 6 — Work-type override (US3)

1. As admin, set a different cadence (e.g. interval 1, unit "month") specifically for one work type.
2. As editor, open the add-week control for that work type, in any room.

**Expected**: The picker shows monthly periods, not the sitewide 7-day ones.

3. Open the add-week control for a *different* work type.

**Expected**: Still shows the sitewide 7-day periods — the override didn't leak.

4. Remove the override (admin). Re-open the picker for that work type.

**Expected**: Back to the sitewide 7-day periods.

## Scenario 7 — Genuine collision names the conflicting week (US4)

1. Set up a scenario where a generated period overlaps (but doesn't exactly match) one of the 121 pre-existing historical weeks for some room + work type.
2. Attempt to create it.

**Expected**: Rejected with a message naming that specific existing week's actual date range, not a generic "already exists" message.

## Scenario 8 — Historical weeks are untouched (SC-005)

1. Before and after configuring a cadence and creating several new weeks through it, query `select count(*) from weeks where created_at < '2026-07-15'`.

**Expected**: Count stays at 121 throughout — nothing about the historical import is modified.

## Scenario 9 — Bulk-upload page uses the sitewide cadence only (research.md Decision 4)

1. Set a work-type override (as in Scenario 6) for "doors".
2. Open `/upload`'s date-range step.

**Expected**: Shows the sitewide cadence's periods, not the "doors" override — the upload page's single upfront date step never reflects a work-type-specific override, since no work type is chosen yet at that point.
