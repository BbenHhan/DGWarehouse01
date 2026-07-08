# Phase 0 Research: Week Date-Range Input & Card-Style Week UI

## Decision 1: Date input widget

**Decision**: Use two native `<input type="date">` elements (start, end), wrapped in
the existing shadcn/ui `Dialog` (same primitive `AddWeekButton` will be upgraded to
use, matching `EditModal`'s existing dialog pattern).

**Rationale**: The app has no calendar/date-picker dependency today. A native date
input needs zero new dependencies, works on mobile (Constitution IV), and returns an
unambiguous ISO string (`YYYY-MM-DD`) regardless of the browser's display locale —
avoiding any Thai-Buddhist-vs-Gregorian parsing ambiguity in the input itself. Thai
Buddhist-year formatting is only needed for *display* (e.g. "8 มิ.ย. 2569"), which is a
pure presentation concern solved by a small formatting helper, not an input concern.

**Alternatives considered**:
- A third-party date-picker library (e.g. `react-day-picker`) — rejected: adds a
  dependency for a two-field date-range form that native inputs already handle; would
  also need Thai-locale theming work disproportionate to the feature's size.
- Free-text date fields — rejected: unparseable/ambiguous input, fails FR-002/FR-003's
  validation requirements cleanly.

## Decision 2: Storing and sorting by date

**Decision**: Store `start_date` and `end_date` as ISO date strings (`YYYY-MM-DD`) on
the `Week` entity. Sort weeks by `start_date` ascending when present; the "mock"
backend's legacy weeks (no real date fields — see Decision 3) keep sorting by their
existing `week_number` field, unchanged.

**Rationale**: ISO date strings sort correctly with plain string comparison (no date
parsing needed at sort time), are timezone-unambiguous, and match how dates are
already represented in existing `created_at`/`updated_at` fields elsewhere in the
codebase (ISO strings throughout).

**Alternatives considered**:
- Unix timestamp (number) — rejected: no benefit over ISO string for a date-only
  (no time-of-day) value, and loses human-readability when inspecting `db.json`
  directly during development.

## Decision 3: Backward compatibility with the "mock" backend

**Decision**: `start_date`/`end_date` are nullable on the shared `Week` type. The
"mock" backend (`lib/mock/source.ts`, driven by real v7 folder names) continues to
produce weeks with `start_date: null, end_date: null` and its existing `week_number`
+ text `label` (e.g. "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)"). The "local" and future
"supabase" backends always populate real `start_date`/`end_date` on every week they
create (enforced by validation, not by the type system alone). `WorkTypeWeekNav`
renders the new card UI from `start_date`/`end_date` when present, and falls back to
today's `splitWeekLabel` text-parsing when they are absent (mock mode only).

**Rationale**: Per spec Assumption "No migration needed" — the app currently starts
empty in local/supabase mode (per the prior "start empty" pivot), so there is no real
data to migrate. The mock backend is a frozen, read-only historical snapshot of the
old v7 viewer's folder structure; retrofitting real start/end dates would require
parsing Thai month-abbreviation ranges out of folder names (e.g. "30 มิ.ย.-6 ก.ค.
2569" spanning two months) for zero user-facing benefit, since mock mode has no
mutation UI and the user is not looking at it as their primary data source. Making the
fields nullable and giving the UI a documented fallback avoids that parsing work
entirely while keeping both backends honest about what they actually know.

**Alternatives considered**:
- Parse date ranges out of mock folder-name text into real `start_date`/`end_date` —
  rejected: nontrivial Thai-locale, cross-month parsing for a read-only legacy mode
  that isn't the app's current default and has no user-facing form to fill this data
  from anyway.
- Drop `week_number`/`label` entirely and force mock mode to fabricate dates —
  rejected: would require inventing data that was never real, actively worse than
  the existing accurate (if less structured) display.

## Decision 4: What happens to `week_number` going forward

**Decision**: `week_number` remains on the `Week` type (kept for the mock backend's
existing sort/display and as a stable tie-break field), but the "local"/"supabase"
creation path no longer treats it as a user-facing concept — `createWeek` no longer
accepts or auto-increments a meaningful order value for these backends; it is not
rendered or referenced anywhere in the new card UI.

**Rationale**: Removing the field from the type entirely would force every backend
branch and the mock reader to special-case its absence; keeping it as an internal,
unexposed field for non-mock backends is the smallest change that satisfies FR-001/
FR-004 (no user-facing order field, no manual order value) without a wider type-level
refactor across `lib/data.ts`, `lib/local/store.ts`, and `lib/mock/source.ts`.

**Alternatives considered**:
- Remove `week_number` from the type entirely — rejected: larger blast radius for no
  functional gain; the field simply becomes inert/unused outside mock mode.
