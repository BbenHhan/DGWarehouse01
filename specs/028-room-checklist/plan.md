# Implementation Plan: Room Checklist

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

A new `checklist_items` + `checklist_item_rooms` (many-to-many) schema, a new `/checklist` sitewide page listing every item with add/edit/delete/toggle, and a `RoomChecklistBox` sidebar widget on every room/work-type page showing that room's not-done items with its own quick-add + toggle (no navigation required). Room/work-type page layout gains a responsive two-column shape (checklist box beside the existing content on desktop, above the work-type tabs on mobile via CSS `order`).

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new — reuses `components/ui/select.tsx` (multi-select room tagging, via a checkbox-list pattern or a multi-value select — see UI notes), `components/ui/dialog.tsx` (edit modal), `components/ui/input.tsx`/`checkbox` pattern already used elsewhere.

**Storage**: New tables (see data-model.md); no change to existing tables.

**Testing**: No new Vitest coverage — this feature is Server Actions + CRUD UI wiring, not pure date/logic-heavy computation; verified via `tsc`/`lint`/dev-server compile, consistent with Features 019/021/025's similarly-shaped verification.

**Target Platform**: Same Next.js app.

**Constraints**: Must not disturb the existing room/work-type page's photo timeline/filter behavior (Features 018/021) — the checklist box is purely additive to that page's layout.

**Scale/Scope**: New page, new sidebar widget, new Server Action module, new migration (no changes to existing migrations).

## Constitution Check

- **I. App Router Only**: ✅ New `/checklist` route lives under `app/(app)/`, same convention as every other page.
- **II. Server Actions & Supabase Client Boundary**: ✅ All mutations (add/edit/toggle/delete) go through `app/actions/checklist.ts` Server Actions using `createServiceClient()`.
- **IV. Thai-First, Mobile-First**: ✅ All new UI text in Thai; room-page layout explicitly designed mobile-first per spec FR-005 (checklist box above work-type tabs on narrow viewports, CSS `order` utilities).
- **V. Resilient Async UX**: ✅ Toggle uses optimistic UI (`useOptimistic`, same pattern as `PhotoGrid`/`DocList`'s delete); add/edit/delete show pending/error states via `toast`, matching every other mutation in this app.
- **VI. Tailwind-Only Styling**: ✅ No inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ `requireRole("editor")` gates every mutation; viewers get read-only access to both the sitewide page and room boxes (spec FR-008).
- **VIII. Universal File Attachments**: N/A — checklist items have no file attachment; this principle governs modules with files, which this isn't.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/028-room-checklist/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

No `contracts/` — internal Server Actions only, already documented in data-model.md.

### Source Code (repository root)

```text
supabase/migrations/
└── 0010_checklist.sql          # NEW

lib/
├── types.ts                     # MODIFIED — add ChecklistItem type
├── database.types.ts             # MODIFIED — add checklist_items/checklist_item_rooms table types
├── validation.ts                 # MODIFIED — add/edit/toggle/delete checklist schemas
├── data.ts                       # MODIFIED — getChecklistItems, getRoomChecklistItems
├── local/store.ts                 # MODIFIED — local-backend equivalents (room_ids embedded directly, no junction file)
└── mock/source.ts                 # MODIFIED — mock equivalents, both return []

app/actions/checklist.ts          # NEW — addChecklistItem, toggleChecklistItem, editChecklistItem, deleteChecklistItem
app/(app)/checklist/page.tsx       # NEW — sitewide checklist page
app/(app)/photos/[roomSlug]/[workTypeSlug]/page.tsx   # MODIFIED — fetch getRoomChecklistItems, responsive two-column layout, render RoomChecklistBox

components/
├── ChecklistList.tsx             # NEW — sitewide page's add-form + list + edit modal + delete
├── RoomChecklistBox.tsx           # NEW — room-page sidebar widget: quick-add + toggle, no edit/delete
├── Sidebar.tsx                    # MODIFIED — new "เช็คลิสต์" nav link
└── SidebarSwitcher.tsx            # MODIFIED — recognize /checklist for the mobile current-page label
```

**Structure Decision**: New feature area following the exact same three-layer shape (Server Action / `lib/data.ts` branch-by-`DATA_SOURCE` / component) every prior module (photos, documents) already uses — no new architectural pattern introduced.
