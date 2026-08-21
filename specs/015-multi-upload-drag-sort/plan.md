# Implementation Plan: Bulk Multi-File Upload with Drag-to-Categorize

**Branch**: `015-multi-upload-drag-sort` | **Date**: 2026-07-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-multi-upload-drag-sort/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A new page at `/upload` where an editor/admin picks one date range, adds many files into an in-browser "unsorted" tray, then assigns each file (or, on mobile, each tap-selected group) to a room + work type via drag onto room tabs/work-type bins (desktop) or a select-then-choose bottom sheet (mobile). Each assignment resolves-or-creates the target week through the *existing* `createWeek` Server Action (never a parallel implementation of the overlap rule) and uploads through the *existing* `uploadPhoto` Server Action — this feature is a new client-side orchestration layer over two already-built, already-tested Server Actions, plus one new small Server Action to do the "reuse an exact-date-range week if one exists, else create" resolution.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router), React 19.

**Primary Dependencies**: Native HTML5 Drag and Drop API (desktop assignment — no new drag library needed, this project has no existing drag dependency and the interaction is simple single-item drag, not sortable-list reordering); existing `uploadPhoto`/`createWeek` Server Actions (`app/actions/photos.ts`); existing `getRooms`/`getWorkTypes`/`getWeeks` (`lib/data.ts`); existing shadcn/ui primitives (Dialog/Sheet/Button) already in the project.

**Storage**: No new storage — reuses the existing `photos` Storage bucket and `weeks`/`photos` tables exactly as the current single-room upload page does.

**Testing**: Vitest for the pure-logic pieces (the resolve-or-create week-caching logic, the batch-chunking helper) — consistent with this project's existing test coverage (`lib/*.test.ts`). No new Playwright/e2e infra; live-verified via quickstart.md in the browser, consistent with how Features 006-013 were verified.

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV — this feature explicitly requires full mobile parity (User Story 2), not a desktop-only add-on.

**Project Type**: Web app (single existing Next.js project — one new route + a few new components + one new Server Action, no new project).

**Performance Goals**: Each file's upload begins immediately on assignment (FR-006); no batch-wide wait. Standard web-app responsiveness — no specific latency target beyond "feels immediate" (SC-002).

**Constraints**: Must reuse `createWeek`'s existing overlap-rejection behavior verbatim (FR-009) — no second implementation of that rule. Must not exceed `uploadPhoto`'s existing 20-file-per-call batch limit (`lib/validation.ts` `MAX_BATCH_FILES`) — a mobile multi-select assignment of more than 20 files must chunk into multiple calls.

**Scale/Scope**: One new route (`/upload`), 6 rooms × 7 work types of bins (42 possible cells, shown 7 at a time via the active room tab — never all 42 at once), one new Server Action, a handful of new client components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: ✅ New route lives under `app/(app)/upload/page.tsx`, same route group and convention as every other authenticated page.
- **II. Server Actions & Supabase Client Boundary**: ✅ All mutations (week resolution, photo upload) go through Server Actions — the new `resolveWeekForDrop` action alongside the reused `createWeek`/`uploadPhoto`. No client-side direct Supabase writes; files never touch the anon-key client for storage writes.
- **III. Storage-Agnostic File Persistence**: ✅ Uploads go through the existing `uploadPhoto` action unchanged, so both the `local` and `supabase` `DATA_SOURCE` backends keep working with zero changes to this feature's code — it's backend-agnostic by construction (it never talks to storage directly).
- **IV. Thai-First, Mobile-First UI**: ✅ User Story 2 makes mobile parity a P1 requirement, not an afterthought — the tap-select-then-assign interaction is designed mobile-first, with drag-and-drop as the desktop enhancement layered on top, matching this principle's "mobile layouts are not degraded desktop layouts" intent (here, inverted correctly: desktop gets an *additional* gesture, mobile isn't missing one). All new UI copy in Thai.
- **V. Resilient Async UX**: ✅ FR-007 requires an explicit per-file loading and retry-capable error state — directly this principle's requirement, applied per-file rather than per-page since files upload independently.
- **VI. Tailwind-Only Styling**: ✅ No new styling system; existing Tailwind utilities + shadcn/ui components only.
- **VII. Multi-User Auth with Role-Based Access Control**: ✅ FR-011 — page requires `editor` minimum, enforced server-side via the existing `requireRole("editor")` pattern already used by every other mutating Server Action and the admin page's server-side gate.
- **VIII. Universal File Attachments**: ✅ Reuses `uploadPhoto`'s existing MIME/size validation (`lib/validation.ts`) unchanged — no parallel accept-list.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/015-multi-upload-drag-sort/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — the only interface this feature exposes is one new Server Action, documented in data-model.md's "Server Action" section rather than a separate contracts file (consistent with how prior features in this repo, e.g. 007/008, handled Server-Action-only interfaces).

