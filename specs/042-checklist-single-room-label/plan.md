# Implementation Plan: Checklist Items Always Name Their Room

**Branch**: `feature/040-editable-document-taxonomy` (see Branching note) | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-checklist-single-room-label/spec.md`

## Summary

The sitewide checklist renders a room's identity twice over for items with two or more
rooms — icon, name, and a tinted row each — and not at all for items with exactly one,
where the only trace is a colour on the status control. The fix removes the special case:
an item with rooms lists them, and the count of rooms is the only thing that varies.

The room's own page gets the same treatment by the account holder's decision, and every
item with rooms keeps the overall-status badge so the badge stops being an accidental
signal about how many rooms an item has.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Tailwind CSS v4, shadcn/ui on Base UI primitives. No new dependency.

**Storage**: none — no table, column, migration, or stored file changes

**Testing**: Vitest with Testing Library; component tests under jsdom via a per-file docblock

**Target Platform**: mobile browsers first (375 px)

**Project Type**: web application

**Performance Goals**: none specific; this is a rendering change

**Constraints**: no horizontal scrolling at 375 px with a long room name (FR-007); status
writes must continue to reach the same room (FR-003)

**Scale/Scope**: 2 components, no new files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Note |
|---|---|---|
| I. App Router Only | PASS | no routing change |
| II. Server Actions & Supabase Client Boundary | PASS | no new data access; the same actions are called with the same arguments |
| III. Storage-Agnostic File Persistence | PASS | no files involved |
| IV. Thai-First, Mobile-First UI | PASS | room names are already Thai; FR-007 and SC-004 make 375 px a hard constraint |
| V. Resilient Async UX | PASS | the status controls keep the busy states added in feature 041 |
| VI. Tailwind-Only Styling | PASS | reuses the existing room-colour classes |
| VII. RBAC | PASS | `canEdit` still gates every control; naming a room reveals nothing a viewer could not already see |
| VIII. Universal File Attachments | PASS | not applicable |

**Gate result: PASS.**

**Post-design re-check**: unchanged. The one risk worth naming is accessibility rather than
a principle breach — FR-006 exists because the current single-room design conveys the room
by colour alone, which fails for a reader who cannot distinguish those tints. This feature
removes that dependence rather than adding to it.

## Phase 0: Research

**Decision**: Delete the `multiRoom` branch in the row rather than adding a name to the
one-room branch.

**Rationale**: The component currently holds two renderings of the same idea, and the bug
is that they diverged. Adding a name to the one-room branch would leave two renderings to
keep in step, and the next change would diverge again. One rendering, driven by the list of
rooms, cannot.

**Alternatives considered**: Adding an icon and name beside the existing one-room control —
rejected, it satisfies FR-001 but not FR-002 or SC-005, and leaves the duplication in place.

**Decision**: On the room page, name the room on each row using the same icon-and-name
presentation.

**Rationale**: FR-009, decided by the account holder. The concern that this repeats the same
name down the column was raised at clarification and the decision stands.

**Decision**: An item with no rooms keeps its direct status control and gains nothing.

**Rationale**: FR-004. There is no room to name, and a badge duplicating the control beside
it would be noise.

## Phase 1: Design

No data model changes — this feature reads `room_ids` and `room_statuses`, both of which
already exist and are already populated for one-room items.

### Contract

The row's rendering becomes a single function of the item:

| Item has | Renders |
|---|---|
| no rooms, no sub-items | the status control on its own, unchanged (FR-004) |
| no rooms, with sub-items | the derived-status badge alone, unchanged |
| one or more rooms | the overall-status badge (FR-008), then one tinted row per room carrying its icon, its name, and its status control (FR-001, FR-002, FR-005) |

A room that no longer exists renders its stored identifier in place of a name, as it does
today, rather than breaking the row.

### Source code

```text
components/
├── ChecklistList.tsx      # CHANGED — collapse the one-room and multi-room branches into one
└── RoomChecklistBox.tsx   # CHANGED — name the room on each row (FR-009)
```

## Risks

| Risk | Mitigation |
|---|---|
| A one-room item's status write is redirected to the wrong room by the refactor | FR-003; T005 tests that the action receives the same room id as before |
| `room_statuses` turns out not to be populated for one-room items, so the new rendering shows nothing | T001 verifies this against the data layer before the refactor, not after |
| A long room name breaks the row at 375 px | FR-007; the multi-room row already handles this and is what one-room items now use |

## Branching note

Features 040 and 041 are still unmerged — 29 commits, and `main` runs code that reads a
column the 040 migration dropped. This feature touches components those commits changed, so
it continues on the same branch.
