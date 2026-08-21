---

description: "Task list for Upload Date Picker Fix"

---

# Tasks: Upload Date Picker Fix

**Input**: Design documents from `/specs/020-upload-date-picker-fix/`

**Status**: Retroactively documented — already implemented and verified.

## Phase 1: Fix

- [X] T001 In `components/UploadDateRangePicker.tsx`, change the `value` prop passed to `WeekPeriodPicker` from `startDate && endDate ? {...} : null` to `startDate || endDate ? {...} : null`

## Phase 2: Verification

- [X] T002 [P] `npx tsc --noEmit` — clean
- [X] T003 [P] `npx next lint` — clean
- [X] T004 Dev-server compile check of `/upload` — no server errors

## Summary

4/4 tasks complete. Superseded shortly after by Feature 018, which replaced the two-field
range picker with a single-date picker that has no equivalent bug surface.
