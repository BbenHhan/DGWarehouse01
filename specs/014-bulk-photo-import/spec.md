# Feature Specification: Bulk-Import Progress Photos from Weekly Folder Structure

**Feature Branch**: `014-bulk-photo-import`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Import ~760 already-organized construction progress photos/videos from a local weekly folder tree into the live site, so the account holder doesn't have to upload each one by hand through the browser."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every organized photo appears on the real site without manual upload (Priority: P1)

The account holder has spent time sorting hundreds of progress photos into folders by week, room, and work type on their own computer. Instead of opening the site and uploading each folder's contents by hand (select week → select files → upload, repeated dozens of times), they want the already-sorted photos to show up on the live site automatically, organized exactly the way they filed them.

**Why this priority**: This is the entire point of the feature — without it, the account holder still has to do the tedious manual work this feature exists to avoid.

**Independent Test**: Run the import once against the current folder tree; open the site and confirm photos appear under the correct week/room/work-type combination matching the folder they were filed in.

**Acceptance Scenarios**:

1. **Given** a folder tree organized as week → room → work-type → photo files, **When** the import runs, **Then** every photo file lands under a week on the site whose date range matches its week folder's name, under the correct room and work type.
2. **Given** a room folder that wraps several numbered sub-rooms (the "cold room" case), **When** the import runs, **Then** each sub-room's photos are attributed to that specific sub-room, not to the wrapping folder as a whole.
3. **Given** a work-type folder that contains an extra, more specific sub-folder someone added for their own bookkeeping (e.g. grouping a few flooring photos under a "gutter" sub-folder), **When** the import runs, **Then** those photos are still imported and counted under that work type — the extra sub-folder is transparent.
4. **Given** the folder tree includes a couple of short video clips alongside the photos, **When** the import runs, **Then** the videos are imported the same way the photos are, showing up in the same place a viewer would expect.

---

### User Story 2 - A work category missing from the site gets added, not silently dropped (Priority: P1)

Some photos are filed under a work-type category ("Doors & Exits") that doesn't exist on the site yet. Rather than those photos vanishing silently, the account holder wants that category to exist on the site so the photos have a home.

**Why this priority**: Silently dropping a whole category of real photos would defeat the purpose of the import and could go unnoticed for a long time.

**Independent Test**: After the import, confirm the new work-type category is visible and selectable on the site, and that its photos are present.

**Acceptance Scenarios**:

1. **Given** photos filed under a work-type category the site doesn't yet offer, **When** the import runs, **Then** that category becomes available on the site (in the same style/position as the existing categories) and its photos are imported into it.

---

### User Story 3 - Running the import again later only adds what's new (Priority: P2)

The account holder said they haven't finished sorting every photo yet — more will be added to the same folders over time. When they ask for another import later, they want only the new material added, not the whole site cluttered with duplicate weeks or duplicate copies of photos already there.

**Why this priority**: Without this, every future "add more photos" request risks corrupting the site with duplicates, making the feature unsafe to use more than once.

**Independent Test**: Run the import twice in a row against the same unchanged folder tree; confirm the second run adds nothing new and reports there was nothing to do.

**Acceptance Scenarios**:

1. **Given** a week/room/work-type combination that was already imported, **When** the import runs again with no new files in that combination, **Then** no duplicate week and no duplicate photos are created.
2. **Given** new photo files were added to a folder that was already partially imported, **When** the import runs again, **Then** only the new files are added; previously-imported files are left untouched.

---

### Edge Cases

- Folders that exist but contain no files at all (photos not yet sorted into a room, or a date not yet assigned) are left alone entirely — nothing is created on the site on their account.
- A photo file whose type the site doesn't otherwise accept is skipped with a clear note of what was skipped and why, rather than stopping the whole import or failing silently.
- If the import is interrupted partway through (e.g. a network hiccup), a subsequent run picks up cleanly without duplicating anything already completed (same guarantee as User Story 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The import MUST read the account holder's existing week/room/work-type folder structure exactly as they organized it, with no reorganization required on their part first.
- **FR-002**: The import MUST determine each week's date range from its folder name and use that as the week's identity on the site (matching how weeks are already identified elsewhere on the site).
- **FR-003**: The import MUST attribute a "wrapper" room folder's sub-room folders to their own individual rooms, not to the wrapper as a single room.
- **FR-004**: The import MUST treat any extra, more specific sub-folder found inside a work-type folder as belonging to that work type — files at any depth under a matched work-type folder are imported.
- **FR-005**: The import MUST import both photo and short video files found in the folder structure.
- **FR-006**: The import MUST make available, as a new selectable category on the site, any work-type category that has real photos filed under it but does not yet exist on the site.
- **FR-007**: The import MUST skip, without creating anything, any folder that is empty (no files anywhere underneath it) — including folders that exist specifically to hold not-yet-categorized material.
- **FR-008**: The import MUST be safe to run more than once against the same or an updated folder tree: it MUST NOT create a second, duplicate week for a week/room/work-type combination that already exists, and MUST NOT create a duplicate copy of a photo it has already imported.
- **FR-009**: When the import encounters a file type the site doesn't accept, it MUST skip that specific file and report it, without stopping the rest of the import.
- **FR-010**: The import MUST report, at the end of a run, how many weeks and how many files were newly added (and how many were skipped, with a reason), so the account holder can confirm the outcome without having to inspect the site by hand.

### Key Entities

- **Week**: A date-bounded period tied to one room and one work type, matching the "week folder" the account holder filed photos into. Identified by its date range, consistent with how weeks work everywhere else on the site.
- **Room**: A physical area of the building (including each numbered sub-room inside the wrapping "cold room" group) that photos are filed under.
- **Work type**: A category of work (e.g. flooring, electrical, doors) that photos are filed under within a room/week. One category that exists in the account holder's folders does not yet exist on the site and must be added.
- **Photo/video file**: An individual image or short video file, attributed to exactly one week/room/work-type combination based on where it was filed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the import, every photo and video file present in the account holder's organized folder tree (excluding empty, not-yet-categorized folders) is visible on the site under the matching week, room, and work type.
- **SC-002**: The account holder does not need to manually upload any of the already-organized files through the site's normal upload screen to get them onto the site.
- **SC-003**: Running the import a second time against an unchanged folder tree results in zero new weeks and zero new files being added (nothing duplicated).
- **SC-004**: The work-type category that previously had no home on the site is visible and usable on the site after the import, with its photos present.
- **SC-005**: The account holder receives a clear summary of what was added and what (if anything) was skipped, without needing to inspect the database directly.

## Assumptions

- The account holder's local folder tree is the source of truth for how photos should be organized on the site; the import mirrors it rather than asking the account holder to re-decide organization through the site's UI.
- The two folders that exist specifically to hold not-yet-categorized photos (no date assigned, no room assigned) are currently empty and are correctly left untouched by this import; if the account holder later puts real files in them, that's a separate, future request.
- This is a one-time (repeatable-as-needed) data-loading operation performed by/for the account holder, not a feature end users interact with through the site itself — there is no new UI.
- File-type and file-size acceptance follows the same rules the site's normal upload screen already enforces, so nothing is imported that a manual upload wouldn't have accepted anyway.
- The account holder wants this run for real now — a completed import means the photos are actually live on the site, not just ready to be imported.
