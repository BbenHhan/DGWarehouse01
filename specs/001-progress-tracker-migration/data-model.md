# Data Model: Progress Tracker Web Migration

Storage split: structural/lookup and metadata rows live in Supabase Postgres;
binary files live in Supabase Storage buckets `photos` and `documents`, referenced
by `storage_path`. RLS on every table restricts all operations to the
authenticated user (`auth.role() = 'authenticated'`); the app has exactly one
real account (Bell), so no per-row ownership column is needed.

## Entities

### Room
Fixed lookup — one of the six physical areas from v7.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | e.g. `hong-raek`, `hong-klang`, `hong-soi-1`..`hong-soi-4` |
| name_th | text | e.g. "ห้องแรก" |
| emoji | text | e.g. "🏠" |
| sort_order | int | display order |

Seeded once via migration; not user-editable (spec Assumption).

### WorkType
Fixed lookup — the six work-type tabs, shared across every room.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | e.g. `firewalls`, `electrical`, `roofing`, `flooring`, `drainage`, `overview` |
| name_th | text | e.g. "งานผนังและกำแพงกันไฟ" |
| emoji | text | e.g. "🧱" |
| sort_order | int | display order |

Seeded once via migration; not user-editable.

### Week
Open-ended time bucket within a room + work-type. Created on demand (research.md §6).

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| room_id | uuid, FK → Room | |
| work_type_id | uuid, FK → WorkType | |
| week_number | int | sequential within (room_id, work_type_id) |
| label | text | derived display label, e.g. "สัปดาห์ที่ 4" |
| created_at | timestamptz | |

Unique constraint: `(room_id, work_type_id, week_number)`.

### Photo

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| week_id | uuid, FK → Week | current location; changing this implements "move" (FR-008) |
| storage_path | text | path within the `photos` bucket |
| file_name | text | user-editable display/file name (FR-006) |
| note | text, nullable | free-text description (FR-007) |
| created_at | timestamptz | upload time |
| updated_at | timestamptz | last rename/note/move |

**Validation rules**: `file_name` non-empty (edge case: reject empty rename);
`storage_path` immutable after upload (renames change `file_name` only, not the
underlying object path, to avoid extra Storage moves).

**State transitions**: `week_id` may change any number of times (move, FR-008,
unrestricted per spec Assumptions — any room/work-type/week). Deletion removes
both the row and the Storage object.

### DocumentCategory (หมวด)
Fixed lookup — the four categories.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | e.g. `structure`, `electrical`, `environment`, `safety` |
| name_th | text | e.g. "หมวดที่ 1 โครงสร้างอาคาร" |
| emoji | text | e.g. "🏗️" |
| sort_order | int | 1–4 |

Seeded once via migration; not user-editable.

### Document

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| category_id | uuid, FK → DocumentCategory | current location; changing this implements "move" (FR-009) |
| storage_path | text | path within the `documents` bucket |
| file_name | text | user-editable (FR-006) |
| note | text, nullable | free-text description (FR-007) |
| created_at | timestamptz | upload time |
| updated_at | timestamptz | last rename/note/move |

Same validation rules and transitions as Photo, scoped to `category_id` instead
of `week_id`.

## Relationships

```text
Room 1───N Week N───1 WorkType
Week 1───N Photo
DocumentCategory 1───N Document
```

Rooms and WorkTypes are both fixed lookups; a Week is the join point between one
Room and one WorkType. Photos and Documents are otherwise independent trees —
there is no cross-reference between them.

## Storage bucket layout

- `photos/{week_id}/{uuid}-{original_filename}`
- `documents/{category_id}/{uuid}-{original_filename}`

The `uuid` prefix avoids collisions on repeated uploads of same-named files;
`storage_path` in the metadata row is the full canonical reference used for both
the Next.js `<Image>` public URL and Storage delete calls.
