# Quickstart: Room Checklist

## Prerequisites

- `supabase/migrations/0010_checklist.sql` applied to the live Supabase project (manual, via the SQL Editor — same process every prior migration in this project has needed).

## Validation scenarios

### Scenario 1 — Add and toggle from the sitewide page (US1, US2)

1. Open `/checklist`.
2. Type a new item's text, leave rooms unselected, save. Expect: it appears, not-done, untagged.
3. Type another item, select 2 rooms, save. Expect: it appears tagged with both.
4. Toggle the first item's checkbox. Expect: it flips to done immediately, no reload needed.
5. Reload the page. Expect: the done state persisted.

### Scenario 2 — Room-scoped visibility (US3, US4)

1. From Scenario 1, note which two rooms the second item was tagged to (Room A, Room B).
2. Open Room A's `/photos/[roomSlug]/[workTypeSlug]` page (any work-type). Expect: a checklist box showing the second item.
3. Open a third room (not tagged). Expect: the checklist box does not show that item — and if that room has zero pending items, shows a clear "nothing pending" state.
4. Confirm the untagged item from Scenario 1 does NOT appear in any room's box, but still appears on `/checklist`.

### Scenario 3 — Add/toggle directly from a room box, no navigation (US3 acceptance 6-7)

1. On Room A's page, type text into the checklist box's own quick-add field and save.
2. Expect: a new item appears in that box, and — confirmed via `/checklist` — is tagged to Room A automatically.
3. Toggle that item done directly from the room box. Expect: it disappears from the box (not-done-only view) without navigating away.

### Scenario 4 — Mobile placement (FR-005)

1. Resize to a narrow/mobile viewport on a room's page.
2. Expect: the checklist box appears above the work-type category tabs (`WorkTypePhotoNav`), not below the photo timeline.

### Scenario 5 — Role permissions (FR-008)

1. As a viewer-role account, open `/checklist` and a room page.
2. Expect: items are visible, but no add/edit/toggle/delete controls are shown or usable.

## Automated checks

- `npx tsc --noEmit` — clean.
- `npx next lint` — clean.
- `npm test` — no regressions (no new pure-logic module warranting new tests, per research.md/plan.md).

## Expected final state

- `checklist_items`/`checklist_item_rooms` exist and are queryable.
- No other table affected.
- `/checklist` and every room/work-type page compile and render without server errors.
