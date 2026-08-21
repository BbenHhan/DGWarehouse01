---

description: "Task list for Mobile Upload Duplicate Photo"

---

# Tasks: Mobile Upload Duplicate Photo

**Input**: Design documents from `/specs/027-mobile-upload-duplicate-photo/`

## Phase 1: User Story 1 - Duplicate a photo on mobile (Priority: P2)

- [X] T001 [US1] In `components/MobileSwipeCard.tsx`, add `onDuplicate: (fileId: string) => void` to the props type
- [X] T002 [US1] Add a duplicate button (Copy icon, outline styling) next to Feature 026's remove button, calling `onDuplicate(current.id)`
- [X] T003 [US1] In `components/BulkUploadWorkspace.tsx`, pass the existing `duplicateFile` function to `<MobileSwipeCard onDuplicate={duplicateFile} .../>`

## Phase 2: Polish

- [X] T004 [P] Run `npx tsc --noEmit`
- [X] T005 [P] Run `npx next lint`
- [X] T006 [P] Run `npm test`
- [X] T007 Dev-server compile check of `/upload`
