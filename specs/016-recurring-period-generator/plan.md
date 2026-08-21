# Implementation Plan: Recurring Time-Period Generator for Week Selection

**Branch**: `016-recurring-period-generator` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-recurring-period-generator/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A new `week_cadences` table stores an optional sitewide default cadence (interval + unit + origin date) and optional per-work-type overrides. A pure `lib/period-generator.ts` module computes the non-overlapping period list a cadence implies, up through the period containing today. A new `WeekPeriodPicker` component (replacing free-text date inputs) renders that list — reused at both existing date-entry points, `components/AddWeekButton.tsx` and the bulk-upload page's `components/UploadDateRangePicker.tsx` — and falls back to today's free-text inputs when no cadence is configured yet. A new admin-only settings screen lets an admin configure the sitewide cadence and per-work-type overrides. The existing `createWeek` overlap check is unchanged in logic but gets a clearer error message naming the specific conflicting week.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router), React 19.

**Primary Dependencies**: No new external dependencies — plain date arithmetic in a new pure `lib/period-generator.ts` module (no date library needed for day/month/year interval stepping); existing `requireRole`, `createServiceClient`, shadcn/ui `Select`/`Input`/`Button`.

**Storage**: One new table, `week_cadences` (Postgres/Supabase), migration `supabase/migrations/0008_week_cadences.sql`. No changes to `weeks`/`photos`/other existing tables.

**Testing**: Vitest for `lib/period-generator.ts` (pure logic: day/month/year stepping, month-end clamping, upper-bound-at-today) — this is the highest-value test target in the whole feature, since date arithmetic bugs are easy to introduce and hard to eyeball. Live-verified via quickstart.md for the Server Actions and UI wiring, consistent with this project's established split (pure `lib/*.ts` gets Vitest; Server-Action-driven UI gets live quickstart verification).

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV.

**Project Type**: Web app (single existing Next.js project — one migration, one new lib module, one new Server Actions file, two new components, one new admin page, two modified existing components).

**Performance Goals**: Period generation is a small, bounded loop (origin date to today, at most a few hundred iterations even for a daily cadence over several years) — negligible.

**Constraints**: MUST NOT alter any pre-existing week (spec FR-007). MUST fall back cleanly to free-text entry when no cadence exists (FR-009) — this feature must not become a hard blocker for week creation if it isn't configured yet. MUST NOT weaken the existing overlap-prevention rule in `createWeek` (only improve its error message).

**Scale/Scope**: One new table (small — at most a handful of rows: one global + one per work type, ≤7 total), one pure logic module, one new admin screen, two integration points into existing components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ New admin route lives under `app/(app)/admin/cadence/page.tsx`, same route group and convention as `app/(app)/admin/users/page.tsx`.
- **II. Server Actions & Supabase Client Boundary**: ✅ All reads/writes to `week_cadences` go through new Server Actions (`app/actions/cadence.ts`), using `createServiceClient()` server-side only, same pattern as every other mutating action in this codebase.
- **III. Storage-Agnostic File Persistence**: N/A — no file uploads involved in this feature.
- **IV. Thai-First, Mobile-First UI**: ✅ New admin screen and `WeekPeriodPicker` use Thai copy throughout; `WeekPeriodPicker` is designed mobile-first (a simple select/list works identically on phone and desktop, unlike the drag-heavy UI in specs/015).
- **V. Resilient Async UX**: ✅ Cadence save/remove actions show loading/error states via the same toast + `useTransition` pattern already used by `AddWeekButton.tsx`/`AccountMenu.tsx`.
- **VI. Tailwind-Only Styling**: ✅ No new styling system.
- **VII. Multi-User Auth with Role-Based Access Control**: ✅ FR-008 — cadence configuration (`app/actions/cadence.ts` write actions) requires `requireRole("admin")`, matching the existing admin-only bar for other sitewide configuration (`app/actions/users.ts`); reading the effective cadence (to render the picker) requires only `editor`, matching the existing bar for week creation itself.
- **VIII. Universal File Attachments**: N/A — no file attachments in this feature.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/016-recurring-period-generator/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — the interfaces this feature exposes are Server Actions, documented in data-model.md's "Server Actions" section, consistent with how specs/007/008/015 (also Server-Action-only) handled this.

### Source Code (repository root)

```text
supabase/migrations/
└── 0008_week_cadences.sql         # NEW: week_cadences table + RLS policy (same "authenticated" policy shape as 0002_rls.sql; real authorization is the Server Action's requireRole check, same split as every other table)

lib/
└── period-generator.ts            # NEW: pure logic — generatePeriods(cadence, upToDate), month/year clamping, unit-tested

app/actions/
└── cadence.ts                     # NEW: getEffectiveCadence(workTypeId) [editor+], setGlobalCadence/setWorkTypeCadence/removeWorkTypeCadence [admin]

app/(app)/admin/cadence/
└── page.tsx                       # NEW: admin-only screen — sitewide cadence form + per-work-type override list, same role-gate pattern as app/(app)/admin/users/page.tsx

components/
├── WeekPeriodPicker.tsx           # NEW: renders the generated period list (or falls back to free-text start/end date inputs when no cadence exists) — the single shared component both integration points use
├── CadenceForm.tsx                 # NEW: the interval/unit/origin-date input group, used by app/(app)/admin/cadence/page.tsx for both the sitewide form and each work-type override row
├── AddWeekButton.tsx               # MODIFIED: its two <Input type="date"> fields become a WeekPeriodPicker
└── UploadDateRangePicker.tsx       # MODIFIED: becomes a WeekPeriodPicker using the sitewide cadence specifically (research.md Decision — this picker runs before a work type is chosen in the bulk-upload flow, so a per-work-type override cannot apply here)

app/actions/photos.ts               # MODIFIED: createWeek's overlap-rejection branch now includes the conflicting week's own date range in the message (FR-006) — no change to the overlap-detection logic itself
```

**Structure Decision**: Single Next.js project, additive except for two modified existing components (`AddWeekButton.tsx`, `UploadDateRangePicker.tsx`) and one modified error message in `app/actions/photos.ts`. One new migration, following the existing numbered-migration convention (`0008` after `0007_add_doors_work_type.sql`).

## Complexity Tracking

*No violations — this section is intentionally empty.*
