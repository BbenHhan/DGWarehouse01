# Feature Specification: Download a Category as One ZIP

**Feature Branch**: `feature/040-editable-document-taxonomy`

**Created**: 2026-09-17

**Status**: Draft

**Input**: An uncommitted draft already adds a "ดาวน์โหลด ZIP" button to each document category. The account holder asked for it to be finished and tested ("ฟีเจอร์ดาวน์โหลด ZIP ทั้งหมวด … ให้ทำต่อ"). Review of the draft found four defects to fix before it ships.

## Why this is needed

A submission to the authorities is a bundle, not a web page. Today, getting หมวด 6's files onto a laptop, a USB stick or an email means opening each of 30-odd documents and saving them one by one, then recreating the sub-group folders by hand so the officer can find things. One download should produce that bundle already organised the way the app shows it.

The draft does most of this. Review found it can still fail the people relying on it:

- **A file can silently disappear.** When two documents share a name, the draft renames the second using how many names are already taken — "name (3)" when three are. If a document really called "name (3)" is also in that folder, both end up on the same path, and one of the two is lost when the archive is extracted, with nothing to say so. (A folder holding "ก.pdf", "ก (3).pdf" and a second "ก.pdf" is the smallest case.)
- **A very large archive would be corrupt without warning.** Past 4 GB the archive format needs a different layout the draft does not write; the download would complete and then fail to open.
- **The download link itself was never tested** — not who may use it, not what an unknown category returns, not the file name the browser saves.
- **A category whose web address ever contained a non-Latin character would make the download fail outright** rather than fall back to a plain name.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take a whole category away as one organised bundle (Priority: P1)

Anyone who can see the documents opens a category and taps "ดาวน์โหลด ZIP". Their browser saves one file named after the category. Opened on Windows or macOS, it holds one folder per sub-group, named and ordered exactly as the app numbers them ("6.5 ใบรับรองและสเปก"), each containing that sub-group's files with their Thai names intact.

**Why this priority**: This is the feature. It replaces saving files one by one.

**Independent Test**: Download หมวด 6, extract it, and compare folder names, order and file contents against the category page.

**Acceptance Scenarios**:

1. **Given** a category with sub-groups and documents, **When** a signed-in viewer downloads it, **Then** the saved file is named "หมวดที่ N <category name>.zip".
2. **Given** that archive, **When** it is extracted on Windows or macOS, **Then** every folder and file name reads correctly in Thai.
3. **Given** a sub-group with documents, **When** the archive is extracted, **Then** its folder is named with the app's number and name and holds exactly those documents with identical contents.
4. **Given** a sub-group with no documents, **When** the archive is extracted, **Then** its folder still exists, empty.
5. **Given** documents that belong to no sub-group, **When** the archive is extracted, **Then** they are in a folder named "ไม่ได้ระบุหมวดย่อย".
6. **Given** a sub-group name containing "/", **When** the archive is extracted, **Then** it is still one folder, not a folder inside a folder.

---

### User Story 2 - Never lose a file on the way out (Priority: P1)

The bundle is what gets submitted, so it must contain every document the page shows — even when names collide or a stored file has gone missing.

**Why this priority**: A bundle that is silently short a document is worse than no bundle: the missing certificate is discovered by the officer, not by us.

**Independent Test**: Put three documents named "ก.pdf", "ก (3).pdf" and "ก.pdf" in one sub-group, download, and confirm three distinct files with the right contents.

**Acceptance Scenarios**:

1. **Given** two or more documents in one sub-group with the same name, **When** downloaded, **Then** every one is present under a distinct name.
2. **Given** a folder that also holds a document whose own name is the one a renamed duplicate would take, **When** downloaded, **Then** no two entries share a path and every file is present, whichever order they are in.
3. **Given** one document whose stored file is missing, **When** downloaded, **Then** every other document is still in the archive and the archive opens normally.

---

### User Story 3 - Safe to offer to everyone (Priority: P2)

The link works only for signed-in people, reports an unknown category plainly, never serves a stale copy, and fails loudly rather than producing a broken file.

