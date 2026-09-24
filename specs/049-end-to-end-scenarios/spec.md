# Feature Specification: End-to-End Scenarios in a Real Browser

**Feature Branch**: `feature/049-end-to-end-scenarios`

**Created**: 2026-09-23

**Status**: Draft

**Input**: "ทำทั้งคู่ ตามลำดับ 1 → 2" — the second half of the testing work. Feature 048 closed the Server Action gap; this covers what no unit check can: a real browser, real clicks, real page loads.

## Why this is needed

Every automated check in this project stops at the edge of the browser. Components are rendered in a simulated DOM with their actions mocked; actions are called directly with the page absent. Nothing has ever proved that the two halves meet — that a button on the page reaches the action behind it, that the result comes back and the screen changes, or that a page still works after a reload.

That gap is exactly where the outstanding manual checks live, and it is why eight of them are still open: someone has to open the app and look. A browser-driven run can do most of that every time the code changes, instead of once when somebody remembers.

It has also cost real time. The 375px header defect — the manage button sitting 34px off the side of a phone screen, unreachable — was found by hand in a throwaway copy of the app, twice, because there was no standing way to open a page and measure it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The document checklist survives a real round trip (Priority: P1)

Someone opens a document category, sees what each sub-group is supposed to hold without opening any folder, switches on management, adds an item, marks it, deletes another, and reloads the page. Everything they did is still true.

**Why this priority**: The checklist is the feature the permit submission now runs on, and the reload is the part nothing has ever verified — an optimistic update that never reached storage looks identical on screen until the page comes back.

**Independent Test**: Run the scenario against a freshly seeded category and confirm each change survives a reload.

**Acceptance Scenarios**:

1. **Given** a category whose sub-groups carry requirement items, **When** the page is opened, **Then** the items and their statuses are visible without expanding any folder.
2. **Given** management mode is on, **When** an item is added, **Then** it appears in that sub-group and is still there after a reload.
3. **Given** an item marked as missing, **When** its status is set to "have", **Then** the new status shows at once and survives a reload.
4. **Given** an item, **When** it is deleted, **Then** it disappears and does not come back after a reload.

---

### User Story 2 - A file goes in and comes out again (Priority: P1)

Someone uploads a document through the page, sees it listed under the sub-group they chose, downloads the whole category as one archive, and deletes the document.

**Why this priority**: Uploading and downloading are the app's reason to exist, and they are the paths where a break costs real work. The archive in particular has only ever been checked by building it in a test — never by clicking the button that produces it.

**Independent Test**: Upload through the page, confirm the listing, download the archive and open it, then delete.

**Acceptance Scenarios**:

1. **Given** a category, **When** a file is uploaded through the page, **Then** it appears in the list under the chosen sub-group.
2. **Given** documents in a category, **When** the download control is used, **Then** the saved file opens as an archive containing a folder per sub-group and the uploaded file inside its own.
3. **Given** an uploaded document, **When** it is deleted through the page, **Then** it disappears from the list.
4. **Given** a room and a work type, **When** a photo is uploaded and then deleted through the page, **Then** the grid shows it and then stops showing it.

---

### User Story 3 - Ticking one room leaves the others alone, through the page (Priority: P2)

An inspector opens a room, ticks a task that also belongs to another room, and the other room is untouched.

**Why this priority**: The rule is covered at the data layer and through the action; what is not covered is that the room page sends the room it is showing rather than the task as a whole.

**Independent Test**: Tick a two-room task from one room's page and open the other room.

**Acceptance Scenarios**:

1. **Given** a task in two rooms, **When** it is ticked from the first room's page, **Then** the second room still lists it as outstanding.
2. **Given** that same task, **When** the first room's page is reloaded, **Then** it is still ticked there.

---

### User Story 4 - The pages work at phone width (Priority: P2)

Every page the team uses on site is opened at 375px wide and nothing is cut off, nothing overflows sideways, and the controls can be reached.

**Why this priority**: Constitution IV puts phones first, this is where the app is actually used, and it replaces three of the outstanding manual checks with something that runs on every change.

**Independent Test**: Load each main page at 375px and measure.

**Acceptance Scenarios**:

