---

description: "Task list for Checklist Status Control — Native Select Replaced"

---

# Tasks: Checklist Status Control — Native Select Replaced

**Input**: Design documents from `/specs/037-status-select-native-fix/`

**Tests**: No new Vitest coverage.

---

## Phase 1: User Story 1 - Status controls look and are colored like the rest of the app (Priority: P1) 🎯 MVP

- [X] T001 [US1] Rebuild `StatusSelect` in `components/ChecklistList.tsx` on `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`, keeping the same `status`/`onChange`/`disabled`/`roomColorSelect`/`label` props and color-class logic
- [X] T002 [US1] Add a local `StatusSelect` (same pattern) to `components/RoomChecklistBox.tsx`; replace both inline `<select>` usages (top-level item, sub-item) with it

**Checkpoint**: Every status control is custom-styled and correctly colored, closed and open.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T003 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T004 [P] Run `npx next lint` — no warnings or errors
- [X] T005 [P] Run `npm test` — 7 files, 42 tests, all passed
