# Feature Specification: Document Upload Categorization

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: "add file เอกสารยังไม่มีรอบรับแยกหมวดหมู่นะ ทำเพิ่มส่วนนี้ด้วย" — uploading a document through the app's own "+ เพิ่มไฟล์" control always attaches it to whichever category page it was clicked from, with no way to choose a different category, and no way to set the sub-folder-style grouping (`note`) that Feature 019's dropdown grouping and Feature 017's bulk import both already rely on. Clarified with the account holder: both the top-level category AND the sub-grouping should be choosable at upload time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose which category a document goes into, right from the upload control (Priority: P1)

**Why this priority**: Right now the only way to put a document in the "correct" category is to first navigate to that exact category's page before uploading — easy to get wrong, with no way to fix it except the separate edit-and-move flow after the fact.

**Independent Test**: On any `/documents/[categorySlug]` page, open the upload control; confirm a category selector is present, defaulting to the current page's category but changeable to any of the other 3; upload a file with a different category selected; confirm it appears under the chosen category, not the page it was uploaded from.

**Acceptance Scenarios**:

1. **Given** the upload control on any category page, **When** it's opened, **Then** a category selector shows, defaulting to the page's own category.
2. **Given** a different category is selected, **When** files are uploaded, **Then** they're saved under the selected category.
3. **Given** no category selection is changed, **When** files are uploaded, **Then** behavior is unchanged from before this feature (goes to the current page's category).

### User Story 2 - Group an uploaded document the same way imported ones already are (Priority: P1)

**Why this priority**: Feature 019's collapsible grouping and Feature 017's import both depend on the `note` field — without a way to set it at upload time, every manually-uploaded document permanently sits ungrouped, visually inconsistent with imported ones.

**Independent Test**: Open the upload control; confirm an optional grouping field is present, offering both a pick-from-existing-groups convenience and free-text entry for a new group name; upload a file with a group name set; confirm it appears under that group (or a new one) in the document list.

**Acceptance Scenarios**:

1. **Given** the upload control, **When** it's opened, **Then** an optional text field for the group/sub-folder name is present, suggesting names already used elsewhere so the account holder can reuse a naming convention instead of retyping it.
2. **Given** a group name matching an existing group, **When** a file is uploaded with it, **Then** the file appears inside that existing group.
3. **Given** a new group name not used before, **When** a file is uploaded with it, **Then** a new group appears with that name.
4. **Given** the group field is left blank, **When** a file is uploaded, **Then** it appears ungrouped, same as before this feature.

### Edge Cases

- Uploading multiple files in one batch applies the same chosen category and group to all of them (matching the existing single-batch-single-destination upload model — no per-file override within one upload action).

## Requirements *(mandatory)*

- **FR-001**: The document upload control MUST let the uploader choose which category the file(s) go into, defaulting to the category of the page it's opened from.
- **FR-002**: The document upload control MUST let the uploader optionally set a group/sub-folder name (the existing `note` field), suggesting previously-used names.
- **FR-003**: Leaving the group field blank MUST result in an ungrouped document, unchanged from current behavior.
- **FR-004**: A batch of files uploaded together MUST all receive the same chosen category and group.

## Success Criteria *(mandatory)*

- **SC-001**: A document can be correctly categorized and grouped in a single upload action, with zero follow-up edit-and-move steps needed for the common case.
- **SC-002**: Manually-uploaded documents can be made visually indistinguishable from imported ones (same grouping behavior in the document list).

## Assumptions

- No schema change needed — `documents.category_id` and `documents.note` already exist (Feature 017); this is purely a UI + Server Action parameter change.
