# Quickstart: Verify Week Date-Range Input & Card-Style Week UI

## Prerequisites

- `DATA_SOURCE = "local"` in `lib/data-config.ts` (the current default) — upload/edit
  UI must be active, which it is by default.
- Dev server running (`npm run dev`, or via the Claude Preview tool).
- A clean/empty `.local-data/` (or accept that this run adds to whatever is already
  there — either is fine for verification).

## Scenario 1: Add a week by date range, no order field (US1)

1. Navigate to any room + work type page, e.g. `/photos/hong-raek/firewalls`.
2. Click "+ สัปดาห์ใหม่" (add week).
3. **Expect**: a dialog appears asking for a start date and an end date only — no
   field resembling "week number", "order", or "index" anywhere in the form.
4. Leave both fields empty and try to submit. **Expect**: rejected, no week created.
5. Fill start date `2026-06-08`, end date `2026-06-01` (end before start). Submit.
   **Expect**: rejected with a clear error; no week created.
6. Fill start date `2026-06-08`, end date `2026-06-15`. Submit. **Expect**: a new week
   appears in the timeline, showing that date range.
7. Add another week with start date `2026-06-12`, end date `2026-06-20` (overlaps the
   week just created). Submit. **Expect**: rejected with a clear error ("ช่วงวันที่นี้
   ทับซ้อนกับสัปดาห์ที่มีอยู่แล้วในประเภทงานนี้"); no second week is created
   (confirmed via `/speckit-clarify` 2026-07-07 — overlapping ranges within the same
   room/work-type are rejected, not permitted).

## Scenario 2: Weeks always sort chronologically, not by creation order (US2)

1. On the same room/work-type, add a second week with start date `2026-06-22`, end
   date `2026-06-29` (later than the first).
2. Add a third week with start date `2026-05-25`, end date `2026-06-01` (earlier than
   both existing weeks).
3. **Expect**: the timeline shows the three weeks left-to-right in date order —
   May 25–Jun 1, then Jun 8–15, then Jun 22–29 — regardless of the order they were
   created in (third-created week appears first).

## Scenario 3: Card UI replaces circular dots (US3)

1. With at least one week present, visually inspect the timeline.
2. **Expect**: each week renders as a rectangular card (not a small circle),
   displaying its date range as the primary text.
3. Upload a photo/PDF/video into one week (existing upload flow, unchanged). **Expect**:
   that week's card visibly signals "has files" (existing gold/highlight treatment),
   distinguishing it from weeks with no files yet.
4. Click a different week's card to select it. **Expect**: the selected card is
   visually distinguished from the others (existing active-state treatment), and the
   photo grid below updates to that week's files.

## Scenario 4: Existing week-scoped actions still work (FR-008 regression check)

1. Upload a photo, a PDF, and a video into a week (as already verified in the prior
   local-storage-backend work).
2. Edit one file's name/note and move it to a different week via the existing
   `EditModal` "ย้ายไปสัปดาห์" picker. **Expect**: the picker's week options are
   labeled with the new date-range format and the move succeeds.
3. Delete a file. **Expect**: unchanged optimistic-delete behavior.

## Scenario 5: Mock backend (legacy v7 snapshot) is unaffected

1. Temporarily set `DATA_SOURCE = "mock"` in `lib/data-config.ts`.
2. Visit any room/work-type with real v7 folder weeks.
3. **Expect**: weeks still display using the existing `week_number`/label-derived
   text (e.g. "W6", date subtitle parsed from the folder name) — unchanged from
   before this feature, since mock weeks have no `start_date`/`end_date`.
4. Revert `DATA_SOURCE` back to `"local"`.
