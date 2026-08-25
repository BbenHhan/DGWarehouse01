# Feature Specification: Checklist Status Control — Native Select Replaced

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "ปุ่ม todo inprogress done ทำไมไม่มีสีตามที่ตกลงล่ะ แล้วทำไม dropdown ตัวเลือก UI มันน่าเกลียด ทำไมไม่ทำตาม UI อื่น" — the account holder reported that the Todo/In Progress/Done status controls (specs/032) didn't show the agreed colors, and that the dropdown looked ugly and inconsistent with the rest of the app.

Root cause: `StatusSelect` (in `ChecklistList.tsx`) and the two inline status pickers in `RoomChecklistBox.tsx` were plain native `<select>` elements — the exact same class of bug specs/035 already fixed for the document group field. A native select's closed box can take some CSS, but its open dropdown list is unstyleable OS-native chrome, and browsers can silently ignore/override custom background colors on the element itself depending on platform — which is why the agreed colors never reliably showed and the control looked inconsistent with every other (custom-styled) dropdown in the app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Status controls look and are colored like the rest of the app (Priority: P1)

**Independent Test**: Open `/checklist` and a room's checklist box; confirm every status control (item-level, per-room row, sub-item) is colored per specs/032/034/036's design and its dropdown list is custom-styled, not a native OS popup.

**Acceptance Scenarios**:

1. **Given** any status control, **When** it's viewed closed, **Then** it shows the correct room/status color (matching specs/032/034/036).
2. **Given** any status control, **When** it's opened, **Then** the option list is styled consistently with every other dropdown in the app (`Select`), not native browser chrome.
3. **Given** a status is changed, **When** the new value is picked, **Then** behavior is unchanged from before (same optimistic update, same Server Action call).

## Requirements *(mandatory)*

- **FR-001**: Every checklist status control (item-level, per-room, sub-item; both `ChecklistList` and `RoomChecklistBox`) MUST use the app's custom `Select` component, not a native `<select>`.
- **FR-002**: The room/status color classes already defined (specs/032/034/036) MUST render correctly on the new control's closed and open states.
- **FR-003**: No behavior change — the same status-change handlers, optimistic updates, and Server Action calls continue to fire.

## Assumptions

- None beyond what's stated in Input — this is a direct root-cause fix, no new design decisions.
