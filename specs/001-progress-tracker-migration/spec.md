# Feature Specification: Progress Tracker Web Migration

**Feature Branch**: `001-progress-tracker-migration`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Migrating DG Warehouse 01 from a local single-file HTML viewer to a modern web app. Core features needed: view photos organized by room → work type → week; view documents organized by 4 หมวด categories; upload photos (single or batch); upload documents; edit (rename, notes, move); delete photos and documents; lightbox/full-screen photo viewer; responsive on mobile and desktop. Rooms: 🏠 ห้องแรก, 🏢 ห้องกลาง, ❄️ ห้องซอย 1-4. Work types: 🧱 Firewalls, ⚡ Electrical, 🏠 Roofing, 🏗️ Flooring, 🌊 บ่อพัก/รางน้ำ, 📷 Overview. Document categories: หมวดที่ 1 โครงสร้างอาคาร, หมวดที่ 2 ระบบไฟฟ้า, หมวดที่ 3 สิ่งแวดล้อม, หมวดที่ 4 ความปลอดภัย."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Progress Photos by Room, Work Type, and Week (Priority: P1)

Bell opens the app, picks a room (e.g. 🏠 ห้องแรก), picks a work-type tab (e.g. 🧱 Firewalls), picks a week, and sees all photos uploaded for that specific week. She can tap any photo to open it full-screen and browse through the rest of that week's photos without leaving the viewer.

**Why this priority**: This is the primary, daily use case that already exists in the v7 local viewer — reproducing it is the minimum bar for the migration to be usable at all.

**Independent Test**: Seed one room/work-type/week combination with several photos. Confirm navigating room → work type → week shows exactly those photos, and opening one launches a full-screen viewer that can step to the next/previous photo in the same week.

**Acceptance Scenarios**:

1. **Given** photos exist for ห้องแรก → Firewalls → สัปดาห์ที่ 3, **When** Bell navigates to that room, work type, and week, **Then** she sees all photos uploaded for that week displayed as a grid.
2. **Given** Bell opens a week that has no photos yet, **When** the week loads, **Then** she sees an empty state indicating no photos yet, with an option to upload.
3. **Given** Bell taps a photo thumbnail, **When** the lightbox opens, **Then** she can view the photo full-screen and navigate to the next/previous photo within that same week.

---

### User Story 2 - View Documents by Category (Priority: P1)

Bell browses documents grouped into the four fixed หมวด categories and opens a document to view or download it.

**Why this priority**: Documents are the second core content type from v7 and, like photos, are read far more often than they are uploaded or edited.

**Independent Test**: Seed one document in each of the four categories. Confirm each category lists only its own documents, and opening a document previews or downloads it correctly.

**Acceptance Scenarios**:

1. **Given** a document exists in หมวดที่ 2 ระบบไฟฟ้า, **When** Bell opens that category, **Then** she sees the document listed with its file name and type.
2. **Given** Bell selects a document, **When** she opens it, **Then** it previews (for previewable types like PDF) or downloads (for other types).

---

### User Story 3 - Upload Photos, Single or Batch (Priority: P2)

Bell selects a room, work type, and week, then uploads one or several photos at once from her phone or desktop.

**Why this priority**: Without upload, the tracker can never grow beyond its initial migrated data — this is the primary way new progress gets recorded.

**Independent Test**: From an empty week, select and upload 5 photos in a single action. Confirm all 5 appear in the grid once the upload completes, with a loading state shown during upload.

**Acceptance Scenarios**:

1. **Given** Bell is viewing a week with no photos, **When** she selects 5 photos and uploads them, **Then** a loading indicator shows during upload and all 5 photos appear in the grid once it completes.
2. **Given** one file in a batch fails to upload (e.g. unsupported format), **When** the batch finishes, **Then** Bell sees which specific file(s) failed while the rest succeed.

---

### User Story 4 - Upload Documents to a Category (Priority: P2)

Bell selects one of the four หมวด categories and uploads a document to it.

**Why this priority**: Mirrors photo upload for the second content type; needed for the tracker to stay current with new paperwork.

**Independent Test**: Upload a PDF to หมวดที่ 1. Confirm it appears in that category's document list with a success confirmation.

**Acceptance Scenarios**:

1. **Given** Bell is viewing หมวดที่ 3 สิ่งแวดล้อม, **When** she uploads a document, **Then** a loading indicator shows during upload and the document appears in that category's list once it completes.

---

### User Story 5 - Edit Photo/Document Details (Priority: P3)

Bell renames a file, adds or edits a note/description on it, or moves it to a different week (for photos) or category (for documents).

**Why this priority**: Corrects mistakes and keeps content organized after the fact, but the tracker is still useful without it for a first release.

**Independent Test**: Rename an existing photo, add a note to it, then move it to a different week. Confirm the new name and note persist and the photo now appears only under the new week.

**Acceptance Scenarios**:

1. **Given** an existing photo, **When** Bell renames it and saves, **Then** the new name is reflected everywhere it is displayed.
2. **Given** an existing photo, **When** Bell adds or edits its description note, **Then** the note is saved and visible whenever that photo is viewed.
3. **Given** an existing photo in สัปดาห์ที่ 2, **When** Bell moves it to สัปดาห์ที่ 5, **Then** it no longer appears under สัปดาห์ที่ 2 and appears under สัปดาห์ที่ 5.
4. **Given** an existing document in หมวดที่ 1, **When** Bell moves it to หมวดที่ 4, **Then** it appears under หมวดที่ 4 only.

---

### User Story 6 - Delete Photos and Documents (Priority: P3)

