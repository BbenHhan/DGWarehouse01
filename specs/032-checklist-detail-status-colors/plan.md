# Implementation Plan: Checklist Detail, Dates, Status, and Room Colors

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Replace the checklist's done/not-done checkbox with a three-state status (Todo/In Progress/Done) at every level (item, sub-item, per-room row), add optional detail/start-date/due-date fields, and color-code every room consistently across the checklist UI using a fixed pastel Tailwind palette approved via a live mockup.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new — native `<input type="date">`/`<select>`, existing `formatThaiDate`.

**Storage**: One migration replacing `is_done` with `status` on both checklist tables and adding `detail`/`start_date`/`due_date` to `checklist_items`.

**Testing**: No new Vitest coverage — same reasoning as specs/028-031, except `rollupChecklistStatus` (a small, pure, easily-testable function) gets a focused unit test since it's exactly the kind of pure logic this project's existing test suite already covers.

**Target Platform**: Same Next.js app.

**Constraints**: Every existing checklist surface (specs/028/029/031) must keep working with the new status model — this is a replacement of `is_done`, not an addition alongside it.

**Scale/Scope**: One migration, one new shared status-rollup module, one new room-colors module, Server Action signature changes, two `lib/data.ts` functions, two components' rendering + forms.

## Constitution Check

- **I. App Router Only**: ✅ No new routes.
- **II. Server Actions & Supabase Client Boundary**: ✅ All mutations stay in `app/actions/checklist.ts`.
- **IV. Thai-First, Mobile-First**: ✅ Status labels ("ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"), dates via the existing Thai formatter.
- **V. Resilient Async UX**: ✅ Status changes reuse the existing `useOptimistic`/`toast` pattern, extended from boolean to 3-way.
- **VI. Tailwind-Only Styling**: ✅ Room colors are a static Tailwind-class lookup (research.md Decision 3), not inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ `setChecklistItemStatus`/`setChecklistItemRoomStatus` gate on `requireRole("editor")`, same as every prior checklist mutation.
- **VIII. Universal File Attachments**: N/A — unchanged.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/032-checklist-detail-status-colors/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0013_checklist_status_detail_dates.sql   # NEW

lib/
├── types.ts                    # MODIFIED — ChecklistStatus, ChecklistItem gains detail/status/dates/room_statuses
├── checklist-status.ts          # NEW — rollupChecklistStatus
├── room-colors.ts               # NEW — slug-keyed Tailwind class lookup + STATUS_COLORS
├── database.types.ts            # MODIFIED — status/detail/dates on both checklist tables
├── data.ts                      # MODIFIED — status-based filtering/joins
└── local/store.ts                # MODIFIED — status-based logic, rollupChecklistStatus reused

app/actions/checklist.ts        # MODIFIED — addChecklistItem takes an input object; toggle* renamed to set*Status; editChecklistItem gains detail/dates

components/
├── ChecklistList.tsx            # MODIFIED — status controls/badges, detail/date display, add-form/edit-dialog fields, room colors
└── RoomChecklistBox.tsx          # MODIFIED — room-tinted box/rows, due-date display, status control

tests/
└── checklist-status.test.ts     # NEW — rollupChecklistStatus unit tests
```

**Structure Decision**: Extends the existing three-layer shape (Server Action / `lib/data.ts` / component); two small new shared modules (`checklist-status.ts`, `room-colors.ts`) factor out logic reused by both the client (optimistic UI) and server (actions/data layer).
