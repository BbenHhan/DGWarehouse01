---

description: "Task list for Mobile Upload Remove Photo"

---

# Tasks: Mobile Upload Remove Photo

**Input**: Design documents from `/specs/026-mobile-upload-remove-photo/`

## Phase 1: User Story 1 - Discard a wrongly-picked photo (Priority: P1)

- [X] T001 [US1] In `components/MobileSwipeCard.tsx`, add `onRemove: (fileId: string) => void` to the props type
- [X] T002 [US1] Add a remove button (Trash2 icon, destructive styling matching `PhotoGrid.tsx`'s delete button) near the card's prev/next controls, calling `onRemove(current.id)`
- [X] T003 [US1] In `components/BulkUploadWorkspace.tsx`, pass the existing `removeFile` function to `<MobileSwipeCard onRemove={removeFile} .../>`

## Phase 2: Polish

- [X] T004 [P] Run `npx tsc --noEmit`
- [X] T005 [P] Run `npx next lint`
- [X] T006 [P] Run `npm test`
- [X] T007 Dev-server compile check of `/upload`
