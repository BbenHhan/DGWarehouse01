# Server Actions Contract Delta: `createWeek`

This documents only the *change* to an existing Server Action from
`specs/001-progress-tracker-migration/contracts/server-actions.md`. All other
Server Actions (`uploadPhoto`, `deletePhoto`, `editPhoto`, `uploadDoc`, `deleteDoc`,
`editDoc`) are unchanged by this feature.

## Before

```ts
createWeek(roomId: string, workTypeId: string): Promise<ActionResult<{ weekId: string }>>
```

Behavior: auto-incremented `week_number` (`max(existing) + 1`), generic label
`"สัปดาห์ที่ {n}"`. No date information captured.

## After

```ts
createWeek(
  roomId: string,
  workTypeId: string,
  startDate: string,   // ISO date, "YYYY-MM-DD"
  endDate: string       // ISO date, "YYYY-MM-DD"
): Promise<ActionResult<{ weekId: string }>>
```

**Validation** (via a new `createWeekSchema` in `lib/validation.ts`):
- `roomId`, `workTypeId`: non-empty strings (unchanged pattern — see existing
  `foreignKeyId` helper introduced in the local-storage-backend work).
- `startDate`, `endDate`: required, must parse as valid ISO dates.
- `endDate` must be `>=` `startDate` — reject with a clear Thai error message
  otherwise (FR-002).

**Behavior**:
- "local" backend: `localCreateWeek(roomId, workTypeId, startDate, endDate)` stores
  the date range directly; `week_number` becomes an internal, unexposed bookkeeping
  value (not shown, not requested from the caller).
- "supabase" backend (not live — for when it is): same shape, `weeks` table gains
  `start_date DATE`, `end_date DATE` nullable columns (nullable so historical/mock
  rows are representable in the same schema if ever imported, though no such import
  is planned by this feature).
- Auto-derives a `label` from the date range for display fallback/debugging (e.g.
  `"8 มิ.ย. 2569 – 15 มิ.ย. 2569"`), but this is not what the new card UI reads from —
  the UI reads `start_date`/`end_date` directly and formats them itself.

**Error responses** (`ActionResult<{ weekId: string }>` with `ok: false`):
- Missing/invalid date → `"กรุณาระบุวันที่เริ่มต้นและสิ้นสุด"` (please provide start
  and end dates).
- `endDate < startDate` → `"วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น"` (end date must
  not be before the start date).
- Overlaps an existing week's date range in the same room/work-type (confirmed via
  `/speckit-clarify` 2026-07-07 — overlap is rejected, not permitted) →
  `"ช่วงวันที่นี้ทับซ้อนกับสัปดาห์ที่มีอยู่แล้วในประเภทงานนี้"`. Checked by fetching
  existing weeks via `getWeeks(roomId, workTypeId)` before creating, backend-agnostic
  (works the same for "local" and future "supabase").

## Caller change

`components/AddWeekButton.tsx` changes from a single-click button (no form) to a
small dialog collecting `startDate`/`endDate` before calling `createWeek` with the
four arguments above.
