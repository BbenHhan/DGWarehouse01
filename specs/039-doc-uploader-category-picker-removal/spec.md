# Feature Specification: Remove the Redundant Category Picker from Document Upload

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "ไม่ต้องเลือกหมวดหลักแล้วไหม เพราะ user อยู่หน้านั้นอยู่แล้ว แค่มี dropdown เลือกหน่วยย่อยพอ" — the account holder pointed out (with a screenshot of the upload form) that re-selecting the main category in the upload form is redundant: the account holder is already standing on that category's own page (its tab is already highlighted above the form), so the picker just repeats what's already obvious from context. Only the group/sub-category field is actually useful there.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload straight to the category you're already viewing, without re-picking it (Priority: P1)

**Why this priority**: This is the literal ask — remove a redundant control that added confusion/clutter without adding capability.

**Independent Test**: Open any document category's page; confirm the upload form no longer shows a category picker, only the group/sub-category field; upload a file; confirm it lands in the category whose page it was uploaded from.

**Acceptance Scenarios**:

1. **Given** a document category's page, **When** the upload form is viewed, **Then** no category picker is shown — only the group/sub-category field and the file-add button.
2. **Given** a file uploaded from that page, **When** the upload completes, **Then** the file is filed under that page's own category (unchanged destination behavior from before this feature).
3. **Given** an already-uploaded document needs to move to a different category later, **When** its edit (pencil-icon) dialog is opened, **Then** the category-move picker there is unaffected — this feature only removes the upload-time picker, not the existing move-after-the-fact one.

## Requirements *(mandatory)*

- **FR-001**: The document upload form MUST NOT show a category picker.
- **FR-002**: A file uploaded from a category's page MUST be filed under that page's own category, same as before this feature.
- **FR-003**: The existing per-document "move to a different category" editor MUST be unaffected.

## Assumptions

- specs/025's original decision to offer both a category picker and a group field at upload time is superseded by this feedback — the category picker specifically was the redundant part, not the group field.
