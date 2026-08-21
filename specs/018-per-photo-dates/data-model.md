# Data Model: Per-Photo Dates (Replace Week Date-Ranges)

## Schema change (`supabase/migrations/0009_photo_dates.sql`)

```sql
-- No data to preserve (weeks/photos confirmed empty this session) — clean replacement.
alter table photos drop constraint if exists photos_week_id_fkey;
alter table photos drop column if exists week_id;

alter table photos add column room_id uuid references rooms (id) on delete restrict;
alter table photos add column work_type_id uuid references work_types (id) on delete restrict;
alter table photos add column date date;

alter table photos alter column room_id set not null;
alter table photos alter column work_type_id set not null;
alter table photos alter column date set not null;

create index if not exists photos_room_work_type_idx on photos (room_id, work_type_id);
create index if not exists photos_date_idx on photos (date);

drop table if exists week_cadences;
drop table if exists weeks;
```

Idempotent-safe re-run: every `alter table ... drop column/constraint if exists` and `add column` would need a guard for "column already exists" on a second run — acceptable since, per this project's established pattern (`0001`-`0008`), migrations are applied once manually via the Supabase SQL editor and are not expected to be re-run blindly. `drop table if exists` is already safely re-runnable.

## `photos` (updated)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, unchanged |
| `room_id` | uuid | **NEW** — FK → `rooms.id`, `on delete restrict` |
| `work_type_id` | uuid | **NEW** — FK → `work_types.id`, `on delete restrict` |
| `date` | date | **NEW** — the photo's single exact date (FR-001); no range, no overlap check |
| `storage_path` | text | unchanged |
| `file_name` | text | unchanged |
| `note` | text, nullable | unchanged |
| `created_at` / `updated_at` | timestamptz | unchanged |
| ~~`week_id`~~ | — | **REMOVED** |

## `weeks` — removed entirely

## `week_cadences` — removed entirely (Feature 016)

## `lib/types.ts` changes

```ts
export type Photo = {
  id: string;
  room_id: string;      // NEW
  work_type_id: string; // NEW
  date: string;          // NEW — ISO "YYYY-MM-DD"
  storage_path: string;
  file_name: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};
// Week type removed entirely.
```

## Server Actions (`app/actions/photos.ts`)

- `uploadPhoto(roomId: string, workTypeId: string, date: string, files: File[]): Promise<ActionResult<UploadPhotoOutput>>` — replaces `uploadPhoto(weekId, files)`. No overlap/conflict check (Decision 1/FR-008).
- `deletePhoto(photoId: string)` — unchanged signature.
- `editPhoto(input: { photoId; fileName?; note?; date?; roomId?; workTypeId? })` — replaces `weekId?` with `date?`/`roomId?`/`workTypeId?` so a photo's date and/or room/work-type can each be changed independently (FR-006/FR-007).
- `createWeek`, `deleteWeek`, `resolveWeekForDrop` — **removed**.

## `lib/data.ts` changes

- `getPhotos(roomId: string, workTypeId: string, filter?: { from?: string; to?: string }): Promise<Photo[]>` — replaces `getPhotos(weekId)`; orders by `date` descending (FR-003), applies the optional range server-side.
- `getWeeks`, `getAllWeeks` — **removed**.
- `getRoomPhotoCounts()` — queries `photos.select("room_id")` directly (no join, per research.md Decision 6).
- `getSiteStats()` — `totalWeeks` replaced with `totalDays` (count of distinct `date` values across all photos) — the closest still-meaningful analog for the header's third stat chip.

## `lib/date-filter.ts` (new)

```ts
export type DateFilter = { from?: string; to?: string };

export function photoMatchesDateFilter(date: string, filter: DateFilter): boolean {
  const { from, to } = filter;
  if (from && to && from > to) return true; // invalid/reversed range → unfiltered (spec Edge Case)
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
```

## `lib/date-format.ts` (renamed from `lib/week-format.ts`)

- `formatThaiDate(date: string): string | null` — new primary export, single-date Thai/Buddhist-year formatting (e.g. "8 มิ.ย. 2569"), reusing the existing day/month/year formatting logic.
- `formatThaiDateRange(startDate: string, endDate: string): string | null` — kept (renamed from `formatWeekDateRange`) for the filter bar's "showing 8 มิ.ย. – 15 มิ.ย. 2569" display when both `from`/`to` are set.
- `formatWeekDateRangeOrNull` — removed (nothing left holds a `Week`-shaped object).

## UI contract: `PhotoDateFilter` (new component)

Props: `{ from: string; to: string; onChange: (filter: { from: string; to: string }) => void }`. Renders two `<Input type="date">` (start/end, both independently clearable) plus a "ล้างตัวกรอง" (clear) button shown only when at least one is set. Purely controlled — the parent page owns state via URL search params (`?from=...&to=...`) so a filtered view is shareable/bookmarkable, consistent with how `?week=...` worked today.

## UI contract: `WorkTypePhotoNav` (new component, replaces `WorkTypeWeekNav`)

Props: `{ workTypes: WorkType[]; currentRoomSlug: string; currentWorkTypeSlug: string }`. Renders only the work-type tab strip `WorkTypeWeekNav` used to render — the week strip underneath it is gone (replaced page-level by `PhotoDateFilter` + the flat `PhotoGrid` list).
