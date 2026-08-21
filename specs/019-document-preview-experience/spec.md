# Feature Specification: Document Preview Experience

**Feature Branch**: `main` (no feature branch — established repo convention)

**Created**: 2026-07-30 (retroactively documented 2026-08-21, per the account holder's explicit request to formalize all completed work into spec-kit docs)

**Status**: Implemented

**Input**: A sequence of direct feedback messages on the already-shipped document list (`/documents/[categorySlug]`, Feature 017): the flat file list was hard to scan once 31 documents landed in one category; clicking a file only opened a new tab instead of showing it; the preview needed to look and behave like Google Drive's own preview (download/open/share, properly sized); PDFs rendered at a tiny, hard-to-read zoom.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse many documents in one category without scrolling past everything (Priority: P1)

Someone opens a document category with dozens of files (e.g. 31 documents across 5 sub-folders after Feature 017's import) and wants to scan by sub-folder grouping instead of one long flat list.

**Why this priority**: This was the first complaint — a flat list of 31 items was genuinely hard to use.

**Independent Test**: Open `/documents/structure`; confirm documents sharing the same sub-folder note are grouped under one collapsible dropdown (name + file count), collapsed by default; documents with no sub-folder note show directly, ungrouped.

**Acceptance Scenarios**:

1. **Given** a category with documents from multiple sub-folders, **When** the page loads, **Then** each sub-folder appears as its own collapsible group showing its name and file count.
2. **Given** a collapsed group, **When** it's clicked, **Then** it expands to show that group's documents; clicking again collapses it.
3. **Given** a document with no sub-folder (note is empty), **When** the page loads, **Then** it appears directly in the list, not inside any group.

---

### User Story 2 - See the actual file content without leaving the page (Priority: P1)

Clicking a document should show what's actually in the file — not just open a new browser tab — matching how Google Drive's own preview works, and it must never be a full-screen popup/modal (explicitly rejected by the account holder — "ไม่เอา Pop up").

**Why this priority**: The whole point of a document list is to be able to check what's in a file quickly; a bare link that navigates away breaks that flow.

**Independent Test**: Click a document row; confirm the file's own preview (image, video, or embedded PDF) expands directly beneath that row, inside the same card — never a separate overlay/dialog.

**Acceptance Scenarios**:

1. **Given** an image document, **When** its row is clicked, **Then** the image renders inline below the row.
2. **Given** a PDF document, **When** its row is clicked, **Then** the PDF renders in an embedded viewer below the row, sized to use most of the available screen height so it's actually readable (not a small, tiny-zoomed box).
3. **Given** a video document, **When** its row is clicked, **Then** it plays inline with native controls.
4. **Given** a document of a type the browser can't render inline (e.g. `.docx`), **When** its row is clicked, **Then** a clear "can't preview this type" message appears with a way to still get the file.
5. **Given** an expanded document, **When** its row is clicked again, **Then** it collapses back.

---

### User Story 3 - Download, open, or share a document the way Google Drive lets you (Priority: P2)

Once a preview is open, provide the same core actions Drive's own preview offers.

**Why this priority**: Directly requested by name ("ให้ show file แบบ Drive... โหลดได้ เปิดใน tab ใหม่ก็ได้ แชร์ก็ได้"); secondary to actually seeing the content (US2) but necessary for the preview to be genuinely useful, not just decorative.

**Independent Test**: Open a document's preview; confirm three actions are available and each works: download (a real file save, not just a navigation), open in a new tab, and share (native share sheet on supporting devices, clipboard-copy fallback elsewhere).

**Acceptance Scenarios**:

1. **Given** an open preview, **When** "ดาวน์โหลด" is clicked, **Then** the file downloads to the device (works even though Storage is a different origin than the app, where the plain HTML `download` attribute alone would be silently ignored by the browser).
2. **Given** an open preview, **When** "เปิดในแท็บใหม่" is clicked, **Then** the file opens in a new browser tab.
3. **Given** an open preview on a device with native share support, **When** "แชร์" is clicked, **Then** the OS share sheet appears; on a device without it, the file's link is copied to the clipboard instead with a confirmation toast.

### Edge Cases

- A category with zero documents shows the existing empty state, unaffected by this feature.
- A document whose file type can't be determined falls into the same "can't preview" path as an explicitly unsupported type — never a broken/blank preview.

## Requirements *(mandatory)*

- **FR-001**: Documents sharing the same sub-folder context (the `note` field from Feature 017's import) MUST be grouped under a collapsible section; documents without one MUST appear ungrouped.
- **FR-002**: Clicking a document MUST expand an inline preview beneath that document's own row, within the same list — MUST NOT open a separate modal/dialog/popup or navigate away.
- **FR-003**: The preview MUST render according to the file's actual type: image inline, video with native controls, PDF in an embedded viewer sized for real readability, anything else as a clear unsupported-type message.
- **FR-004**: Every open preview MUST offer working download, open-in-new-tab, and share actions, regardless of file type.
- **FR-005**: Download MUST result in an actual saved file on the device, not merely a navigation to the file's URL.

## Success Criteria *(mandatory)*

- **SC-001**: A category with 30+ documents across several sub-folders can be scanned by group name without scrolling through every file at once.
- **SC-002**: A person can view a document's actual content without ever leaving the document list page or seeing a full-screen overlay.
- **SC-003**: Download/open/share each succeed on the first attempt for every supported file type.

## Assumptions

- The existing per-file-kind detection (`lib/file-kind.ts`) already used by the photos module's Lightbox is the correct, already-proven way to decide image vs. video vs. pdf vs. other for documents too.
- No new backend/schema changes are needed — this is purely a `DocList.tsx` rendering/interaction change over data Feature 017 already produces.
