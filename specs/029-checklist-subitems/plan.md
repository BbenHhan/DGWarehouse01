# Implementation Plan: Checklist Sub-Items

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Extend `checklist_items` (specs/028) with a self-referencing, nullable `parent_id` so any top-level item can have its own one-level breakdown of sub-items — same fields as a top-level item (text, done state, independent room tags). Toggling stays consistent both ways: finishing every sub-item auto-completes the parent and reopening any sub-item auto-reopens the parent; toggling the parent directly cascades to every sub-item. `ChecklistList` (`/checklist`) and `RoomChecklistBox` (room/work-type pages) both render sub-items nested under their parent, with `RoomChecklistBox`'s set filtered to the sub-items actually relevant to that room.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new — reuses the same `components/ui/dialog.tsx`/`input.tsx`/`button.tsx` pieces `ChecklistList`/`RoomChecklistBox` already use (specs/028).

**Storage**: One additive column + index on the existing `checklist_items` table (see data-model.md); no new tables.

**Testing**: No new Vitest coverage — same reasoning as specs/028 (CRUD/UI wiring plus a small amount of derived-state logic in a Server Action, verified via `tsc`/`lint`/dev-server compile rather than unit tests).

**Target Platform**: Same Next.js app.

**Constraints**: Must not change specs/028's existing top-level-item behavior for items that have no sub-items (spec User Story 2, Acceptance Scenario 3) — every change here is additive.

**Scale/Scope**: One migration, one extended type, two extended Server Actions (`addChecklistItem`, `toggleChecklistItem`) plus their shared auth/validation helpers untouched, two extended `lib/data.ts` functions, two extended components. No new routes, no new nav entries.

## Constitution Check

- **I. App Router Only**: ✅ No new routes — extends existing `/checklist` and room/work-type pages.
- **II. Server Actions & Supabase Client Boundary**: ✅ The new auto-sync logic (parent↔sub-item) lives inside `toggleChecklistItem` in `app/actions/checklist.ts`, using `createServiceClient()` like every other mutation.
- **IV. Thai-First, Mobile-First**: ✅ New UI text ("+ เพิ่ม sub" quick-add) in Thai; nested rows use the same responsive card layout already in place, just indented — no new breakpoint behavior needed.
- **V. Resilient Async UX**: ✅ Sub-item add/toggle/edit/delete reuse `ChecklistList`/`RoomChecklistBox`'s existing `useOptimistic`/`toast` patterns, extended to cover nested rows.
- **VI. Tailwind-Only Styling**: ✅ No inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ Sub-item mutations go through the same `assertCanEdit()`/`requireRole("editor")` gate as top-level items; viewers see sub-items read-only (spec FR-008).
- **VIII. Universal File Attachments**: N/A — unchanged from specs/028.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/029-checklist-subitems/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

No `quickstart.md`/`contracts/` — small enough extension of specs/028's existing shape; data-model.md already documents the Server Action contracts.

### Source Code (repository root)

```text
supabase/migrations/
└── 0011_checklist_subitems.sql   # NEW — parent_id column + index

lib/
├── types.ts                       # MODIFIED — ChecklistItem gains parent_id, sub_items
├── database.types.ts               # MODIFIED — checklist_items Row/Insert/Update/Relationships gain parent_id
├── validation.ts                   # MODIFIED — addChecklistItemSchema gains optional parentId
├── data.ts                         # MODIFIED — getChecklistItems/getRoomChecklistItems build the sub_items tree
├── local/store.ts                   # MODIFIED — localAddChecklistItem takes parentId; local getters nest sub_items; toggle auto-sync
└── mock/source.ts                   # UNCHANGED — still returns [] unconditionally

app/actions/checklist.ts            # MODIFIED — addChecklistItem gains parentId param; toggleChecklistItem gains parent/child auto-sync

components/
├── ChecklistList.tsx               # MODIFIED — nested sub-item rows + per-row "add sub" quick-form
└── RoomChecklistBox.tsx             # MODIFIED — nested sub-item rows (pre-filtered by lib/data.ts) + per-parent "add sub" quick-form
```

**Structure Decision**: Pure extension of specs/028's existing three-layer shape (Server Action / `lib/data.ts` branch-by-`DATA_SOURCE` / component) — no new architectural pattern, no new route, no new nav entry.
