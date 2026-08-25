# Feature Specification: Dark Mode Contrast Fix

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "ส่วน dark mode ช่วยให้ให้ดูอ่านง่ายหน่อย สีพื้นหลังกับสีฟรอนต์บางอันมันไม่ contrast กันเลย มันมองไม่เห็น แต่คุณอย่าลืมว่าขึ้นชื่อว่า dark mode มันไม่ควรมีสีแสบตา" — the account holder reported some background/text color pairs in Dark mode (Site Ops) have too little contrast to read, while also warning against overcorrecting into harsh, glaring ("แสบตา") colors — dark mode should stay easy on the eyes.

Root cause found: specs/032/034/036's room and status colors were only ever given Light-appropriate pastel values (very pale backgrounds, e.g. `#f0f9ff`, with darker text) — Dark mode (specs/033) reused those exact same values verbatim rather than getting its own dark-appropriate set. The result is small, near-white chips sitting inside an otherwise dark UI: glaring by themselves, and not actually chosen for contrast against a dark surface.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every room/status color is legible and comfortable in Dark mode (Priority: P1)

**Independent Test**: Switch to Dark mode; view every room chip/row and status badge/select together; confirm each has clearly readable text against its own background, and none of them reads as a stark, glaring bright patch against the dark page.

**Acceptance Scenarios**:

1. **Given** Dark mode, **When** any room or status color is viewed, **Then** its own background is a muted, dark-appropriate tone (not a near-white pastel) with text that's comfortably readable against it.
2. **Given** Dark mode, **When** compared to Light/Minimal/Pixel, **Then** the same nine room/status slots are recognizably related in hue but not identical brightness — Dark mode's palette is tuned for a dark surface, not copy-pasted from a light one.
3. **Given** Dark mode's general text (e.g. muted/secondary text on secondary surfaces), **When** viewed, **Then** it's comfortably readable, not just barely passable.

### Edge Cases

- Dark mode's fix must not introduce neon/oversaturated colors — the account holder explicitly asked to avoid that while fixing contrast.
- Light, Minimal, and Pixel modes are unaffected.

## Requirements *(mandatory)*

- **FR-001**: Dark mode MUST have its own room/status color values (backgrounds and text), not the same values reused from Light/Minimal/Pixel.
- **FR-002**: Every Dark-mode room/status background/text pair MUST have clearly adequate contrast for reading small UI text.
- **FR-003**: Dark mode's colors MUST remain muted/comfortable — no bright, saturated, "eye-searing" fills, consistent with what a dark theme is expected to feel like.
- **FR-004**: Light, Minimal, and Pixel modes MUST be unaffected by this feature.

## Success Criteria *(mandatory)*

- **SC-001**: Every piece of text in Dark mode is comfortably readable against its background at a glance.
- **SC-002**: Dark mode still feels calm/dark overall — no color reads as jarring or glaring.

## Assumptions

- "General text contrast" beyond the room/status colors (e.g. `--muted-foreground` against `--secondary`) gets a small companion brightening pass in the same feature, since it's the same underlying complaint (dark-mode legibility) even though it wasn't named as precisely as the room/status colors were.
