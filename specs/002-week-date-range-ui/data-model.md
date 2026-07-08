# Phase 1 Data Model: Week Date-Range Input & Card-Style Week UI

## Entity: Week (amended)

The `Week` entity already exists (introduced in `specs/001-progress-tracker-migration`).
This feature amends its shape — no new entity is introduced.

| Field          | Type             | Required                    | Notes |
|----------------|------------------|------------------------------|-------|
| `id`           | string           | yes                          | Unchanged. |
| `room_id`      | string           | yes                          | Unchanged. |
| `work_type_id` | string           | yes                          | Unchanged. |
| `week_number`  | number           | yes (internal only)          | No longer user-facing for "local"/"supabase" weeks; retained only for the "mock" backend's legacy sort/display (see research.md Decision 4). Never shown in the new card UI. |
| `label`        | string           | yes                          | Unchanged field, but its role narrows: for "mock" weeks it remains the display source (parsed via existing `splitWeekLabel`); for "local"/"supabase" weeks it is auto-derived from the date range at creation (for logs/debugging), not the UI's primary source. |
| `start_date`   | string \| null   | **new** — null only in "mock" | ISO date (`YYYY-MM-DD`). Required (non-null) for every week created via the "local"/"supabase" backends; always `null` for "mock" backend weeks. |
| `end_date`     | string \| null   | **new** — null only in "mock" | ISO date (`YYYY-MM-DD`). Same nullability rule as `start_date`. Must be `>= start_date` when both are present (FR-002). |
| `created_at`   | string           | yes                          | Unchanged. |

### Validation rules (new)

- `start_date` and `end_date` are both required when creating a week via `createWeek`
  on the "local"/"supabase" backends (FR-003).
- `end_date` must be on or after `start_date` (FR-002).
- No uniqueness/overlap constraint between weeks in the same room/work-type (FR-009,
  per spec Assumption "Overlap policy").

### Derived behavior (not stored fields)

- **Sort order**: weeks are ordered ascending by `start_date` when present; "mock"
  weeks (where `start_date` is always `null`) keep sorting by `week_number` ascending,
  unchanged from today. This is a read-time computation in each backend's
  `getWeeks`/`getAllWeeks`, not a stored field.
- **Has-files signal**: unchanged — still derived from whether any `Photo` rows
  reference the week's `id`, exactly as today.
- **Default-selected week**: unchanged mechanism (last item in the sorted list), now
  correctly resolving to the most recently-dated week once sorting is date-driven.

## Server Action contract change

See [contracts/server-actions-delta.md](./contracts/server-actions-delta.md) for the
`createWeek` signature change.
