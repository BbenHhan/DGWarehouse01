# Quickstart: Per-Photo Dates (Replace Week Date-Ranges)

## Prerequisites

- `supabase/migrations/0009_photo_dates.sql` applied to the live Supabase project (manual, via the SQL Editor — same process every migration in this project has needed, since DDL can't go through the service-role REST client).
- Confirmed before starting: `weeks` and `photos` are both empty live (re-verify with a quick read-only count if time has passed since the last check).

## Validation scenarios

### Scenario 1 — Upload without any pre-creation step (US1, SC-001)

1. Open a room/work-type page that has zero photos.
2. Use the uploader; leave the date field on its default (today); pick a file; confirm.
3. Expect: the upload succeeds immediately — no "create a week first" step existed anywhere in this flow.
4. Change the date field to a different date, upload another file; expect it's stored with that chosen date, not today's.

### Scenario 2 — Bulk `/upload` page, one date per session (US1)

1. Open `/upload`. Confirm the date field defaults to today and is a single date, not a range.
2. Drag/sort a few files into a room+work-type bin.
3. Expect: upload succeeds with no "resolving..." step and no possibility of a date-range-conflict error (that error class no longer exists — SC-002).

### Scenario 3 — Browse everything, then narrow by date (US2, SC-003)

1. With several photos across different dates under one room/work-type, open its page with no filter.
2. Expect: every photo for that room/work-type appears, most recent first, no week tabs present.
3. Set a start and end date narrower than the full range.
4. Expect: only photos whose date falls within \[start, end\] (inclusive) remain; the shown count updates to match.
5. Clear the filter (both fields, or the clear button).
6. Expect: the full list returns.

### Scenario 4 — Edit a photo's date or move it (US3)

1. Edit an existing photo; change its date.
2. Expect: it immediately reflects the new date in ordering and in any active filter.
3. Edit the same (or another) photo; change its room/work-type via the "move to" selector.
4. Expect: it disappears from the original room/work-type's list and appears in the new one with its date unchanged.

### Scenario 5 — Invalid filter range doesn't error (Edge Case)

1. Set the filter's start date after its end date.
2. Expect: the view behaves as if unfiltered (shows everything) — no error message, no empty result.

### Scenario 6 — Cadence admin screen is gone (Decision 2)

1. Navigate to `/admin/cadence`.
2. Expect: 404 (the route no longer exists) — not a permission-denied screen, an actual removal.
3. Confirm the account menu no longer shows "รอบเวลาสัปดาห์".

### Scenario 7 — Documents module unaffected (FR-009)

1. Open any `/documents/[categorySlug]` page.
2. Expect: no date field, no date filter, unchanged from before this feature — this module was never touched.

## Automated checks

- `npx tsc --noEmit` — must be clean (every removed export's call sites must be gone too, not just the export).
- `npx next lint` — must be clean.
- `npm test` — `lib/date-filter.test.ts` passing; `lib/date-range.test.ts` and `lib/period-generator.test.ts` no longer exist; `lib/upload-session.test.ts` passing with the week-cache tests removed; `lib/local/store.test.ts` passing against the new photo shape.

## Expected final state

- `weeks` and `week_cadences` tables no longer exist.
- `photos` has `room_id`/`work_type_id`/`date`, no `week_id`.
- No route, component, or Server Action anywhere still references a week id or a date **range** being created/resolved for photos.
- Documents module: byte-for-byte unaffected.
