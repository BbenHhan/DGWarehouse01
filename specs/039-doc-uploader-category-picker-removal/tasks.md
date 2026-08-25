---

description: "Task list for Remove the Redundant Category Picker from Document Upload"

---

# Tasks: Remove the Redundant Category Picker from Document Upload

**Input**: Design documents from `/specs/039-doc-uploader-category-picker-removal/`

**Tests**: No new Vitest coverage.

---

## Phase 1: User Story 1 - Upload straight to the category you're already viewing (Priority: P1) 🎯 MVP

- [X] T001 [US1] Update `components/DocUploader.tsx`: remove the category `Select` block, the `categoryOptions` prop, and `selectedCategoryId` state; `uploadDoc` now always called with the `categoryId` prop directly
- [X] T002 [US1] Update `app/(app)/documents/[categorySlug]/page.tsx`: stop passing `categoryOptions` to `DocUploader` (still computed and passed to `DocList` as `categoryMoveOptions`, unchanged)

**Checkpoint**: The upload form shows only the group field; uploads still land in the right category.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T003 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T004 [P] Run `npx next lint` — no warnings or errors
- [X] T005 [P] Run `npm test` — 7 files, 42 tests, all passed
