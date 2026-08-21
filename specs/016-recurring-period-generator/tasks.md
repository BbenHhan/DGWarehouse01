---

description: "Task list for Recurring Time-Period Generator for Week Selection"

---

# Tasks: Recurring Time-Period Generator for Week Selection

**Input**: Design documents from `/specs/016-recurring-period-generator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: `lib/period-generator.ts`'s pure logic gets Vitest coverage (day/month/year stepping, month-end clamping, upper-bound-at-today) — the highest-value test target in this feature, matching this project's established pattern of unit-testing pure `lib/*.ts` date logic (`lib/date-range.test.ts`, `lib/week-format.ts`'s sibling formatter). Server Actions and UI wiring are live-verified via quickstart.md.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies (research.md Decision 2: hand-rolled date arithmetic, no date library, matching existing `lib/week-format.ts`/`lib/date-range.ts` convention).*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The table, the pure period-generation logic, and the Server Actions every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Create `supabase/migrations/0008_week_cadences.sql`: `week_cadences` table (nullable `work_type_id`, `interval_value`, `interval_unit` check constraint, `origin_date`) + the two partial unique indexes (`week_cadences_global_unique`, `week_cadences_work_type_unique`, data-model.md) + the same "authenticated full access" RLS policy shape as `0002_rls.sql`
- [ ] T002 Apply the migration to the live Supabase project (manual run via the Supabase SQL Editor — DDL cannot go through the service-role REST client the way migration 0007's single-row insert did; same manual process as migrations 0001-0006)
  **Blocked on the account holder** — requires access to the Supabase dashboard's SQL Editor. Nothing in this feature works live until this runs (`week_cadences` doesn't exist yet).
- [X] T003 [P] Create `lib/period-generator.ts`: `generatePeriods(cadence, upToDate)` (research.md Decisions 2-3 — calendar-aware month/year stepping with last-day clamping, stops at the period containing `upToDate`); add `lib/period-generator.test.ts` covering: daily stepping, monthly stepping with day-31-into-February clamping, yearly stepping across a leap year (Feb 29), and the upper-bound behavior (period containing `upToDate` is included, nothing past it is generated)
  **Result**: 9/9 tests pass, including the exact day-31/Feb clamping and Feb-29-leap-year cases called out in research.md.
- [X] T004 Create `app/actions/cadence.ts`: `getEffectiveCadence(workTypeId)` (editor+ — `workTypeId: null` = sitewide-only lookup for research.md Decision 4, a real id = override-or-sitewide), `setGlobalCadence`/`setWorkTypeCadence`/`removeWorkTypeCadence` (admin only, `requireRole("admin")`), `listCadences` (admin only, powers the settings screen) (depends on T001/T002 for the table to exist against a real project; can be written before T002 lands, just not live-tested)
  **Deviation from plan**: `setGlobalCadence`/`setWorkTypeCadence` use an explicit read-then-update-or-insert instead of `.upsert(onConflict)` — PostgREST's upsert ON CONFLICT target can't express the partial unique index's `where work_type_id is null` predicate, so a plain upsert would either fail to match the index or require a constraint name Supabase's client doesn't expose cleanly. Also added `lib/database.types.ts`'s `week_cadences` entry (hand-written, matching the file's existing convention) since it didn't exist before this feature.

**Checkpoint**: `week_cadences` table live; `generatePeriods` unit-tested; Server Actions ready to be wired into UI.

---

## Phase 3: User Story 1 - Picking a date range becomes choosing from a list, not typing two exact dates (Priority: P1) 🎯 MVP

**Goal**: Both existing date-entry points show a generated period list (or fall back to free-text if no cadence exists yet).

**Independent Test**: quickstart.md Scenarios 1, 3, 4, 5, 9.

### Implementation for User Story 1

- [X] T005 [US1] Create `components/WeekPeriodPicker.tsx`: calls `getEffectiveCadence(workTypeId)` on mount; if a cadence exists, calls `generatePeriods` (T003) and renders the list (most recent/current period first, each shown via the existing `formatWeekDateRange` Thai formatting); if `null`, renders the same two `<Input type="date">` fields `AddWeekButton.tsx` has today (research.md Decision 6), same `onChange({startDate, endDate})` contract either way so callers don't branch
- [X] T006 [US1] Modify `components/AddWeekButton.tsx`: replace its two `<Input type="date">` fields with `<WeekPeriodPicker workTypeId={workTypeId} .../>` (passes its real work type — gets that work type's override when one exists, per research.md Decision 4)
- [X] T007 [US1] Modify `components/UploadDateRangePicker.tsx`: replace its two date inputs with `<WeekPeriodPicker workTypeId={null} .../>` (sitewide-only — research.md Decision 4, this picker runs before any work type is chosen in the specs/015 bulk-upload flow)
- [ ] T008 [US1] Live-verify quickstart.md Scenarios 1 (no-cadence fallback), 3 (list shows current period), 4 (pick unused period creates a week), 5 (pick exact-match period reuses existing week), 9 (upload page ignores work-type overrides)
  **Blocked on the account holder** — requires T002 (migration) applied first, then sign-in this agent cannot perform (password entry prohibited). Static checks done: `tsc --noEmit`/`next lint` clean across the whole project, `lib/period-generator.test.ts` passing, dev server compiles `/login` and the middleware-gated `/admin/cadence`/`/upload` routes with no server errors in the log.

**Checkpoint**: Both date-entry points use generated periods; free-text fallback works when nothing's configured yet.

---

## Phase 4: User Story 2 - The account holder sets the cadence themselves, easily (Priority: P1)

**Goal**: An admin-only screen to configure the sitewide cadence, with a plain, non-technical form.

**Independent Test**: quickstart.md Scenario 2.

### Implementation for User Story 2

- [X] T009 [US2] Create `components/CadenceForm.tsx`: interval-number `<Input type="number">`, unit `<Select>` (day/month/year), origin-date `<Input type="date">`, save button — reusable for both the sitewide form and each work-type override row (data-model.md)
- [X] T010 [US2] Create `app/(app)/admin/cadence/page.tsx`: `requireRole("admin")` gate using the same try/catch-and-render-denied pattern as `app/(app)/admin/users/page.tsx`, renders `CadenceForm` bound to `setGlobalCadence`/the current sitewide cadence from `listCadences`
  **Deviation from plan**: split into a server `page.tsx` (role gate + data fetch) and a new client `components/CadenceSettingsClient.tsx` (form state + Server Action calls + toasts), matching `app/(app)/admin/users/page.tsx` + `UserRoleTable.tsx`'s existing split — not called out explicitly in plan.md's file list but the same established pattern. Also added the "รอบเวลาสัปดาห์" entry point to `components/AccountMenu.tsx` (admin-gated, alongside the existing "จัดการผู้ใช้" link) since the spec has no entry-point requirement of its own but every other admin screen has one.
- [ ] T011 [US2] Live-verify quickstart.md Scenario 2
  **Blocked on the account holder** — same reason as T008.

**Checkpoint**: An admin can set up the sitewide cadence in under a minute through a plain form.

---

## Phase 5: User Story 3 - A work type that runs on a different rhythm can have its own cadence (Priority: P2)

**Goal**: Per-work-type override configuration, scoped and removable independently of the sitewide default.

**Independent Test**: quickstart.md Scenario 6.

### Implementation for User Story 3

- [X] T012 [US3] Extend `app/(app)/admin/cadence/page.tsx` (T010) with a per-work-type override section: list every work type (from existing `getWorkTypes()`) with its current override (if any, from `listCadences`) or an "add override" affordance, each row using `CadenceForm` (T009) with `onRemove` wired to `removeWorkTypeCadence`
  **Result**: implemented in `CadenceSettingsClient.tsx` — a dropdown of work types without an override (`+ ตั้งค่ารอบเวลาแยกสำหรับหมวดงาน...`) opens an inline `CadenceForm` for the chosen one; each existing override row has its own `CadenceForm` with a working "ลบ" button.
- [ ] T013 [US3] Live-verify quickstart.md Scenario 6 (override applies to its own work type only, removing it reverts to sitewide)
  **Blocked on the account holder** — same reason as T008.

**Checkpoint**: A specific work type can follow its own cadence without affecting any other work type.

---

## Phase 6: User Story 4 - A genuine collision still shows a specific, understandable reason (Priority: P2)

**Goal**: The existing overlap rejection names the specific conflicting week.

**Independent Test**: quickstart.md Scenario 7.

### Implementation for User Story 4

- [X] T014 [US4] Modify `createWeek` in `app/actions/photos.ts`: when `hasOverlap` is true, find the specific conflicting week from the already-fetched `weeksInSameWorkType` and build the error message with its `formatWeekDateRange`-formatted range (research.md Decision 5) — no change to `rangesOverlap`/the overlap-detection logic itself
- [ ] T015 [US4] Live-verify quickstart.md Scenario 7
  **Blocked on the account holder** — same reason as T008. Code-level guarantee in place: the `hasOverlap` boolean became `conflictingWeek` (the actual matched week object, found via `.find` instead of `.some`), so the message always has a real week to format from whenever it fires.

**Checkpoint**: A genuine collision tells the person exactly which existing week it conflicts with.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T016 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T017 [P] Run `npm test`, confirm `lib/period-generator.test.ts` passes and no regressions in the existing suite
  **Result**: 51/51 pass (42 pre-existing + 9 new).
- [ ] T018 Live-verify quickstart.md Scenario 8 (the 121 historical weeks are untouched throughout) as a final sign-off
  **Blocked on the account holder** — same reason as T008. This feature makes no schema change and no code path touches existing `weeks` rows (`generatePeriods` is read-only/computed, `setGlobalCadence`/etc. only write to the new `week_cadences` table) — verifiable by inspection now, and easy to reconfirm with the same read-only query used after Feature 014/015 (`select count(*) from weeks where created_at < '2026-07-15'`) once T002 is applied.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories — the table, `generatePeriods`, and the Server Actions are load-bearing for every subsequent task.
- **User Story 1 (Phase 3)**: Depends on Foundational. Delivers the core value (generated picker at both entry points, with fallback).
- **User Story 2 (Phase 4)**: Depends on Foundational only — independent of US1, but US1's fallback behavior (Scenario 1) is what's visible until US2 ships the way to actually configure a cadence.
- **User Story 3 (Phase 5)**: Depends on Phase 4's admin screen existing (T010) — extends it rather than building a parallel screen.
- **User Story 4 (Phase 6)**: Depends on Foundational only (touches `createWeek` directly) — independent of US1-US3, could ship in any order relative to them.
- **Polish (Phase 7)**: Depends on US1-US4 being complete.

### Parallel Opportunities

- T001 and T003 (Foundational) touch different files and can run in parallel; T002 (manual migration apply) blocks T004 from being live-tested but not from being written.
- T005 (US1) and T009 (US2) touch different files and, once Foundational is done, can be built in parallel by different sessions.
- T014 (US4) is fully independent of US1-US3 and can be done any time after Foundational.
- T016 and T017 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational).
2. Complete Phase 3 (US1 — picker + fallback at both entry points).
3. **STOP and VALIDATE**: quickstart.md Scenario 1 alone already delivers a safe, no-regression state (free-text fallback) even before anyone configures a cadence.

### Incremental Delivery

1. Foundational → US1 (picker infrastructure, works in fallback mode) → US2 (admin can finally configure something, US1's picker springs to life) → US3 (override refinement) → US4 (clearer collision message, independent) → Polish.
