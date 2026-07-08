# Implementation Plan: Delete Week

**Branch**: `003-delete-week` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-delete-week/spec.md`

## Summary

Add a delete control to each week card (from 002-week-date-range-ui's card UI),
gated behind a confirmation dialog matching the existing photo/document delete
pattern. Deleting a week cascades to delete every file that belonged to it (DB row
+ underlying stored file). If the deleted week was the one currently being viewed,
the existing "no matching week → fall back to most recent remaining" logic already
in the room/work-type page handles reselection with no new code needed there.

## Technical Context

**Language/Version**: TypeScript 5 (Next.js 15 App Router, existing project — unchanged)

**Primary Dependencies**: Existing shadcn/ui `AlertDialog` (already used by
`PhotoGrid`/`DocList` for delete confirmation) and `Button` — no new dependency.

**Storage**: Unchanged — `DATA_SOURCE` still selects local/mock/Supabase. This
feature adds a delete operation to the existing `Week` entity's lifecycle; no shape
change.

**Testing**: Manual verification via the Claude Preview browser tool (no automated
test runner in this project) — `tsc --noEmit`, `next lint`, and live scenarios in
`quickstart.md`.

**Target Platform**: Web (Next.js dev server), mobile-first per Constitution IV.

**Project Type**: Web application (single Next.js project).

**Performance Goals**: N/A — single-user tool, no performance-sensitive path.

**Constraints**: Must not leave orphaned photo rows or orphaned files on disk after
a week is deleted (FR-004). Must not break the currently-viewed page when the
viewed week is the one deleted (FR-005).

**Scale/Scope**: 1 new Server Action (`deleteWeek`), 1 new local-store function
(`localDeleteWeek`), 1 new small client component (`DeleteWeekButton`), 1 existing
component restructured (`WorkTypeWeekNav`'s card markup, to host the new button
without nesting a `<button>` inside the existing `<Link>`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only** — ✅ No new routes; existing Server Action file extended.
- **II. Server Actions & Supabase Client Boundary** — ✅ `deleteWeek` is a Server
  Action, following the exact branch structure (`DATA_SOURCE === "local"` vs
  Supabase) already used by `deletePhoto`/`deleteDoc`/`createWeek`.
- **III. Storage-Agnostic File Persistence with a Cloud Migration Path** — ✅ Both
  backends must delete the underlying stored file for every photo in the week, not
  just the DB/JSON row — mirrors how `deletePhoto` already handles this per backend.
- **IV. Thai-First, Mobile-First UI** — ✅ Confirmation dialog text in Thai; delete
  control sized/placed consistently with existing mobile-first card layout.
- **V. Resilient Async UX** — ✅ Confirmation-before-destructive-action (already
  mandated by this principle and already the pattern for photo/doc delete) is the
  core mechanism this feature reuses; loading state via existing `useTransition`.
- **VI. Tailwind-Only Styling** — ✅ Reuses existing utility classes/`Button`
  variants (`variant="destructive"`, `size="icon-sm"`) already defined.
- **VII. Single-User Auth via Supabase** — ✅ Not implicated.
- **VIII. Universal File Attachments** — ✅ Not implicated (no new upload surface).

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-delete-week/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── server-actions-delta.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
lib/local/store.ts                 # + localDeleteWeek(weekId): cascades to photos + files
app/actions/photos.ts              # + deleteWeek Server Action (local + supabase branches)
components/DeleteWeekButton.tsx    # new — small client component: AlertDialog + trash icon
components/WorkTypeWeekNav.tsx     # week card markup restructured to host the delete button
                                    # without nesting <button> inside the existing <Link>
```

**Structure Decision**: No new projects/directories. Same-project addition to the
existing data layer, one Server Action, and the week-card component introduced in
002-week-date-range-ui.

## Complexity Tracking

*No violations — table omitted.*
