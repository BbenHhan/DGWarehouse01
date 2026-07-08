# Phase 1 Data Model: Delete Week

No new entities and no field changes. This feature adds a **delete operation** to
the existing `Week` entity's lifecycle (introduced in 001, amended in
002-week-date-range-ui) and a cascading side-effect on the existing `Photo` entity.

## Operation: Delete Week

**Input**: `weekId: string`

**Preconditions**: The week identified by `weekId` exists (if not, the operation
returns a "not found" result rather than throwing — FR-007).

**Effects**:
1. Every `Photo` row whose `week_id === weekId` is deleted.
2. Every file backing those `Photo` rows (on whichever storage backend is active)
   is deleted.
3. The `Week` row itself is deleted.

**Postconditions**:
- No `Photo` row references the deleted `weekId` (none can, since they're deleted
  in the same operation).
- No file that belonged to the deleted week remains accessible via the app.
- The week's date range (`start_date`/`end_date`) no longer counts toward the
  overlap check (FR-009 from 002-week-date-range-ui) for future week creation,
  since the overlap check only ever considers weeks that currently exist
  (FR-008 in this feature).

**Ordering note**: Files/photo rows are deleted before the week row is removed (not
the reverse) — this ordering means a failure partway through leaves, at worst, a
week with fewer files than before rather than orphaned photo rows pointing at a
non-existent week.
