# Phase 1 Data Model: Recurring Time-Period Generator for Week Selection

## New table: `week_cadences`

```sql
create table week_cadences (
  id uuid primary key default gen_random_uuid(),
  work_type_id uuid references work_types (id) on delete cascade, -- null = sitewide default
  interval_value int not null check (interval_value > 0),
  interval_unit text not null check (interval_unit in ('day', 'month', 'year')),
  origin_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index week_cadences_global_unique on week_cadences ((true)) where work_type_id is null;
create unique index week_cadences_work_type_unique on week_cadences (work_type_id) where work_type_id is not null;
```

RLS: same "authenticated full access" policy shape as `weeks`/`photos` (`supabase/migrations/0002_rls.sql`) — real authorization is enforced in the Server Action layer (admin for writes, editor+ for reads), not at the RLS layer, consistent with every other table in this schema.

At most `1 + (number of work types)` rows ever exist (one sitewide + at most one per work type) — currently ≤7 with 6 pre-existing work types + `doors`.

## New pure logic: `lib/period-generator.ts`

```ts
type IntervalUnit = "day" | "month" | "year";

type Cadence = {
  intervalValue: number;
  intervalUnit: IntervalUnit;
  originDate: string; // ISO YYYY-MM-DD
};

type Period = { startDate: string; endDate: string }; // both ISO YYYY-MM-DD

// Generates periods from cadence.originDate forward, stopping at (and
// including) the period whose start date is on or before `upToDate` —
// research.md Decision 3. Handles month/year clamping — research.md
// Decision 2.
function generatePeriods(cadence: Cadence, upToDate: string): Period[];
```

## New Server Actions: `app/actions/cadence.ts`

```ts
// Read — available to editor+ (same bar as creating a week itself).
// Returns the effective cadence for a work type: that work type's own
// override if one exists, else the sitewide default, else null (no
// cadence configured at all yet — data-model "Fallback" below).
async function getEffectiveCadence(workTypeId: string | null): Promise<ActionResult<Cadence | null>>;
// workTypeId = null → sitewide-only lookup (used by UploadDateRangePicker,
// research.md Decision 4); a real id → override-or-sitewide (used by
// AddWeekButton).

// Write — admin only (Constitution VII, FR-008).
async function setGlobalCadence(intervalValue: number, intervalUnit: IntervalUnit, originDate: string): Promise<ActionResult<void>>;
async function setWorkTypeCadence(workTypeId: string, intervalValue: number, intervalUnit: IntervalUnit, originDate: string): Promise<ActionResult<void>>;
async function removeWorkTypeCadence(workTypeId: string): Promise<ActionResult<void>>;

// Read — admin only, powers the admin settings screen's override list.
async function listCadences(): Promise<ActionResult<{ global: Cadence | null; overrides: Array<{ workTypeId: string; workTypeName: string; cadence: Cadence }> }>>;
```

`setGlobalCadence`/`setWorkTypeCadence` both `upsert` on the relevant partial-unique-index conflict target, so re-saving updates the existing row rather than erroring.

## Modified: `app/actions/photos.ts` — `createWeek`'s overlap error

No signature change. The existing `hasOverlap` branch now finds the specific conflicting week from the already-fetched `weeksInSameWorkType` and builds the message from it:

```ts
const conflicting = weeksInSameWorkType.find(
  (week) => week.start_date && week.end_date &&
    rangesOverlap(parsed.data.startDate, parsed.data.endDate, week.start_date, week.end_date)
);
// message includes formatWeekDateRange(conflicting.start_date, conflicting.end_date)
```

## New component: `components/WeekPeriodPicker.tsx`

```ts
function WeekPeriodPicker(props: {
  workTypeId: string | null; // null = sitewide-only (UploadDateRangePicker); real id = AddWeekButton
  value: { startDate: string; endDate: string } | null;
  onChange: (range: { startDate: string; endDate: string }) => void;
}): JSX.Element;
```

Internally: calls `getEffectiveCadence(workTypeId)` once on mount; if a cadence exists, calls `generatePeriods` and renders the list (most recent/current period first); if `null`, renders the same two `<Input type="date">` fields the current free-text UI already uses (research.md Decision 6) with the same `onChange` contract, so callers don't need to branch on which mode is active.

## New component: `components/CadenceForm.tsx`

```ts
function CadenceForm(props: {
  initial: Cadence | null;
  onSave: (cadence: Cadence) => void;
  onRemove?: () => void; // present only for a work-type override row, not the sitewide form
}): JSX.Element;
```

Plain interval-number input + unit select (day/month/year) + origin-date input, per spec SC-002 ("under a minute, no technical knowledge required").

## Reused entities (unchanged)

- **Week**, **Room**, **WorkType** (`lib/types.ts`): no schema change. A week created via a generated period looks byte-for-byte identical to one created via free-text entry today.
