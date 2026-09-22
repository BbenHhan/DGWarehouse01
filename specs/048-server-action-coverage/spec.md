# Feature Specification: Cover the Remaining Server Actions

**Feature Branch**: `feature/048-server-action-coverage`

**Created**: 2026-09-22

**Status**: Draft

**Input**: "ทำทั้งคู่ ตามลำดับ 1 → 2" — after an audit showed that only 2 of the app's 7 Server Action modules have any automated checks, the account holder asked for the gap to be closed first, with end-to-end scenarios to follow as a separate feature.

## Why this is needed

Feature 045 proved the document taxonomy's rules: every action refused for a viewer, every guard against destroying documents exercised. Five Server Action modules never got the same treatment, and they are the ones that move real files and real permissions:

- **Photos** — upload, delete, edit. Deleting is the only path that removes a stored file; nothing checks that the file actually goes with the row.
- **Documents** — upload, delete, edit, and the bulk move. The move must never rewrite where a file is stored; nothing checks that either.
- **Checklist** — add, edit, delete, and the two status paths. Ticking one room must not tick another, a parent's state is derived from its sub-items, and deleting a parent takes its sub-items. All of that is covered for the local store, but nothing covers it through the action, where the rights check lives.
- **Accounts** — listing accounts, requesting editor access, approving or denying a request, and changing a role. These decide who may do anything at all. Two rules protect them: the last administrator cannot be demoted, and a request already dealt with cannot be acted on twice.
- **Sign out.**

The risk is not theoretical. Feature 045 found exactly this shape of bug in the taxonomy: the local backend renumbered correctly and the Supabase one did not, and every test passed because they all ran on the local backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A viewer cannot change anything, anywhere (Priority: P1)

Someone signed in as a viewer, or not signed in at all, calls any of these actions directly rather than through the buttons they cannot see. Every one refuses, says which of the two reasons applies, and leaves the stored data exactly as it was.

**Why this priority**: It is the only gap whose failure is a security hole. Every other check protects against losing work; this one protects against someone changing what they may not.

**Independent Test**: For each action, call it as a viewer and as a signed-out caller, and confirm the refusal message and that nothing stored changed.

**Acceptance Scenarios**:

1. **Given** a viewer, **When** they call any photo, document or checklist action, **Then** it is refused for lack of rights and nothing is created, changed or deleted.
2. **Given** someone not signed in, **When** they call the same actions, **Then** the refusal says to sign in, distinctly from the viewer's refusal.
3. **Given** an editor, **When** they call an account action (listing accounts, approving a request, changing a role), **Then** it is refused — those need an administrator.
4. **Given** a refused call of any kind, **When** the stored data is inspected afterwards, **Then** it is byte-for-byte what it was before.

---

### User Story 2 - Nothing is destroyed or corrupted by a permitted action (Priority: P1)

An editor doing ordinary work cannot silently lose a file or leave one stranded.

**Why this priority**: These are the paths that touch stored files. A row deleted without its file leaves an orphan nobody can see; a move that rewrites a file's location breaks every existing link.

**Independent Test**: Delete a photo and a document and confirm both the record and the stored file are gone; move documents between categories and confirm every file is still readable where it was.

**Acceptance Scenarios**:

1. **Given** a photo with a stored file, **When** an editor deletes it, **Then** both the record and the stored file are gone.
2. **Given** a document with a stored file, **When** an editor deletes it, **Then** both are gone.
3. **Given** documents in one category, **When** an editor moves them to another category and sub-group, **Then** each document reports its new place, none is lost, and where its file is stored is unchanged.
4. **Given** a delete that names something that does not exist, **When** it runs, **Then** it is refused by name and nothing else is touched.

---

### User Story 3 - A bad file is refused, and one bad file does not sink the rest (Priority: P2)

Someone drops a folder of files in. The ones that are too large or of a type the system does not accept are refused before anything is stored; the rest upload.

**Why this priority**: Constitution VIII requires both checks on every upload path. Partial success is what makes a twenty-file drop usable.

**Independent Test**: Upload a batch containing one oversized file, one disallowed type, and two good ones; confirm two succeed, two are reported with reasons, and nothing is stored for the two refused.

**Acceptance Scenarios**:

1. **Given** a file larger than the limit, **When** it is uploaded, **Then** it is refused with a reason naming the file, and nothing is stored for it.
2. **Given** a file of a type not on the allowlist, **When** it is uploaded, **Then** it is refused the same way.
3. **Given** a batch of good and bad files, **When** it is uploaded, **Then** every good file is stored and every bad one is reported, in one result.

---

### User Story 4 - The checklist's room and sub-item rules hold through the action (Priority: P2)

An inspector ticks a task in one room. The other rooms are untouched, and the task itself only counts as finished when every room and every step is.

**Why this priority**: These rules are what make the room pages trustworthy. They are covered at the data layer; this proves the path people actually use behaves the same.

**Independent Test**: Tag one item to two rooms, tick it in one, and confirm the other room and the overall state are unaffected.

**Acceptance Scenarios**:

