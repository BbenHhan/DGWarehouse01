# Quickstart: Verify Delete Week

## Prerequisites

- `DATA_SOURCE = "local"` in `lib/data-config.ts` (current default).
- Dev server running.

## Scenario 1: Delete an empty week (US1)

1. Navigate to any room + work type, e.g. `/photos/hong-raek/firewalls`.
2. Click "+ สัปดาห์ใหม่" and create a week with any valid date range. Do not upload
   anything into it.
3. On that week's card, click the delete control. **Expect**: a confirmation dialog
   appears, generic "cannot be undone" wording (no file-count warning, since it has
   0 files).
4. Click cancel. **Expect**: the week still exists, nothing changed.
5. Click the delete control again, confirm this time. **Expect**: the week
   disappears from the timeline; the header's total week count decreases by 1.

## Scenario 2: Delete a week that has files (US2)

1. Create a week, upload at least one photo/PDF/video into it.
2. Click that week's delete control. **Expect**: the confirmation dialog explicitly
   states the file count that will also be deleted (e.g. "สัปดาห์นี้มี 1 ไฟล์ —
   ไฟล์ทั้งหมดจะถูกลบไปด้วย").
3. Confirm. **Expect**: the week is gone, the header's total photo count decreases
   by the number of files that were in it, and the file is no longer reachable at
   its old URL (no orphaned file left behind — check `.local-data/db.json` has no
   photo row referencing the deleted week, and its file under `.local-data/files/`
   is gone from disk).

## Scenario 3: Deleting the currently-viewed week doesn't break the page (US3)

1. With two or more weeks present in a room/work-type, select (view) one of them
   specifically (click its card so it becomes the active/highlighted one).
2. Delete that same, currently-selected week.
3. **Expect**: the page automatically shows a different remaining week afterward
   (no blank screen, no error) — matching the existing "most recent remaining
   week" default-selection rule from 002-week-date-range-ui.
4. Repeat with only one week remaining in a room/work-type: delete it.
5. **Expect**: the page shows the existing "ยังไม่มีสัปดาห์" (no weeks yet) empty
   state, and the "+ สัปดาห์ใหม่" control is still present and usable.

## Scenario 4: Not-found and mock-mode checks

1. Attempt to trigger `deleteWeek` for a week ID that doesn't exist (e.g. by
   deleting the same week twice in quick succession from two different actions).
   **Expect**: a clear "not found" error, no crash.
2. Temporarily set `DATA_SOURCE = "mock"`. **Expect**: no delete control appears on
   any week card in the legacy v7 snapshot view — consistent with every other
   mutation control being hidden in that mode. Revert back to `"local"` afterward.

## Scenario 5: Freed-up date range after deletion

1. Create a week covering `2026-06-08` to `2026-06-15`.
2. Delete it.
3. Create a new week covering the exact same range `2026-06-08` to `2026-06-15`.
4. **Expect**: creation succeeds (no "overlaps with an existing week" rejection),
   since the deleted week no longer counts toward the overlap check (FR-008).
