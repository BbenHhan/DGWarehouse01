# Implementation Plan: Auto Per-Room Checklist Sub-Items

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Adding a top-level checklist item tagged to two or more rooms now auto-generates one sub-item per room (labelled `"{text} #{room}"`) instead of a single item shared across all those rooms — reusing specs/029's existing sub-item/auto-complete mechanism entirely, no new schema. `getRoomChecklistItems` is extended so a room's box can surface a relevant sub-item even when its (now-untagged) parent carries no room tags of its own, and that box stops exposing a parent's own checkbox in cases where ticking it could affect a different room's part.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new.

**Storage**: No schema change — pure logic change over specs/028/029's existing tables.

**Testing**: No new Vitest coverage — same reasoning as specs/028/029 (Server Action logic + data-layer query composition, verified via `tsc`/`lint`/dev-server compile).

**Target Platform**: Same Next.js app.

**Constraints**: Must not change behavior for items tagged to zero or one room (spec FR-003) or break specs/029's existing single-level sub-item editing/toggling.

**Scale/Scope**: One Server Action's internal logic, one `lib/data.ts` query (+ its local-backend equivalent), one component's rendering logic. No new routes, no new types, no new migration.

## Constitution Check

- **I. App Router Only**: ✅ No new routes.
- **II. Server Actions & Supabase Client Boundary**: ✅ All new logic lives inside `app/actions/checklist.ts` and `lib/data.ts`, same boundary as before.
- **IV. Thai-First, Mobile-First**: ✅ No new UI text beyond the generated sub-item labels, which are built from the account holder's own Thai input plus a Thai room name.
- **V. Resilient Async UX**: ✅ No change to the optimistic-UI pattern — the existing `ChecklistList` "add" case already handles a returned item with `sub_items` populated.
- **VI. Tailwind-Only Styling**: ✅ No inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ Unchanged — `addChecklistItem`/`toggleChecklistItem` still gate on `requireRole("editor")`.
- **VIII. Universal File Attachments**: N/A — unchanged.

No violations — Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/030-checklist-multiroom-subitems/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (repository root)

```text
app/actions/checklist.ts       # MODIFIED — addChecklistItem gains the multi-room explosion branch (factored via a private single-row-create helper)
lib/data.ts                     # MODIFIED — getRoomChecklistItems unions direct-tagged parents with parents reachable only via a room-tagged sub-item
lib/local/store.ts               # MODIFIED — localGetRoomChecklistItems gets the equivalent union logic; localAddChecklistItem's caller (the Server Action) drives the same explosion, no store-level change needed there beyond what specs/029 already added
components/RoomChecklistBox.tsx  # MODIFIED — suppress a parent's own checkbox when item.room_ids doesn't include the current room; quick-add-sub now tags explicitly to the current room
```

**Structure Decision**: Pure logic extension of specs/029's existing shape — no new architectural pattern.
