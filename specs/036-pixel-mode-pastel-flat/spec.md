# Feature Specification: Pixel Mode — Pastel Palette, Flat Fills

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: The account holder shared a reference icon (a gradient blue-to-teal badge) and asked why Pixel mode's blue/red/yellow primary colors seemed to have "disappeared," pointing out that icon-style backgrounds should be one flat color, not a gradient. Root cause: several icon/accent-bar spots across the app (`Header`'s logo mark and top bar, every page's header icon) use a `from-primary to-primary-2` gradient — with Pixel's bold blue primary and yellow primary-2 (specs/034), that gradient visually blends into a muddy teal/green instead of reading as "blue and yellow." Immediately after this was diagnosed, the account holder decided to simplify further: "งั้น pixel เอาสีพาสเทลให้หมดเลย" (then just make Pixel entirely pastel) — replacing specs/034's bold saturated 9-color palette with pastel versions of the same nine hues, keeping everything else (staircase corners, black borders, distinct-per-room/status colors, yellow checklist box) unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pixel mode's colors read as flat, distinct, pastel hues (Priority: P1)

**Why this priority**: Both parts of the account holder's ask — no more muddy gradients, and pastel instead of bold — are about making colors actually legible and intentional-looking, which was the core complaint.

**Independent Test**: Switch to Pixel mode; view the header logo mark, a page's header icon, and the top accent bar; confirm each is a single flat pastel color, not a gradient. View the nine room/status colors together; confirm they're pastel (soft, light) versions, still nine mutually distinct hues.

**Acceptance Scenarios**:

1. **Given** Pixel mode, **When** any element that used a `from-primary`-style gradient is viewed, **Then** it renders as one flat solid color instead.
2. **Given** Pixel mode, **When** all nine room/status colors are viewed together, **Then** each is a pastel (soft/light) tone, still distinguishable from all eight others.
3. **Given** Pixel mode, **When** a photo grid tile is hovered, **Then** its existing dark caption-legibility scrim is unaffected (that gradient is unrelated to the primary-color accent gradients this feature flattens).

### Edge Cases

- Light, Dark, and Minimal modes are unaffected — gradients keep working exactly as before in those three modes; only Pixel's `from-primary`-style gradients flatten.

## Requirements *(mandatory)*

- **FR-001**: In Pixel mode, every `from-primary`/`to-primary-2`-style gradient accent (logo mark, page header icons, the top accent bar) MUST render as a single flat solid color instead of a gradient.
- **FR-002**: The photo grid's hover caption scrim (an unrelated dark overlay, not a primary-color accent) MUST be unaffected by FR-001.
- **FR-003**: Pixel mode's nine room/status colors (specs/034) MUST all shift to pastel (soft, light) tones while remaining nine mutually distinct hues.
- **FR-004**: Pixel mode's core `--primary`/`--secondary` tokens MUST also become pastel, consistent with FR-003.
- **FR-005**: Light, Dark, and Minimal modes MUST be unaffected by this feature.

## Success Criteria *(mandatory)*

- **SC-001**: Every icon/accent-bar spot in Pixel mode shows one clean, intentional flat color — no muddy in-between blend.
- **SC-002**: Pixel mode reads as a cohesive pastel palette throughout, not a mix of bold and pastel tones.

## Assumptions

- "Everything pastel" (the account holder's follow-up) supersedes specs/034's bold-saturated palette values entirely — the same nine assigned hues (which room/status gets which color) are kept, only softened, since no new mapping was requested.
