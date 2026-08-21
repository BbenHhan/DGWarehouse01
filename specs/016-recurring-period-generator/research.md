# Phase 0 Research: Recurring Time-Period Generator for Week Selection

## Decision 1: Schema — one table, "no work_type_id" means the sitewide row

**Decision**: A single `week_cadences` table with a nullable `work_type_id`. `work_type_id is null` is the sitewide default row; `work_type_id is not null` is that work type's override. Two partial unique indexes enforce "at most one sitewide row" and "at most one row per work type":

```sql
create unique index week_cadences_global_unique on week_cadences ((true)) where work_type_id is null;
create unique index week_cadences_work_type_unique on week_cadences (work_type_id) where work_type_id is not null;
```

**Rationale**: A plain `unique (work_type_id)` constraint would NOT prevent multiple sitewide rows, since Postgres treats every `NULL` as distinct from every other `NULL` under a standard unique constraint — a well-known gotcha. The partial-index-on-a-constant-expression trick (`(true)) where work_type_id is null`) is the standard, minimal way to enforce "at most one row matching this condition" without a separate singleton table. This keeps the whole feature to one table instead of two (a `cadences` table plus a `work_type_cadence_overrides` join table), which would be more "correct" in a generic sense but is unnecessary weight for at most ~7 rows total.

**Alternatives considered**: Two separate tables (one for the singleton sitewide row, one for per-work-type overrides). Rejected as needless normalization for this scale — one table with a nullable FK and two partial indexes is simpler to query (`getEffectiveCadence` becomes one `select ... where work_type_id = $1 or work_type_id is null order by work_type_id nulls last limit 1`) than a two-table join/coalesce.

## Decision 2: Month/year interval stepping — calendar-aware, clamped to the real last day

**Decision**: `lib/period-generator.ts` steps months/years using calendar arithmetic (JavaScript `Date`'s own month-overflow normalization for the *first* candidate, then clamps back if the day-of-month doesn't exist in the target month). E.g. origin day 31, stepping by 1 month from January → JS would normally overflow February 31 into March 3; instead, the generator detects the mismatch and clamps to February's actual last day (28 or 29) rather than letting it silently roll into the next month.

**Rationale**: Spec Edge Cases explicitly calls out this exact scenario. Silent month-rollover (Jan 31 + 1 month → Mar 3) is the classic bug in hand-rolled date-stepping code — it would produce a period boundary that looks like it belongs to March when the account holder configured a monthly cadence, silently corrupting every subsequent period's start date too (errors compound). Clamping to the real last day of the intended month is the conventional, least-surprising fix (same convention most calendar apps use for "same day next month" when that day doesn't exist).

**Alternatives considered**: Using a date library (`date-fns`, `dayjs`) for this arithmetic. Rejected — this project has zero date-library dependencies today (`lib/week-format.ts` and `lib/date-range.ts` both hand-roll their date logic already), and the actual arithmetic needed here (add N months/years, clamp day-of-month) is a handful of lines; pulling in a dependency for that would be inconsistent with the codebase's existing convention of not needing one for this app's date needs.

## Decision 3: Generation upper bound — stop at (and include) the period containing today

**Decision**: `generatePeriods(cadence, upToDate)` generates periods starting from `cadence.originDate`, stepping forward, and stops as soon as a period's start date is after `upToDate` (defaulting to today) — the last period generated is therefore always the one currently in progress, per spec Acceptance Scenario 2 (User Story 1).

**Rationale**: An unbounded generator (no stop condition) would either hang or need an arbitrary cutoff; bounding at "today" is the only cutoff with real product meaning — periods further in the future aren't a usable choice for "when did you take these photos" (spec Edge Cases: "periods that would start after today are not generated or shown, since they don't correspond to a usable choice yet"). Taking `upToDate` as a parameter (rather than hardcoding `new Date()`) keeps the function pure and unit-testable with a fixed reference date.

## Decision 4: `UploadDateRangePicker` uses the sitewide cadence only, never a work-type override

**Decision**: The bulk-upload page's date-range step (`components/UploadDateRangePicker.tsx`) always renders `WeekPeriodPicker` against the **sitewide** cadence, regardless of any work-type override that may exist. `AddWeekButton.tsx`, by contrast, knows its work type at the moment the picker is shown and passes that work type through, so its `WeekPeriodPicker` uses that work type's override when one exists (falling back to sitewide otherwise).

**Rationale**: specs/015's bulk-upload flow picks one date range *before* any file has been sorted into a room/work-type bin — the whole point of that flow is that one date range applies across a session covering *multiple* work types (spec 015 FR-001). There is no single work type to key an override lookup off at that point in the flow. Since the cadence only ever influences *which dates are offered in the picker* — the `weeks` table itself has no notion of "which cadence produced this range" — using the sitewide cadence here is a pure UX simplification with no correctness cost: a work type with its own override still gets exact-match/overlap-checked normally by `resolveWeekForDrop` regardless of which cadence suggested the date.

**Alternatives considered**: Let the bulk-upload date step pick a *work type* first, then a date range scoped to that work type's cadence. Rejected — this would invert specs/015's entire flow (date-first, then sort-into-any-work-type), a much bigger behavioral change than this feature's actual goal.

## Decision 5: Overlap-collision error message names the conflicting week

**Decision**: In `createWeek` (`app/actions/photos.ts`), when `hasOverlap` is true, look up the specific conflicting week from `weeksInSameWorkType` (already fetched for the check) and include its formatted date range in the returned error string, e.g. `` `ช่วงวันที่นี้ทับซ้อนกับสัปดาห์ 22-28 มิ.ย. 2569 ที่มีอยู่แล้วในประเภทงานนี้` `` — reusing `formatWeekDateRange` (`lib/week-format.ts`) for the Thai-formatted range, the same formatter every other week-date display on the site already uses.

**Rationale**: Directly satisfies FR-006 and is the literal complaint that triggered this whole feature ("ไม่บอกว่ามีวันที่นั้นแล้วเพราะอะไร" — doesn't say why it thinks that date already exists). No change to the overlap-*detection* logic (`rangesOverlap`) — only the message built from an already-known conflicting week.

## Decision 6: Fallback to free-text when no cadence is configured

**Decision**: `WeekPeriodPicker` calls `getEffectiveCadence(workTypeId)` (or, for the upload page, the sitewide-only variant). If it returns `null` (no sitewide cadence has ever been configured — the only way this happens, since a configured sitewide cadence always exists once set up even if a specific work type has no override), the component renders the exact same two `<Input type="date">` fields `AddWeekButton.tsx` already has today, unchanged.

**Rationale**: Directly satisfies FR-009 and the spec's edge case — this feature must never become a hard blocker for week creation before an admin has had a chance to set up a cadence (e.g. immediately after this feature ships, before anyone configures anything). Reusing the exact existing free-text markup/behavior (rather than a new "empty state") means zero regression risk for accounts that never adopt this feature.