1. **Given** an item tagged to two rooms, **When** it is ticked in one room, **Then** the other room's state and the item's overall state are unchanged.
2. **Given** an item with sub-items, **When** every sub-item is finished, **Then** the parent reports finished; **When** one is reopened, **Then** the parent does not.
3. **Given** a parent with sub-items, **When** it is deleted, **Then** its sub-items go with it and no other item is affected.

---

### User Story 5 - The two account safeguards cannot be talked around (Priority: P2)

The administrator who tries to demote the only remaining administrator is refused. A request already approved or denied cannot be acted on a second time.

**Why this priority**: Losing the last administrator locks everyone out of the screen that could fix it. Acting twice on one request can hand out rights the administrator did not mean to grant.

**Independent Test**: With one administrator, attempt to change their role; approve a request and then approve it again.

**Acceptance Scenarios**:

1. **Given** exactly one administrator, **When** an attempt is made to change their role to anything else, **Then** it is refused with a reason and the role is unchanged.
2. **Given** two administrators, **When** one is demoted, **Then** it succeeds.
3. **Given** a request already approved or denied, **When** it is acted on again, **Then** it is refused as already handled.
4. **Given** a viewer with a pending request, **When** they request again, **Then** they are told one is already pending rather than a second being created.

---

### Edge Cases

- A stored file already missing when its row is deleted: the row still goes, so the listing does not keep showing a file nobody can open.
- An upload of zero files, or a move of zero documents: refused or a no-op, never a crash.
- Editing an item with no fields to change: refused with a reason.
- A checklist item tagged to no room at all: its status lives on the item, not on a room.
- Account actions have no local mode: they are checked against a stand-in for the database rather than by running a real one (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Rights (Constitution VII)**

- **FR-001**: Every photo, document and checklist action MUST be shown to refuse a caller without edit rights, and separately a caller who is not signed in, with different messages.
- **FR-002**: Every account action MUST be shown to require an administrator — an editor MUST be refused.
- **FR-003**: A refused call of any kind MUST be shown to leave stored data unchanged.
- **FR-004**: The rights check MUST be shown to happen before input is validated, so a refused caller learns nothing about what the input would have done.

**Protecting what is stored**

- **FR-005**: Deleting a photo or a document MUST be shown to remove the stored file as well as the record.
- **FR-006**: Moving documents MUST be shown to change only where a document is listed, never where its file is stored.
- **FR-007**: An action naming something that does not exist MUST be shown to be refused by name, changing nothing.

**Uploads (Constitution VIII)**

- **FR-008**: A file over the size limit and a file of a disallowed type MUST each be shown to be refused before being stored, with a reason naming the file.
- **FR-009**: A batch containing both good and bad files MUST be shown to store every good file and report every bad one.

**Checklist rules**

- **FR-010**: Ticking an item in one room MUST be shown to leave every other room's state, and the item's overall state, unchanged.
- **FR-011**: A parent's state MUST be shown to follow its sub-items — finished only when all are, and reopening one MUST be shown to reopen the parent.
- **FR-012**: Deleting a parent MUST be shown to delete its sub-items and nothing else.

**Account safeguards**

- **FR-013**: Demoting the last administrator MUST be shown to be refused, with the role left unchanged; demoting one of two MUST be shown to succeed.
- **FR-014**: A role request already approved or denied MUST be shown to be refused if acted on again.
- **FR-015**: A second request from someone who already has one pending MUST be shown to be refused rather than creating another.

**How the checks run**

- **FR-016**: The checks MUST run without a signed-in session, without the live database, and without the account holder's data.
- **FR-017**: The checks MUST NOT require any change to how the actions behave. A check that cannot pass without changing behaviour MUST be reported as a defect rather than worked around.
- **FR-018**: Each new check MUST be shown to fail when the behaviour it protects is removed.

### Key Entities

- **Photo**, **Document**: a record plus a stored file. Both must always be removed together.
- **Checklist item**: may belong to several rooms and may have sub-items; its state is per room and rolls up.
- **Account**: has exactly one role. At least one administrator must exist at all times.
- **Role request**: a pending ask from a viewer, which may be approved or denied exactly once.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every Server Action in the app has at least one check proving it refuses a caller without the right role — zero actions rely on the control being hidden.
- **SC-002**: Every path that deletes a stored file has a check proving the file goes with the record.
- **SC-003**: Both account safeguards — the last administrator, and acting twice on one request — are exercised by checks.
- **SC-004**: The checks pass repeatedly with no intermittent failures, and run without a session, a live database, or the account holder's data.
- **SC-005**: Each new check fails when the behaviour it protects is reverted.
- **SC-006**: Any defect found while writing the checks is reported before anything is changed.

## Assumptions

- Photo, document and checklist actions are checked by running them against the interim local backend, as the taxonomy checks already do: the whole path runs for real, including the rights gate and validation.
- Account actions and sign-out have no local backend — they always talk to the live database — so they are checked against a stand-in for that database. The rules being proved (who may call, the last administrator, a request acted on twice) live in the action, not in the database.
- Uploads are checked against files created in memory; no real storage service is involved.
- End-to-end scenarios through a browser are a separate feature and out of scope here.
- No behaviour changes: this feature adds checks only. Anything found along the way is reported, and fixing it is a decision for the account holder.
