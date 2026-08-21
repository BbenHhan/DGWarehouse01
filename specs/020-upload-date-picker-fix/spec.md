# Feature Specification: Upload Date Picker Fix

**Feature Branch**: `main`

**Created**: 2026-07-28 (retroactively documented 2026-08-21)

**Status**: Implemented

**Input**: Bug report — "ทำไม เลือกวันที่ ใน upload file ไม่ได้" (why can't I select a date on the upload-file page). Reproduced as: the date could be selected, but the input box always displayed empty afterward ("เลือกวันได้ แต่เลือกแล้วไม่ขึ้น/ไม่จำค่า").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Picking a start date shows it immediately, even before an end date is picked (Priority: P1)

**Why this priority**: The bug made the bulk-upload page's date picker look completely broken — a value visibly failing to "stick" erodes trust in the whole page, not just this one field.

**Independent Test**: On `/upload`, open the date picker and select only a start date (leave end blank); confirm the start date field visibly shows the chosen value.

**Acceptance Scenarios**:

1. **Given** neither date field has a value, **When** a start date is picked, **Then** the start date field displays that value immediately, without requiring an end date to also be set.
2. **Given** a start date is already showing, **When** an end date is picked, **Then** both fields correctly display their respective values.

### Edge Cases

- Clearing a date field (browser's native date-input clear control) must be reflected immediately, the same as setting one.

## Requirements *(mandatory)*

- **FR-001**: The date-range picker MUST display whichever date(s) have been chosen at any point, independent of whether the other field also has a value.

## Success Criteria *(mandatory)*

- **SC-001**: Selecting a single date field shows that value with zero additional steps, 100% of the time.

## Assumptions

- This bug was specific to `components/UploadDateRangePicker.tsx` (superseded shortly after by Feature 018's single-date `UploadDatePicker.tsx`, which has no equivalent two-field state to desynchronize) — documented here as the historical record of the fix, even though the affected component no longer exists post-018.
