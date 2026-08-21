# Feature Specification: Bulk Document Import

**Feature Branch**: `017-bulk-document-import`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Import the account holder's real document folders (drawings, certificates, warranties, quotations, datasheets — organized under 4 category folders on disk that match the app's 4 existing document categories) into the app's document list, so viewers/editors can browse them the same way as any other uploaded document."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the real documents in each category (Priority: P1)

The account holder has already sorted a folder of real project documents (building plans, fire-test certificates, warranty letters, quotations, datasheets) into 4 folders on their computer, one per document category the app already tracks. They want those files to show up in the app's document list for the matching category, without manually uploading each one through the browser.

**Why this priority**: This is the entire point of the feature — until the files appear in the app, nothing else matters. It's also independently valuable: even partial import (whatever's organized so far) is useful immediately.

**Independent Test**: Run the import against the real folder tree, then open each of the 4 document category pages in the app and confirm the files that were on disk now appear in the matching category's list, with their original file names intact and open/download working correctly.

**Acceptance Scenarios**:

1. **Given** a category folder on disk containing files directly inside it and inside several named sub-folders, **When** the import runs, **Then** every file (at any depth under that category folder) appears as a document under the matching category in the app.
2. **Given** a file sits inside a named sub-folder (e.g. a "Firewalls" sub-folder under the structure category), **When** the import runs and the document is later viewed in the app, **Then** the sub-folder's name is visible somewhere on that document so the person browsing still knows what it's about, even though the app has no dedicated sub-category field.
3. **Given** a file sits directly inside a category folder with no sub-folder, **When** the import runs, **Then** the document is imported into that category with no sub-folder context shown (nothing misleading is displayed).
4. **Given** one of the 4 category folders currently has no files in it yet, **When** the import runs, **Then** the import completes without error and simply adds nothing for that category.

---

### User Story 2 - Re-run the import safely as more files get organized (Priority: P1)

The account holder has said they haven't finished organizing all their documents yet. As they sort more files into the category folders over time, they want to be able to re-run the same import and have only the new files added — without creating duplicate entries for files already in the app, and without needing to remember what was imported last time.

**Why this priority**: Without safe re-runnability, every future addition would require either careful manual tracking of what's new or manually uploading through the browser one file at a time — both defeat the purpose of having an import at all. This is a P1 because the account holder explicitly said organizing is ongoing.

**Independent Test**: Run the import once, add a new file to one of the category folders (in a new or existing sub-folder), run the import again, and confirm only the new file is added — the previously imported documents are untouched and not duplicated.

**Acceptance Scenarios**:

1. **Given** a file has already been imported into a category, **When** the import is run again without any changes to that file, **Then** no duplicate document is created for it.
2. **Given** a new file has been added to a category folder (or a new sub-folder) since the last import, **When** the import is run again, **Then** only that new file is added as a document.
3. **Given** the import is run again, **When** it finishes, **Then** it reports how many documents were newly added versus how many were already present, so the account holder can confirm it worked as expected.

---

### User Story 3 - Understand what didn't import (Priority: P2)

