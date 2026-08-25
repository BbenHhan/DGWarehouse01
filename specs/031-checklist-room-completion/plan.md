# Implementation Plan: Per-Room Checklist Completion

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Replace specs/030's auto-generated-sub-item-per-room mechanism (never deployed) with completion state living directly on `checklist_item_rooms` (a new `is_done` column). A multi-room item shows one labelled checkbox per tagged room on `/checklist` instead of a shared master checkbox; a room's own checklist box always ticks only that room's own tag. The item's own `is_done` becomes a derived, kept-in-sync cache once it has any room tags, computed from its room-tag rows.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new.

**Storage**: One additive column on the already-existing `checklist_item_rooms` table (migration 0012); no other schema change. specs/030's migration 0011 (`checklist_items.parent_id`) stays — specs/029's manual sub-item feature still needs it.

**Testing**: No new Vitest coverage — same reasoning as specs/028/029/030.

**Target Platform**: Same Next.js app.

**Constraints**: specs/029's manual sub-item breakdown must keep working unchanged (spec FR-006); zero/one-room items must look and behave exactly as before this feature (spec FR-003).

**Scale/Scope**: One migration, one extended type, one new Server Action (plus reverting specs/030's `addChecklistItem` branch), one `lib/data.ts` query simplification, two component rendering changes. No new routes.

## Constitution Check

- **I. App Router Only**: ✅ No new routes.
- **II. Server Actions & Supabase Client Boundary**: ✅ `toggleChecklistItemRoom` lives in `app/actions/checklist.ts`, same boundary.
- **IV. Thai-First, Mobile-First**: ✅ Per-room checkbox labels use each room's existing `name_th`/`emoji`.
- **V. Resilient Async UX**: ✅ Per-room toggles reuse the same optimistic-UI/`toast` pattern already in `ChecklistList`/`RoomChecklistBox`.
- **VI. Tailwind-Only Styling**: ✅ No inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ `toggleChecklistItemRoom` gates on `requireRole("editor")`, same as every other checklist mutation.
- **VIII. Universal File Attachments**: N/A — unchanged.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/031-checklist-room-completion/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0012_checklist_room_completion.sql   # NEW — checklist_item_rooms.is_done

lib/
├── types.ts                              # MODIFIED — ChecklistItem gains room_completions
├── database.types.ts                      # MODIFIED — checklist_item_rooms gains is_done
├── data.ts                                # MODIFIED — getChecklistItems/getRoomChecklistItems read/filter by is_done; specs/030's union logic removed
└── local/store.ts                          # MODIFIED — room_completions equivalent; localToggleChecklistItemRoom; specs/030's extra-parent union removed

app/actions/checklist.ts                  # MODIFIED — addChecklistItem's specs/030 explosion branch removed; new toggleChecklistItemRoom

components/
├── ChecklistList.tsx                      # MODIFIED — per-room checkbox list when room_ids.length >= 2
└── RoomChecklistBox.tsx                    # MODIFIED — always toggleChecklistItemRoom; specs/030's checkbox-suppression logic removed
```

**Structure Decision**: Net simplification relative to specs/030 — removes more than it adds (the union-parent query logic, the sub-item-explosion branch, the checkbox-suppression conditional) in exchange for one new column and one new, narrowly-scoped Server Action.
