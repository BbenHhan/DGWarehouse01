# Feature Specification: Document Group Field & Pixel-Mode Control Polish

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "ปุ่มเลือกหมวดย่อยในรายการเอกสารอ่ะ dropdown ทำให้เข้ากับ UI หน่อยได้ไหม ตอนนี้มันน่าเกลียดอ่ะ" — the account holder flagged the document upload form's "หมวดย่อย/กลุ่ม" (sub-category/group) field as an ugly dropdown that doesn't match the rest of the UI.

Root cause found: that field (`components/DocUploader.tsx`) is a plain `<input list="...">` wired to a native `<datalist>` — a browser-native suggestion popup that can't be styled with CSS at all, unlike every other dropdown/select in the app (which use the custom-styled `components/ui/select.tsx`). Separately, the app's custom `Select`/`Input` controls use `rounded-lg`, which Pixel mode's staircase-corner/chunky-border treatment (specs/033/034) never covered (only `rounded-xl`/`rounded-2xl`/`rounded-full`) — so in Pixel mode specifically, every form control looks visually inconsistent with the cards/badges around it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The document group field looks and feels like the rest of the app (Priority: P1)

**Why this priority**: This is the literal complaint — a native, unstyleable browser popup sitting inside an otherwise fully custom-designed app.

**Independent Test**: Open the document upload form; type into the "หมวดย่อย/กลุ่ม" field; confirm the suggestion list that appears is styled consistently with the app's other dropdowns (rounded corners, matching colors, no native browser chrome), while still accepting an entirely new, unlisted value when typed.

**Acceptance Scenarios**:

1. **Given** the document upload form, **When** the group field is focused, **Then** a custom-styled suggestion popup appears (not a native browser datalist popup).
2. **Given** existing group names, **When** the user types a partial match, **Then** matching suggestions are shown, filtered as they type.
3. **Given** no existing group matches what's typed, **When** the field is submitted as-is, **Then** the typed value is still accepted as a brand-new group (unchanged from today's behavior — specs/025).

### User Story 2 - Every form control matches Pixel mode's look, not just cards (Priority: P2)

**Why this priority**: specs/033/034's Pixel mode redesign covered cards/badges but missed the smaller, equally-visible form controls (selects, text inputs) — leaving them looking like a leftover from a different theme.

**Independent Test**: Switch to Pixel mode; open any form with a select or text input (document upload, edit dialog); confirm those controls show the same staircase-corner treatment as the surrounding cards.

**Acceptance Scenarios**:

1. **Given** Pixel mode, **When** a select/dropdown trigger or text input is viewed, **Then** it shows staircase-cut corners consistent with nearby cards.
2. **Given** Light, Dark, or Minimal mode, **When** the same controls are viewed, **Then** they are unchanged from before this feature.

## Requirements *(mandatory)*

- **FR-001**: The document group field MUST use a custom-styled suggestion popup consistent with the app's other dropdowns, not a native browser datalist popup.
- **FR-002**: The group field MUST continue to accept a typed value that doesn't match any suggestion (specs/025's free-text grouping is unchanged).
- **FR-003**: In Pixel mode, `rounded-lg`-scale controls (selects, text inputs) MUST receive the same staircase-corner treatment already applied to `rounded-xl`/`rounded-2xl`/`rounded-full` elements.
- **FR-004**: Light, Dark, and Minimal modes MUST be visually unchanged by this feature.

## Success Criteria *(mandatory)*

- **SC-001**: No native, unstyleable browser popup remains anywhere in the document upload/edit flow.
- **SC-002**: In Pixel mode, a form and its surrounding cards read as one consistent visual style.

## Assumptions

- Only the one native-datalist field found (`DocUploader.tsx`'s group field) needed replacing — every other dropdown in the app already uses the custom `Select` component (confirmed by inspection: `EditModal.tsx`'s category/room-move select already does).