Some files may fail to import (unsupported file type, a file too large, a filename Supabase Storage can't accept as-is). The account holder wants to know exactly which files those were and why, so they can fix the file or accept that it's excluded, rather than silently losing documents.

**Why this priority**: Lower priority than the core import working, but important for trust — an import that silently drops files without saying so could leave the account holder believing everything is in the app when it isn't.

**Independent Test**: Include a file of an unsupported type in a category folder, run the import, and confirm the summary output explicitly lists that file and the reason it was skipped, while every other valid file in the same run still imports successfully.

**Acceptance Scenarios**:

1. **Given** a category folder contains one file of an unsupported type alongside several valid files, **When** the import runs, **Then** the valid files are imported and the unsupported file is listed in the summary with a clear reason.
2. **Given** a file's original name contains characters that cannot safely be used to identify it in storage (e.g. Thai script or spaces), **When** the import runs, **Then** the file still imports successfully and its original file name is still what's shown in the app.

---

### Edge Cases

- What happens when a category folder on disk doesn't match any of the app's 4 known document categories (e.g. a stray folder with a typo'd or unexpected name)? The import must skip it and say so, rather than guessing or failing the whole run.
- What happens when the same file name appears in two different sub-folders under the same category (e.g. two different "quotation.pdf")? Both are legitimately different documents and must both be imported — the "already imported" check must not treat them as the same document just because the name matches, if the account holder deliberately reused a generic name (see FR-006 for how this is handled: exact same name **and** same sub-folder context is required to count as a duplicate).
- What happens when the import is interrupted partway through (e.g. network drop)? Files already imported before the interruption remain in the app; re-running the import picks up from there without creating duplicates of what already succeeded (covered by User Story 2).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The import MUST read files from the account holder's local document folder tree without modifying, moving, or deleting anything on disk.
- **FR-002**: The import MUST determine each file's document category by matching the top-level folder it sits under (directly or indirectly) to one of the app's 4 existing document categories, and MUST skip (with a reported reason) any top-level folder that doesn't match a known category.
- **FR-003**: The import MUST include files at any folder depth under a matched category folder, not only files sitting directly in the category's top-level folder.
- **FR-004**: When an imported file sits inside a named sub-folder beneath its category folder, the import MUST record that sub-folder's name as visible context on the resulting document. When a file sits directly in the category folder with no sub-folder, the document MUST carry no such context.
- **FR-005**: The import MUST preserve each file's original file name as shown in the app, regardless of any adjustments needed to store the file safely.
- **FR-006**: The import MUST be safe to run more than once: a file already imported for the same category and the same sub-folder context (if any) and the same file name MUST NOT be imported again as a duplicate on a subsequent run.
- **FR-007**: The import MUST only accept file types the app's document upload already supports, and MUST reject (with a reported reason, not a failure of the whole run) any file of an unsupported type or over the app's existing size limit.
- **FR-008**: The import MUST produce a summary at the end covering: documents newly added, documents skipped because they were already imported, and documents skipped due to an error — each with enough detail (which file, which reason) for the account holder to act on it.
- **FR-009**: The import MUST NOT alter or interact with any other part of the app's data (photos, weeks, rooms, work types, user accounts) — its effect is limited to adding document entries in the matched categories.
- **FR-010**: A category folder that currently contains no files MUST NOT cause the import to fail or report an error — it is simply skipped with nothing added.

### Key Entities

- **Document**: An already-existing concept in the app — a single file (drawing, certificate, warranty, quotation, datasheet, etc.) belonging to exactly one document category, with a file name and optional free-text note. This feature adds real documents to this existing list; it does not change what a document is.
- **Document Category**: An already-existing, fixed set of 4 groupings documents belong to. This feature does not add, remove, or rename any category — it only populates the 4 that already exist.
- **Source Folder Tree**: The account holder's on-disk organization — 4 top-level folders (one per document category) each containing files directly and/or grouped into named sub-folders. This structure exists only as the input to the import; it is not persisted as its own concept in the app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every file the account holder has already organized into one of the 4 category folders (excluding unsupported file types) is visible and openable in the matching category page in the app after a single import run.
- **SC-002**: Running the import a second time with no new files added results in zero new documents being created.
- **SC-003**: After adding new files to the source folders and re-running the import, 100% of the genuinely new files appear in the app and 0% of the previously-imported files are duplicated.
- **SC-004**: If any file fails to import, the account holder can identify which specific file and why from the import's own output, without needing to inspect the app or ask for help.

## Assumptions

- The 4 top-level folder names on disk correspond one-to-one with the app's 4 existing document categories by meaning (even if the exact folder text differs from the category's stored name) and this mapping is fixed and known in advance — the import does not need to infer or guess new categories.
- The account holder is the only person running this import; it is a one-off/occasional maintenance action, not a feature exposed to other app users.
- Sub-folder names are short, human-readable labels the account holder already chose for their own organization (e.g. "1.2 งานผนังและกำแพงกันไฟ (Firewalls)") — displaying that exact text as context is sufficient, no renaming or reformatting is required.
- The app's existing supported file types and size limit for documents (already enforced on manual uploads) are the correct rules to apply here too, with no special exception for imported files.
- "Already imported" duplicate detection based on category + sub-folder context + file name is sufficient; the feature does not need to compare file contents/checksums to detect a renamed or moved duplicate.
