# Implementation Plan: Week Date-Range Input & Card-Style Week UI

**Branch**: `002-week-date-range-ui` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-week-date-range-ui/spec.md`

## Summary

Replace the week's user-facing "order number" with a required start/end date range,
entered when a week is created. Weeks are always displayed in chronological order
derived from their dates (never a manually-assigned index), and the week timeline
renders each week as a rectangular info card (date range + has-files signal + selected
state) instead of a small circular "W{N}" dot. This is a refinement of the existing
Week entity and its two consuming components (`AddWeekButton`, `WorkTypeWeekNav`) — no
new module, no new storage backend, no auth/routing changes.

## Technical Context

**Language/Version**: TypeScript 5 (Next.js 15 App Router, existing project — unchanged)

**Primary Dependencies**: Next.js 15, React 19, Zod (validation), existing shadcn/ui
primitives (Dialog, Input, Button) — no new dependency required; native
`<input type="date">` is used for date entry (per spec Assumption: "standard
date-picker inputs", no custom calendar widget).

**Storage**: Unchanged — `DATA_SOURCE` flag still selects local (disk JSON store) /
mock (read-only v7 folder) / Supabase (not live). This feature changes the *shape* of
the `Week` entity and how it's created, not which backend is active.

**Testing**: Manual verification via the Claude Preview browser tool (project has no
automated test runner configured) — `tsc --noEmit` and `next lint` for static
correctness, plus live create/sort/render checks per `quickstart.md`.

**Target Platform**: Web (Next.js dev server + eventual Vercel deployment), mobile-first per Constitution IV.

**Project Type**: Web application (single Next.js project — no separate frontend/backend split).

**Performance Goals**: N/A beyond existing app — this is a small data-shape + UI change, not a performance-sensitive path.

**Constraints**: Must not require a live Supabase project to build/verify (none exists yet — see Constitution III). Must not break the "mock" backend's existing read-only v7 folder display, which has no real start/end date data to draw from.

**Scale/Scope**: Single entity (`Week`), 2 Server Actions touched (`createWeek`; `editPhoto`'s "move to week" picker label), 2 components rewritten (`AddWeekButton`, `WorkTypeWeekNav`), 3 data-layer files touched (`lib/types.ts`, `lib/local/store.ts`, `lib/mock/source.ts`), 1 validation schema added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only** — ✅ No new routes/routers; existing `app/actions/photos.ts` Server Action and existing components are modified in place.
- **II. Server Actions & Supabase Client Boundary** — ✅ `createWeek` remains a Server Action; the local backend's `localCreateWeek` remains the only place that writes `.local-data/db.json` directly, same boundary as today.
- **III. Storage-Agnostic File Persistence with a Cloud Migration Path** — ✅ Not implicated: this feature changes the `Week` data entity's shape, not file storage. The three data backends (local/mock/Supabase) continue to expose the same `Week` shape to components (see Data Model — new fields are additive and nullable, so no backend is forced into a shape it can't honestly populate).
- **IV. Thai-First, Mobile-First UI** — ✅ Date range display stays Thai-formatted (matching existing label conventions, e.g. "8 มิ.ย. 2569 – 15 มิ.ย. 2569"); card layout is designed mobile-first, same horizontal-scroll container as today.
- **V. Resilient Async UX** — ✅ The add-week form is a Server Action call through the existing `useTransition` pattern already used by `AddWeekButton`/`PhotoUploader`; validation errors surface via the existing `toast.error` pattern.
- **VI. Tailwind-Only Styling** — ✅ Card styling reuses existing Tailwind utility patterns already established for the work-type selector chips; no inline styles introduced.
- **VII. Single-User Auth via Supabase** — ✅ Not implicated.
- **VIII. Universal File Attachments** — ✅ Not implicated (no new upload surface); existing week-scoped upload/edit/delete continues to work per FR-008.

No violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-week-date-range-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── server-actions-delta.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Single Next.js project (existing structure, no new top-level directories):

```text
lib/
├── types.ts                     # Week type gains start_date/end_date (nullable)
├── validation.ts                # + createWeekSchema (startDate, endDate)
├── local/store.ts               # localCreateWeek requires dates; sort by start_date
├── mock/source.ts                # weeks continue with start_date/end_date = null
└── data.ts                       # unchanged call-through (already backend-agnostic)

app/actions/photos.ts             # createWeek signature: (roomId, workTypeId, startDate, endDate)

components/
├── AddWeekButton.tsx             # becomes a small dialog form (start date + end date inputs)
└── WorkTypeWeekNav.tsx           # week timeline renders rectangular cards, not circular dots

specs/001-progress-tracker-migration/data-model.md   # Week entity table updated in place
supabase/migrations/0001_schema.sql                  # weeks table: + start_date, end_date columns
```

**Structure Decision**: No new projects/directories. This is a same-project refinement
touching the existing data layer (`lib/`), one Server Action (`app/actions/photos.ts`),
and two existing components (`AddWeekButton`, `WorkTypeWeekNav`). The original feature's
schema/data-model docs are amended in place rather than duplicated, since `Week` is a
single entity with one source of truth regardless of which spec introduced it.

## Complexity Tracking

*No violations — table omitted.*
