# Implementation Plan: Checklist Status Control — Native Select Replaced

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Replace the three native `<select>` status pickers (`ChecklistList.tsx`'s shared `StatusSelect`, and `RoomChecklistBox.tsx`'s two inline pickers, now consolidated into its own local `StatusSelect`) with the app's custom `Select` component, carrying the same room/status color classes on `SelectTrigger` that a native select couldn't reliably render.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: `components/ui/select.tsx` — already used elsewhere, no new dependency.

**Testing**: No new Vitest coverage — UI-only change, same handlers/behavior underneath.

**Scale/Scope**: `components/ChecklistList.tsx` (rewrite `StatusSelect`), `components/RoomChecklistBox.tsx` (new local `StatusSelect`, replaces two inline `<select>`s).

## Constitution Check

No violations — same Server Action calls, same optimistic-update logic; only the rendered control changes.

## Project Structure

```text
specs/037-status-select-native-fix/
├── plan.md
└── tasks.md

components/ChecklistList.tsx      # MODIFIED — StatusSelect rebuilt on Select/SelectTrigger/SelectContent/SelectItem
components/RoomChecklistBox.tsx    # MODIFIED — new local StatusSelect (same pattern), replaces both inline <select>s
```