**Why this priority**: Correctness of the happy path comes first; these protect the boundary around it.

**Independent Test**: Call the download address signed out, for an unknown category, and inspect the response headers of a successful download.

**Acceptance Scenarios**:

1. **Given** someone not signed in, **When** they request a category's archive, **Then** they are refused with a Thai message and receive no file.
2. **Given** a category address that does not exist, **When** requested, **Then** a Thai "not found" message is returned.
3. **Given** a successful download, **When** its response is inspected, **Then** it is marked as not to be cached and carries both a plain fallback file name and the Thai file name.
4. **Given** a category whose address contains a non-Latin character, **When** downloaded, **Then** the download still succeeds with a plain fallback name.
5. **Given** an archive that would exceed the format's 4 GB limit, **When** downloaded, **Then** the download fails with an error instead of completing as a file that cannot be opened.

---

### Edge Cases

- An empty category: the archive holds just the category folder and opens normally.
- A category with only ungrouped documents: one "ไม่ได้ระบุหมวดย่อย" folder.
- Very large files (up to the app's 300 MB upload limit): the download starts promptly and never needs the whole category in memory at once.
- A file that does not compress (scanned PDF, photo): stored as-is, so the archive is never larger than its contents plus bookkeeping.
- Descriptions and requirement checklists (specs/046) are page annotations and are not written into the archive.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each document category page MUST offer a "ดาวน์โหลด ZIP" control to every signed-in person who can see the documents, viewers included.
- **FR-002**: The download MUST be a single archive named "หมวดที่ N <category name>.zip", with characters that would create extra folder levels replaced.
- **FR-003**: The archive MUST contain one top-level folder for the category and, inside it, one folder per sub-group in the app's order, named with the app's number and name.
- **FR-004**: A sub-group with no documents MUST still appear as an empty folder.
- **FR-005**: Documents without a sub-group MUST appear in a folder named "ไม่ได้ระบุหมวดย่อย", present only when such documents exist.
- **FR-006**: Every folder and file name MUST be declared as Unicode so Thai names extract correctly on Windows and macOS.
- **FR-007**: No two entries in an archive MUST share a path; every document MUST be present even when names collide, including collisions with an already-renamed duplicate.
- **FR-008**: A document whose stored file cannot be read MUST be skipped without preventing the rest of the archive from being produced.
- **FR-009**: The archive MUST be produced progressively, holding at most one document's contents in memory at a time.
- **FR-010**: An archive that would exceed 4 GB or 65,535 entries MUST fail with an error rather than be written in a form that cannot be opened.
- **FR-011**: Requests from someone not signed in MUST be refused with a Thai message and no file; an unknown category MUST return a Thai not-found message.
- **FR-012**: A successful response MUST be marked not to be cached and MUST carry an ASCII-only fallback file name alongside the Thai one.
- **FR-013**: The archive MUST be produced identically on every storage backend the app supports (Constitution III).
- **FR-014**: Descriptions and requirement checklists MUST NOT be written into the archive.

### Key Entities

- **Category archive**: A single downloadable file representing one category at the moment of the request — a folder tree of sub-groups and their documents. Not stored; built on demand.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can take the whole of หมวด 6 away as one organised bundle with one tap, instead of saving each document individually.
- **SC-002**: 100% of the documents shown on a category page are present in its archive with byte-identical contents, including when file names collide.
- **SC-003**: Folder and file names read correctly in Thai after extraction on both Windows and macOS.
- **SC-004**: The largest category in the app downloads successfully without the server holding more than one document in memory at a time.
- **SC-005**: Zero requests from people who are not signed in receive any file.

## Assumptions

- Viewers may download: Constitution VII lets every signed-in role view all documents, and a download reveals nothing the page does not.
- The archive reflects the category at the moment of the request; it is not stored or versioned.
- No category approaches 4 GB today (the whole app holds well under that); the FR-010 limit exists so a future one fails honestly rather than corruptly, not because it is expected.
- Supporting archives larger than 4 GB is out of scope.
- Hosting limits on how long one response may run are not changed by this feature; a category large enough to exceed them is outside today's usage.