### Source Code (repository root)

```text
app/(app)/upload/
└── page.tsx                       # NEW: server component — role gate + fetches rooms/work types, renders the client orchestrator

components/
├── BulkUploadWorkspace.tsx        # NEW: client component — owns session state (date range, tray, per-bin week-id cache)
├── UploadDateRangePicker.tsx      # NEW: the one-time start/end date input (reuses the same <Input type="date"> pattern as AddWeekButton.tsx)
├── UnsortedFileTray.tsx           # NEW: grid of pending file chips — drag source (desktop) + tap-select (mobile)
├── RoomTabBar.tsx                 # NEW: room tabs — drop target (switches active room) + tap target (mobile room-select step)
├── WorkTypeBinGrid.tsx            # NEW: work-type bins for the active room — desktop drop target
└── MobileSwipeCard.tsx            # NEW (research.md Decision 9, supersedes the original MobileAssignSheet.tsx plan): phone-only one-at-a-time review card with sticky room/work-type selection and a decoupled add action

lib/
└── upload-session.ts              # NEW: pure logic — per-bin week-id cache/in-flight de-dup keyed by `${roomId}::${workTypeId}::${startDate}::${endDate}`, and the >20-files batch-chunking helper (both unit-testable, both used by BulkUploadWorkspace.tsx)

app/actions/photos.ts              # MODIFIED: add `resolveWeekForDrop(roomId, workTypeId, startDate, endDate)` — reuses getWeeks() for the exact-match check, delegates to the existing createWeek() for the create path (no new overlap logic)
```

**Structure Decision**: Single Next.js project, additive only — one new route, six new components (all under the existing flat `components/` convention this repo already uses, no new subdirectory scheme), one new pure-logic lib module, and one new function added to the existing `app/actions/photos.ts` (not a new actions file, since it's three more lines of Server Action alongside the two it directly depends on).

**Amendment (User Story 4, post-launch)**: three existing files gained a role-gated nav entry for `/upload` beyond the original account-menu-only plan — `app/(app)/layout.tsx` (threads `canEdit(user.role)` down), `components/Sidebar.tsx`, `components/SidebarSwitcher.tsx` (research.md Decision 6 amendment). No new files were needed for the tray view-mode toggle or the two-column layout — both are internal restructurings of `components/UnsortedFileTray.tsx`, `components/BulkUploadWorkspace.tsx`, and `components/WorkTypeBinGrid.tsx` (research.md Decisions 7-8). `components/RoomTabBar.tsx` was also revised (`overflow-x-auto` → `flex-wrap`, research.md Decision 12) rather than left as originally shipped.

**Amendment (User Story 2 revision, post-launch)**: `components/MobileAssignSheet.tsx` — in the original plan above — was deleted and replaced by `components/MobileSwipeCard.tsx` after live feedback showed the tap-select-many-then-sheet design couldn't support one photo belonging to more than one room/work-type without an awkward re-select cycle (research.md Decisions 9-11). `components/UnsortedFileTray.tsx` lost its tap-select props (`selectedIds`/`onToggleSelect`) as a result — desktop assignment is drag-only again, since selection existed only to feed the now-removed sheet. `components/BulkUploadWorkspace.tsx`'s `UnsortedFile` type gained `confirmedFor` to support this.

## Complexity Tracking

*No violations — this section is intentionally empty.*
