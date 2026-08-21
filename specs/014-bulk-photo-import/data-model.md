# Phase 1 Data Model: Bulk-Import Progress Photos from Weekly Folder Structure

No new tables. This feature adds one lookup row and populates existing tables through their existing shape — see `supabase/migrations/0001_schema.sql` for the authoritative schema (`rooms`, `work_types`, `weeks`, `photos`), unchanged by this feature except as noted below.

## `work_types` — one new row

Added by `supabase/migrations/0007_add_doors_work_type.sql`:

| slug    | name_th                        | emoji | sort_order |
|---------|---------------------------------|-------|------------|
| `doors` | งานประตูและทางออกฉุกเฉิน       | 🚪    | 7          |

Existing 6 rows (`firewalls`, `electrical`, `roofing`, `flooring`, `drainage`, `overview`) are untouched.

## `weeks` — created or matched, not restructured

Existing shape (`id`, `room_id`, `work_type_id`, `week_number`, `label`, `start_date`, `end_date`, `created_at`) is unchanged. This feature only decides *which values* to write, per Decision 5/Decision 1 in `research.md`:

- `room_id` / `work_type_id`: resolved from the folder-name mapping (Decision 2).
- `start_date` / `end_date`: parsed from the week folder's name (Decision 1).
- `week_number`: next available integer for that `(room_id, work_type_id)` pair (matches `createWeek` Server Action's own logic — not the folder's literal "สัปดาห์ที่ N", which is a global calendar label shared across every room/work-type, not a per-pair sequence).
- `label`: `` `สัปดาห์ที่ ${week_number}` `` — a fallback value only; the UI always displays the computed date-range string once `start_date`/`end_date` are populated (confirmed in `app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx`).
- **Matching key for idempotent re-runs**: `(room_id, work_type_id, start_date, end_date)` — see Decision 5.

## `photos` — created, one row per imported file

Existing shape (`id`, `week_id`, `storage_path`, `file_name`, `note`, `created_at`, `updated_at`) is unchanged.

- `storage_path`: `` `${week_id}/${randomUUID()}-${file_name}` `` — identical convention to the live `uploadPhoto` Server Action (`app/actions/photos.ts`), so imported files are indistinguishable from UI-uploaded ones.
- `note`: always `null` (nothing in the source folder tree carries a caption).
- **Matching key for idempotent re-runs**: `(week_id, file_name)` — see Decision 5.

## Ephemeral: import run summary (not persisted)

Printed to the console at the end of a run (FR-010), not written to any table:

- Weeks created / weeks reused (matched, skipped).
- Photos uploaded / photos skipped-as-already-present / photos skipped-as-invalid-type-or-size (with the specific file path and reason for each skip).