1. **Given** any main page at 375px, **When** it has loaded, **Then** the page does not scroll sideways.
2. **Given** the same pages, **When** their controls are examined, **Then** none sits outside the screen's edge.
3. **Given** a sub-group with a very long name and a room with the longest name in the system, **When** their rows are shown at 375px, **Then** the row does not break and no text is clipped away.

---

### User Story 5 - Nobody signed in gets in (Priority: P1)

With sign-in required, as in production, someone who is not signed in opens any page and lands on the login screen.

**Why this priority**: This is the outermost boundary of the whole app. Feature 048 proved the actions refuse; this proves the pages do too.

**Independent Test**: With sign-in required, open each main page while signed out.

**Acceptance Scenarios**:

1. **Given** sign-in is required and nobody is signed in, **When** any main page is opened, **Then** the login screen is shown instead.
2. **Given** the same, **When** the login screen is opened directly, **Then** it is shown rather than redirecting anywhere.

---

### Edge Cases

- A scenario leaves data behind: each run starts from a freshly seeded set, so a leftover cannot make the next run pass or fail wrongly (SC-004).
- The app under test is never allowed to touch the live project, and never the developer's own local data.
- Sign-in cannot be switched off anywhere it would matter: a deployed instance must ignore the setting entirely (FR-010).
- A scenario that depends on a file download must not hang forever if the download never starts.

## Requirements *(mandatory)*

### Functional Requirements

**Coverage**

- **FR-001**: The suite MUST cover, in a real browser: the document checklist (view, add, re-status, delete, each surviving a reload); uploading, listing and deleting a document; downloading a category archive and opening it; uploading and deleting a photo; ticking a task in one of two rooms; the main pages at 375px; and the redirect to login when signed out.
- **FR-002**: Each scenario MUST assert what the person sees, not what the code did.
- **FR-003**: The archive scenario MUST open the downloaded file and check its contents, not merely that a download started.

**Running it**

- **FR-004**: The whole suite MUST run from a single command with nothing prepared by hand.
- **FR-005**: The suite MUST start the app itself and stop it afterwards.
- **FR-006**: Running it twice in a row MUST give the same result (SC-004).
- **FR-007**: The suite MUST run without any account, password or sign-up.
- **FR-008**: The suite MUST NOT read or write the live project, and MUST NOT touch the developer's own local data directory.

**Safety of the arrangement that makes it possible**

- **FR-009**: Sign-in MUST be switchable off only for a test run, by an explicit setting that is off by default.
- **FR-010**: A deployed instance MUST ignore that setting entirely, so no deployment can be left open by mistake.
- **FR-011**: With the setting off — the normal case — the app MUST behave exactly as it does today.
- **FR-012**: The signed-out redirect scenario MUST run with sign-in required, proving the guard with the setting in its normal position.

**Keeping it honest**

- **FR-013**: Each scenario MUST be shown to fail when the behaviour it covers is broken.
- **FR-014**: The manual checks a scenario replaces MUST be struck from the outstanding list, and those that remain MUST say why a person is still needed.

### Key Entities

- **Test fixture**: a small, known set of rooms, work types, categories, sub-groups, requirement items and checklist tasks, created fresh for each run in a directory of its own.
- **Run mode**: either "sign-in off" (most scenarios) or "sign-in required" (the redirect scenario).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every scenario listed in FR-001 passes in a real browser, started and stopped by the suite itself.
- **SC-002**: The suite runs from one command on a clean checkout, with no account and no live database.
- **SC-003**: At least four of the outstanding manual checks are replaced by scenarios that run on every change.
- **SC-004**: Two consecutive runs give identical results, and neither leaves anything behind in the developer's own data.
- **SC-005**: Each scenario fails when the behaviour it covers is broken.
- **SC-006**: No deployed instance can have sign-in switched off, whatever the setting says.

## Assumptions

- The interim local backend is what the scenarios run against: it is a full implementation of the same contract, and it is the only way to run without the live project.
- Sign-in is switched off for most scenarios because the assistant cannot enter a password or create an account. What that costs — real sign-in, the OAuth round trip, and anything role-specific — stays on the manual list with the reason recorded.
- The fixture is created through the app's own storage layer, so the scenarios exercise the same paths the app uses.
- Scenarios run on one browser engine. Checking several browsers is a separate question, not part of this feature.
- The outstanding checks needing production storage and a screen reader are not replaced by this feature and stay manual.
