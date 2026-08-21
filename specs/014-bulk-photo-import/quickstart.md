# Quickstart: Bulk-Import Progress Photos from Weekly Folder Structure

Prerequisites: real Supabase project credentials (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) available locally (already in `.env.local`); the account holder's folder tree present on disk at `D:\Claude\Projects\DGWarehouse\DG picture`.

## Step 0 — Apply the new migration

Run `supabase/migrations/0007_add_doors_work_type.sql` against the live project (same manual process the account holder already used for `0005_roles.sql`/`0006_role_requests.sql` — via the Supabase SQL Editor, since this environment has no direct DB connection tool).

**Expected**: `work_types` table now has 7 rows, including `doors`.

## Scenario 1 — First run imports everything

1. Run: `npx tsx supabase/seed/import-weekly-photos.ts "D:\Claude\Projects\DGWarehouse\DG picture"`
2. Watch the console summary at the end.

**Expected** (SC-001, SC-004, SC-005): Summary reports 10 weeks × (number of populated room/work-type pairs) created, ~757 photos uploaded (760 files minus any genuinely invalid ones, if found), 0 skipped-as-duplicate (first run), a per-file list of anything skipped with a reason. `doors` category's ~14 photos are among those uploaded.

## Scenario 2 — Spot-check the real data (no browser access assumed)

Query the live Supabase project directly (service-role key, same pattern as the check performed during planning):

```
select count(*) from photos;              -- ~757 (or whatever Scenario 1 reported as uploaded)
select count(*) from weeks;                -- matches Scenario 1's "weeks created" count
select slug from work_types where slug = 'doors';  -- 1 row
```

Pick 2-3 `photos.storage_path` values and confirm the object exists in the `photos` Storage bucket (e.g. via `supabase.storage.from("photos").list(weekId)` or the Supabase dashboard's Storage browser).

**Expected**: counts match the run summary; sampled storage objects exist and are non-zero-byte.

## Scenario 3 — Re-run is a no-op

1. Run the exact same command again with no changes to the folder tree.

**Expected** (SC-003): Summary reports 0 weeks created (all matched/reused), 0 photos uploaded, all ~757 photos reported as already-present/skipped.

## Scenario 4 — Adding a new photo to an already-imported folder is picked up on the next run

1. Manually drop one new file into an already-imported week/room/work-type folder.
2. Re-run the same command.

**Expected**: Summary reports 0 new weeks, exactly 1 new photo uploaded, the rest still reported as already-present.

## Scenario 5 — Empty "not yet categorized" folders are left alone

**Expected** (already true after Scenario 1, verify by inspection): no week exists in the DB with a null/placeholder room or date derived from `📦 ยังไม่ระบุห้อง` or `📅 ยังไม่ระบุวันที่` — those folders were empty and produced nothing.
