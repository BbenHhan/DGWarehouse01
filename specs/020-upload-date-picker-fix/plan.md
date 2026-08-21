# Implementation Plan: Upload Date Picker Fix

**Branch**: `main` | **Date**: 2026-07-28 (retroactive) | **Spec**: [spec.md](spec.md)

## Summary

Root cause: `UploadDateRangePicker.tsx` computed the `value` prop it passed down to `WeekPeriodPicker` as `startDate && endDate ? { startDate, endDate } : null` — requiring *both* fields to be non-empty before constructing a non-null value object. Since the parent's `startDate`/`endDate` state genuinely did update on each keystroke/selection, but the displayed `<input value={...}>` was driven by this derived (and incorrectly gated) object, picking only one date reset the visible field back to empty on every re-render. Fixed by changing the condition to `startDate || endDate ? { startDate, endDate } : null` — either field alone is enough to construct a non-null value, and `WeekPeriodPicker`'s own rendering already handles an individually-empty string on either side via `value?.startDate ?? ""`.

## Technical Context

**Language/Version**: TypeScript / React 19 (Next.js 15).

**Primary Dependencies**: None new.

**Testing**: No dedicated unit test — this was a one-line boolean-logic fix in a component's prop-derivation, not a pure `lib/*.ts` function; verified via live dev-server interaction review of the resulting code path (not full authenticated click-through, which remains account-holder-only per the standing limitation).

## Constitution Check

No principle implicated — pure bug fix, no new UI, no new data flow, no auth/schema change.

## Project Structure

```text
components/
└── UploadDateRangePicker.tsx   # MODIFIED — one-line condition fix (component later superseded entirely by Feature 018)
```