Bell deletes a photo or document she no longer needs, confirms the action to avoid accidental loss, and sees it disappear from view immediately.

**Why this priority**: Important for cleanup and correcting mistaken uploads, but not required for the tracker's core value of recording and viewing progress.

**Independent Test**: Delete an existing photo and confirm. Confirm it is removed from the grid immediately and does not reappear after reloading the app.

**Acceptance Scenarios**:

1. **Given** an existing photo, **When** Bell taps delete and confirms, **Then** the photo is removed from the grid immediately and is permanently deleted.
2. **Given** Bell taps delete but cancels the confirmation, **When** she cancels, **Then** the photo remains unchanged and visible.

---

### Edge Cases

- What happens when an upload is interrupted by a lost network connection partway through? The user must see which files did and did not complete, and be able to retry only the failed ones.
- What happens when Bell tries to save a rename with an empty file name? The system must reject it and prompt for a valid name.
- What happens when the last photo in a week is deleted? The week remains visible in navigation with its empty state, ready for future uploads.
- What happens when Bell has the app open on both her phone and desktop at the same time and edits the same item from both? The most recently saved change wins; no locking is required for a single-user tool.
- What happens when Bell opens the app with no internet connection? She sees a clear offline/connection-error state rather than a blank or broken screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let users view photos organized in a three-level hierarchy: room → work type → week, matching the v7 structure (rooms: ห้องแรก, ห้องกลาง, ห้องซอย 1–4; work types per room: Firewalls, Electrical, Roofing, Flooring, บ่อพัก/รางน้ำ, Overview).
- **FR-002**: System MUST let users view documents organized into four fixed categories (หมวดที่ 1–4).
- **FR-003**: Users MUST be able to upload one or multiple photos in a single action to a specific room/work-type/week combination.
- **FR-004**: Users MUST be able to upload a document to a specific หมวด category.
- **FR-005**: System MUST show a loading indicator during any upload and report success or failure per file when a batch is involved.
- **FR-006**: Users MUST be able to rename an existing photo or document.
- **FR-007**: Users MUST be able to add or edit a free-text note/description on any photo or document.
- **FR-008**: Users MUST be able to move a photo to a different week, including across different rooms or work types.
- **FR-009**: Users MUST be able to move a document to a different หมวด category.
- **FR-010**: Users MUST be able to delete a photo or document, and MUST be shown a confirmation step before the deletion is permanent.
- **FR-011**: Once a deletion is confirmed, the item MUST disappear from the view immediately, without waiting for the underlying operation to finish.
- **FR-012**: System MUST provide a full-screen ("lightbox") photo viewer that lets users step to the next/previous photo within the same week without closing the viewer.
- **FR-013**: System MUST be fully usable on both mobile and desktop screen sizes, with the mobile layout as the primary experience.
- **FR-014**: System MUST show a clear, human-readable error message whenever an upload, edit, or delete action fails, and MUST let the user retry.
- **FR-015**: System MUST let users add a new week under a room/work type as construction progresses; weeks are not a fixed, pre-defined list.
- **FR-016**: System MUST persist all photos, documents, notes, and organizational placement durably, accessible across sessions and devices.
- **FR-017**: Viewing, uploading, editing, and deleting MUST be restricted to the authenticated single user; the system MUST NOT allow anonymous access.
- **FR-018**: System MUST accept common photo formats (JPEG, PNG, HEIC) and common document formats (PDF, DOCX, XLSX) for upload, and MUST reject unsupported formats with a clear message.
- **FR-019**: Weeks and document categories with no content yet MUST still appear in navigation, showing an empty state that prompts upload.

### Key Entities

- **Room**: One of the fixed physical areas being tracked (ห้องแรก, ห้องกลาง, ห้องซอย 1–4).
- **Work Type**: One of six fixed categories of construction work within a room (Firewalls, Electrical, Roofing, Flooring, Drainage, Overview).
- **Week**: An open-ended, chronologically ordered time bucket within a room + work-type combination; created as needed; groups photos.
- **Photo**: An image file with a name, upload date, optional note/description; belongs to exactly one room + work-type + week at a time.
- **Document Category (หมวด)**: One of four fixed categories grouping documents.
- **Document**: A file with a name, upload date, optional note/description; belongs to exactly one หมวด category at a time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bell can locate and view any photo from a specific room/work-type/week within 15 seconds of opening the app.
- **SC-002**: Bell can upload a batch of 10 photos in one action and see all of them appear without manually refreshing the page.
- **SC-003**: 100% of delete actions require confirmation, and the deleted item disappears from view within 1 second of confirmation.
- **SC-004**: All core actions (view, upload, edit, delete) work on a mobile phone screen with no horizontal scrolling or broken layout.
- **SC-005**: Renaming, adding a note to, or moving an existing photo/document each take under 30 seconds to complete.
- **SC-006**: Zero data loss — every uploaded photo or document remains accessible after closing and reopening the app on any device.

## Assumptions

- Weeks are open-ended and created by the user as construction progresses; rooms, work types, and the four document categories are fixed, matching v7's existing structure, and are not user-editable in this feature.
- The system has a single authenticated user (Bell); no multi-user roles, permissions, or sharing are required.
- Moving a photo or document is unrestricted — it can move to any room/work-type/week or category, not only within its current parent.
- Standard web upload limits (per-file size, batch count) apply; exact numeric limits are a planning/implementation decision, not user-facing scope for this spec.
- No offline mode is required; an internet connection is needed to view, upload, edit, or delete content, since data now lives in the cloud rather than on local disk (an intentional change from v7).
