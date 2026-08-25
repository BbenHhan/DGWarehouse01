# Feature Specification: Pixel Mode Palette & Staircase Corners

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: A multi-round live-mockup exploration of Pixel mode (specs/033's fourth theme), converging on: a bold primary-color palette (blue/yellow/red family) instead of Minimal's peach/pink; genuine pixel-art "staircase" corners (a stepped clip-path cut, not rounded or plain square) instead of the soft-rounded or simple-square corners tried earlier; a pastel-yellow page background; the big room checklist box always yellow; and nine mutually-distinct colors — one each for Todo/In Progress/Done status and one each for the six real rooms (ห้องแรก, ห้องกลาง, ห้องซอย 1-4) — with every room chip's text rendered in one consistent dark color regardless of its background.

Clarified across the mockup rounds:
1. Rounded corners were tried and rejected ("โบราณไป" / too old-fashioned in the font sense, and separately too soft for the "pixel" identity) — settled on staircase clip-path corners.
2. A genuine 8-bit pixel font (Press Start 2P) has no Thai glyphs, so it can only decorate short English/numeric accents (brand name, stat counts, status codes) — Thai body text stays on the existing Mitr font from specs/033. The account holder accepted this constraint.
3. Nine colors must all be mutually distinct: Todo, In Progress, Done (status) plus all six rooms — no two of the nine share a color.
4. Room chip/row text is one consistent color across all six rooms (not individually contrast-matched per background) for a uniform "sticker" look.
5. The room/work-type page's big checklist box is always yellow in Pixel mode specifically, independent of which room's page it's on (the per-item/per-room chips inside it still use their own distinct room colors).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pixel mode actually looks like pixel art, not a rounded pastel card with different corners (Priority: P1)

**Why this priority**: This is the whole point of the multi-round exploration — the account holder tried rounded and plain-square corners and explicitly asked for genuine pixel-style edges instead.

**Independent Test**: Switch to Pixel mode; confirm every card/badge shows a stepped, staircase-cut corner (not a smooth curve, not a plain right angle) on all four corners.

**Acceptance Scenarios**:

1. **Given** Pixel mode is active, **When** any card-shaped surface (checklist item, document row, dialog) is viewed, **Then** its corners are stepped/staircase-cut.
2. **Given** Pixel mode is active, **When** a small pill-shaped badge (status/room chip) is viewed, **Then** it shows the same staircase-corner treatment at a smaller step size, not a fully rounded pill.

### User Story 2 - Nine mutually-distinct colors for status and rooms, only in Pixel mode (Priority: P1)

**Why this priority**: The whole reason for redoing the palette was to make status and every individual room visually distinguishable at a glance — reusing colors between any two of the nine would defeat that.

**Independent Test**: In Pixel mode, view a multi-room checklist item's per-room rows and the sitewide status badges together; confirm all nine (3 status + 6 room) colors are visually distinct from one another, and every room's own text stays the same dark color regardless of that room's background color.

**Acceptance Scenarios**:

1. **Given** Pixel mode, **When** Todo/In Progress/Done are shown together, **Then** each has its own color, distinct from the other two and from all six room colors.
2. **Given** Pixel mode, **When** all six rooms' chips/rows are shown together, **Then** each room has its own color, distinct from the other five and from all three status colors.
3. **Given** Pixel mode, **When** any room's chip/row is viewed, **Then** its text is the same dark color used by every other room's chip/row (not individually tuned per background).
4. **Given** any other mode (Light/Dark/Minimal), **When** the same content is viewed, **Then** room/status colors are unchanged from specs/031/032's existing behavior — this palette is Pixel-only.

### User Story 3 - Pixel mode's page background is pastel yellow, and the room checklist box always reads as "the yellow box" (Priority: P2)

**Why this priority**: A distinct, recognizable page background and a consistently-colored primary container reinforce Pixel mode's own visual identity, separate from the room-color system layered on top of it.

**Independent Test**: Switch to Pixel mode on any page; confirm the page background is pastel yellow. Visit two different rooms' pages; confirm the big checklist box is yellow on both, regardless of which room it belongs to.

**Acceptance Scenarios**:

1. **Given** Pixel mode, **When** any page is viewed, **Then** the page background is pastel yellow.
2. **Given** Pixel mode, **When** a room's checklist box is viewed, **Then** the box itself is yellow, while the individual room-tagged rows/chips inside it keep their own distinct room colors.

### Edge Cases

- A room not in the six-room list (should one ever be added) falls back to a neutral color, not a color collision with an existing room or status.
- Every other theme (Light/Dark/Minimal) keeps today's existing room/status colors exactly as they are — none of this is a global change.

## Requirements *(mandatory)*

- **FR-001**: In Pixel mode, every card-shaped surface (`rounded-xl`/`rounded-2xl` scale) MUST render with stepped, staircase-cut corners instead of rounded or plain-square ones.
- **FR-002**: In Pixel mode, every pill-shaped badge/chip MUST render with the same staircase-corner treatment at a proportionally smaller step size.
- **FR-003**: In Pixel mode, Todo, In Progress, Done, and all six rooms (ห้องแรก, ห้องกลาง, ห้องซอย 1-4) MUST each have their own color, with no two of these nine sharing a color.
- **FR-004**: In Pixel mode, every room's chip/row text MUST render in one consistent color, regardless of which room's background color it sits on.
- **FR-005**: In Pixel mode, the page background MUST be pastel yellow.
- **FR-006**: In Pixel mode, the room/work-type page's checklist box MUST always be yellow, independent of the current room — the per-room chips/rows inside it are unaffected and keep their own distinct colors.
- **FR-007**: Light, Dark, and Minimal modes MUST keep their existing room/status colors from specs/031/032 unchanged — this palette applies to Pixel mode only.

### Key Entities

- **Theme-scoped color token**: a room or status color that now resolves differently depending on the active theme (previously theme-agnostic, specs/031/032) — nine such tokens for Pixel mode specifically, the existing values retained for the other three modes.

## Success Criteria *(mandatory)*

- **SC-001**: Pixel mode is immediately recognizable as pixel-art styled from its corners alone, in a side-by-side comparison with the other three modes.
- **SC-002**: Every status and every room can be told apart by color alone while in Pixel mode, with no two of the nine colors close enough to cause confusion.

## Assumptions

- The pixel font (Press Start 2P) is out of scope for this feature's actual implementation — the account holder accepted that it can't cover Thai text, and no specific request to wire it into real components followed that clarification; this feature focuses on the settled corners + 9-color palette + yellow background/box, which were the concrete, repeated asks.
- "Staircase corners" apply via the same broad, already-shared Tailwind radius classes (`rounded-xl`, `rounded-2xl`, `rounded-full`) specs/033 already hooked into for Pixel mode's border/shadow treatment — not a per-component rewrite.
