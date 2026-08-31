# Feature Specification: Editable Document Taxonomy

**Feature Branch**: `main`

**Created**: 2026-08-25

**Status**: Draft

**Input**: "คืออยากให้ สามารถ add หมวดขึ้นมาเองได้ ทั้งหมวดใหญ่และย่อย" — the account holder wants to create, name, and order the document list's own structure without a developer, for both the top-level categories (หมวดใหญ่) and the sub-groups inside them (หมวดย่อย). Raised immediately after two related complaints: the upload form's group picker "show แค่หัวข้อที่มีไฟล์" (only lists groups that already have files), and หมวดที่ 4 ความปลอดภัย showing no groups at all.

## Why this is needed

Today the two levels of the document list have completely different standing, and only one of them is real.

**หมวดใหญ่** are stored records with a name, an icon, and an explicit display order. Nothing in the app lets anyone change them — the four that exist were written once when the system was set up.

**หมวดย่อย** are not records at all. A sub-group is a piece of text repeated on every document that belongs to it, and the list of sub-groups is recomputed each time the page loads by collecting the distinct text found across the documents on display. Three consequences follow directly, and all three are what the account holder ran into:

- A sub-group **cannot exist without a file**. หมวดที่ 4 ความปลอดภัย has no documents, so it has no sub-groups — there is no way to lay out its structure before the paperwork arrives.
- A sub-group **cannot be renamed** as one thing. Correcting a name means correcting the identical text on every document carrying it; miss one and the group silently splits in two.
- A sub-group **has no order**. The list follows whichever document happens to be encountered first, so the numbering the account holder maintains by hand (0., 1.1, 1.2, …) only reads correctly by accident.

The same root cause explains the upload form's incomplete picker: it can only suggest text that some document already carries, and it draws that text from every category rather than the one being uploaded into — so it offers too few of the right options and some outright wrong ones.

## Clarifications

### Session 2026-08-25

- Q: When a category is deleted and its sub-groups go with it, what happens to the documents inside them? → A: The person deleting chooses — move them to another destination, or delete them along with the category. Deleting requires an extra confirmation naming the file count. A move destination may be any category, and any sub-group within it.
- Q: What happens to a name typed into an add field that was never submitted? → A: It is kept, not discarded — leaving management mode and coming back must not lose it.
- Q: Should deleting a category also delete its sub-groups? → A: Yes, in one action rather than one sub-group at a time, behind an explicit confirmation.
- Q: Is the delete/move choice itself the confirmation, or is another step needed before documents are destroyed? → A: Another step. Choosing to delete opens a second confirmation naming the file count.
- Q: Who may manage the taxonomy — add, rename, reorder, delete categories and sub-groups? → A: Editors. Managing the taxonomy is edit work; the admin role's only additional power over an editor stays role management, per Constitution VII. This overrides the original brief's "สำหรับ role admin".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lay out a category's structure before any files exist (Priority: P1)

An editor opens หมวดที่ 4 ความปลอดภัย, which is empty, switches the list into management mode, and types in the sub-topics the inspection will require. They appear immediately as named, empty groups, ready to receive files later.

**Why this priority**: This is the reported blocker and the one thing that is outright impossible today. Delivered alone it already turns the document list from a read-only reflection of whatever was uploaded into something the account holder controls — and it fixes the upload picker at the same time, since the picker will now list the category's own groups whether or not they hold files.

**Independent Test**: Open a category with no documents, add two sub-groups, confirm both appear with a zero file count and both are offered by the upload form's group picker.

**Acceptance Scenarios**:

1. **Given** a category with no documents, **When** an editor adds a sub-group by name, **Then** it appears in that category's list showing no files.
2. **Given** an empty sub-group exists, **When** anyone opens the upload form on that category, **Then** the group picker offers it.
3. **Given** sub-groups exist in two different categories, **When** the upload form is opened on one of them, **Then** only that category's groups are offered.
4. **Given** an empty sub-group exists, **When** a file is uploaded into it, **Then** the file appears under that group and the group's file count rises.

---

### User Story 2 - Correct a name once, everywhere (Priority: P2)

An editor spots a typo, or the inspectors change their wording. They click the name in the list, type the correction, and it is fixed everywhere that name appeared — no file is touched.

**Why this priority**: Renaming is the most frequent maintenance action and today it is both laborious and unsafe. It is second only to creation because a name that cannot be created cannot be corrected either.

**Independent Test**: Rename a sub-group holding several files, confirm every one of those files still sits under the renamed group and none moved or disappeared.

**Acceptance Scenarios**:

1. **Given** a sub-group holding files, **When** an editor renames it, **Then** the new name shows immediately and every file remains in it.
2. **Given** a category, **When** an editor renames it, **Then** the new name shows in the list and its own address stays the same, so existing links to that category keep working.
3. **Given** an editor is renaming, **When** they clear the name and leave the field, **Then** the previous name is kept rather than an empty one being saved.
4. **Given** a name already used by another group in the same category, **When** an editor tries to rename a group to it, **Then** the change is refused with a reason and the original name stays.

---

### User Story 6 - Move documents into the right place (Priority: P3)

An editor moves documents out of one sub-topic and into another — including into a sub-topic belonging to a different category — whenever something has landed in the wrong place.

**Why this priority**: Asked for directly by the account holder, who wanted moving to work across the whole feature rather than only at the moment of a deletion. It also carries US5: the "move them instead" option there needs somewhere to move documents *to*, and today's per-document control can pick a category but offers no sub-group at all — so without this, that option would have nothing to offer. Ranked above reordering because a document filed under the wrong topic is a correctness problem, while a mis-ordered list is a presentation one.

**Independent Test**: Move a document from one category's sub-group into a different category's sub-group, confirm it leaves the first and appears in the second under the right group.

**Acceptance Scenarios**:

1. **Given** a document in a sub-group, **When** it is moved to another sub-group, **Then** it leaves the first and appears under the second, and both file counts update.
2. **Given** a document, **When** a destination is chosen, **Then** any category may be chosen, and any sub-group belonging to that category, or no sub-group at all.
3. **Given** several documents in one sub-group, **When** the group is moved elsewhere as part of a deletion, **Then** all of them arrive together at the chosen destination.

---

### User Story 3 - Put the list in the intended order (Priority: P4)

An editor moves a category or a sub-group up or down until the list reads in the order they maintain by hand, and that order is what everyone else then sees.

**Why this priority**: Ordering is real but cosmetic next to existing and being named correctly — the list is usable while mis-ordered, and unusable while a topic is missing.

**Independent Test**: Move a sub-group from last to first, reload as a different user, confirm the new order holds.

**Acceptance Scenarios**:

1. **Given** several sub-groups in a category, **When** an editor moves one up, **Then** it swaps with the one above and the new order persists for every user.
2. **Given** the first item in a list, **When** an editor looks at it, **Then** no "move up" action is offered; likewise no "move down" on the last.
3. **Given** several categories, **When** an editor reorders them, **Then** the category tabs everywhere in the app follow that order.

---

### User Story 4 - Add a whole new category (Priority: P5)

A new class of paperwork arrives that does not belong under any of the four existing categories. An editor adds หมวดที่ 5 and starts filling it.

**Why this priority**: Genuinely needed for the feature to be complete, but the four current categories match the inspecting authority's own structure and rarely change — this will be used far less often than sub-group work.

**Independent Test**: Add a category, confirm it appears in the tab list for every user and can receive both sub-groups and uploads.

**Acceptance Scenarios**:

1. **Given** the management view, **When** an editor adds a category by name, **Then** it appears last in the list and is reachable by every user.
2. **Given** a newly added category, **When** anyone opens it, **Then** it behaves like the original four — sub-groups can be added and files uploaded.

---

### User Story 5 - Remove part of the structure, deciding what happens to the files (Priority: P6)

An editor removes a sub-topic or a whole category that is no longer required. If anything inside still holds files, the system stops and makes them choose what becomes of those files — move them somewhere else, or delete them too — and states plainly what is about to happen before it happens.

**Why this priority**: Deletion is the least frequent action and by far the most dangerous, being the only one that can destroy uploaded work. It ships last so its safeguards are built against a taxonomy that already works, and so the move capability it depends on (US6) exists first.

**Independent Test**: Delete a category holding files, choose to move them, confirm every file arrives at the chosen destination and none is lost; repeat choosing deletion, confirm the extra confirmation states the file count before anything is removed.

**Acceptance Scenarios**:

1. **Given** a sub-group or category holding no files, **When** an editor deletes it, **Then** it disappears from the list and from the upload picker, with a single confirmation.
2. **Given** a category holding sub-groups, **When** an editor deletes it, **Then** its sub-groups are removed with it in one action — the editor is not made to delete them one at a time first.
3. **Given** anything holding files is about to be deleted, **When** the editor confirms, **Then** they must first choose between moving the files and deleting them, and the choice states how many files it affects.
4. **Given** the editor chooses to move, **When** the deletion completes, **Then** every file is at the chosen destination and none has been removed.
5. **Given** the editor chooses to delete the files too, **When** they confirm, **Then** a second, explicit confirmation naming the file count is required before anything is removed.
6. **Given** either confirmation is dismissed, **When** the editor returns to the list, **Then** nothing has been deleted or moved.

---

### Edge Cases

- **Two editors editing at once**: the second change to land wins; neither loses files, and a refreshed page shows the settled result. No locking or live cursor is in scope.
- **Reordering rapidly**: repeatedly moving an item must settle on the order shown on screen, not an intermediate one, however fast the actions are taken.
- **A change is rejected mid-edit** (permission lost, connection dropped): the list returns to its last known-good state and says what failed, rather than continuing to display a change that was not saved.
- **Documents belonging to no sub-group**: these exist today and MUST keep displaying exactly as they do now, outside any group. Creating groups does not force them into one.
- **A name that is only spaces**: treated as empty and refused, for both levels.
- **A very long name**: must not break the row layout at mobile width.
- **The read-only snapshot backend**: it has no concept of a taxonomy and never will; it MUST report having no sub-groups rather than failing, and MUST NOT offer management actions.
- **A viewer reaching a management action directly**, bypassing the interface: MUST be refused by the system, not merely hidden in the UI.
- **Choosing a destination inside the thing being deleted**: MUST NOT be offered — moving a category's documents into one of that same category's sub-groups would destroy them a moment later.
- **The destination disappears mid-decision** (someone else removes it while the confirmation is open): the action MUST fail cleanly with a reason, moving nothing, rather than dropping the documents.
- **A deletion that affects many documents**: the count shown in the confirmation MUST be the real number about to be affected, not an estimate or a page's worth.

## Requirements *(mandatory)*

### Functional Requirements

**Structure**

- **FR-001**: A sub-group MUST exist as a record in its own right, independent of whether any document belongs to it.
- **FR-002**: Every sub-group MUST belong to exactly one category.
- **FR-003**: A document MUST be able to belong to one sub-group or to none.
- **FR-004**: Sub-group names MUST be unique within their category. The same name MAY be used in different categories.
- **FR-005**: Both categories and sub-groups MUST carry an explicit display order that is shown consistently to every user.
- **FR-006**: Existing documents and their current groupings MUST be preserved when this structure is introduced — no document may lose its group, and no currently visible group may disappear.

**Management**

- **FR-007**: An editor MUST be able to create, rename, reorder, and delete sub-groups.
- **FR-008**: An editor MUST be able to create, rename, reorder, and delete categories.
- **FR-009**: Renaming MUST NOT modify, move, or re-upload any document.
- **FR-010**: Deleting a category MUST remove its sub-groups with it in a single action; the editor MUST NOT be required to delete them individually first.
- **FR-011**: When a deletion would leave documents without a home, the system MUST NOT proceed silently: it MUST require the editor to choose between moving those documents to a destination they select and deleting them along with the structure, and MUST state how many documents the choice affects.
- **FR-011a**: Choosing to delete the documents MUST require a second, explicit confirmation that names the number of documents to be destroyed. Choosing to move MUST require one confirmation.
- **FR-011b**: Dismissing any confirmation MUST leave everything unchanged — no partial deletion, no partial move.
- **FR-012**: The system MUST refuse an empty or whitespace-only name, and a name that duplicates a sibling.
- **FR-013**: A category's address MUST remain stable across renames, so existing links and bookmarks keep working.
- **FR-014**: A newly created category MUST receive a usable address without the editor having to supply one.

**Access**

- **FR-015**: Editing the taxonomy MUST require at least the editor role. The system MUST enforce this itself, independently of whether the interface offers the action.
- **FR-016**: Viewers MUST see the document list exactly as it is today, with no management affordance visible and no way to change anything.
- **FR-017**: Editors MUST retain their existing ability to upload, edit, delete, and move documents; this feature MUST NOT remove or narrow any permission they already hold.
- **FR-017a**: This feature MUST NOT grant admins any capability beyond what editors get. Managing the taxonomy is edit work, and the only power the admin role adds over the editor role remains changing another account's role.

**Interface**

- **FR-018**: The document list MUST present its normal reading view by default; management controls MUST appear only when someone who may edit explicitly switches into management mode, and disappear when they leave it.
- **FR-019**: Entering management mode MUST NOT relocate the list's rows or change what each row is called — only the controls attached to a row may change.
- **FR-020**: Each row MUST show how many documents it holds, so the effect of a deletion is visible before it is attempted.
- **FR-021**: Reordering MUST be operable by discrete per-row actions rather than dragging, so it is reliable on a phone held on site.
- **FR-022**: Every management action MUST show that it is in progress and MUST report failure explicitly; a failed action MUST leave the list showing the true saved state.
- **FR-023**: The upload form's group picker MUST offer every sub-group belonging to the category being uploaded into, whether or not it holds documents, and MUST NOT offer sub-groups from other categories.
- **FR-024**: The upload form MUST still accept a group name typed in freely, creating it if it does not exist.
- **FR-025**: A name typed into an add field but not yet submitted MUST be preserved while the editor is on the page — leaving management mode and returning MUST NOT discard it.
- **FR-026**: A document MUST be movable to any category and to any sub-group within that category, or to no sub-group. Destination choices MUST be offered from the live structure, so a newly created sub-group is immediately available as a destination.

### Key Entities

- **Document category (หมวดใหญ่)**: a top-level division of the document list. Has a display name, an icon, a display order, and a stable address used in links. Already exists; gains the ability to be created, renamed, reordered, and removed.
- **Document sub-group (หมวดย่อย)**: a named division inside exactly one category, with its own display order. New as an entity — currently only implied by text repeated across documents.
- **Document**: unchanged in everything a user sees. What changes is that it now belongs to a sub-group that exists on its own, instead of carrying the group's name with it — which is why renaming a group no longer has to touch the document. May belong to no sub-group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An editor can create a sub-topic in a category that holds no files at all — impossible today — and it is immediately offered by the upload form.
- **SC-002**: Renaming a sub-topic holding any number of files is a single action, and 100% of those files remain in it afterwards.
- **SC-003**: The order shown to every user is the order the person managing it set, on every category and every sub-group, with no dependence on which file was uploaded first.
- **SC-004**: The upload form's group picker offers exactly the sub-groups of the category being uploaded into — no missing entries, no entries belonging to another category.
- **SC-005**: No document is ever destroyed without the person deleting being told how many and confirming it twice; every deletion that would otherwise orphan files offers moving them instead.
- **SC-006**: A viewer cannot change the taxonomy, including by issuing the request directly rather than through the interface.
- **SC-007**: The account holder can add a missing sub-topic without contacting a developer, in under a minute, on a phone.
- **SC-008**: Documents currently visible remain visible in the same groups after the change is deployed — verified by comparing the document list before and after.

## Assumptions

These were proposed during design review and accepted with the overall direction. They can still be revisited at `/speckit-clarify`.

- **Saving is immediate, not batched**: each change is written as it is made and the screen updates ahead of confirmation, with an explicit message and a revert if the write fails — matching how the checklist already behaves. Rapid repeated reordering settles as a single write. There is no "save" button to forget, and no draft state to lose by closing the page.
- **Deleting a category takes its sub-groups with it** in one action, rather than requiring each to be removed by hand first. Where documents are involved, the editor decides their fate explicitly (FR-011) — nothing is destroyed as a side effect of removing structure.
- **A new category's address is generated by the system.** Users never see or type it. Existing addresses are immutable because they are live links; only the display name and icon are editable.
- The four existing categories and the seven sub-groups currently in use are treated as real data to be carried over intact, not as seed data to be regenerated.
- Management is a low-frequency, one-person-at-a-time activity. Simultaneous editing is not designed for beyond last-write-wins.
- The taxonomy is editor-level work, not an admin privilege. The feature was first briefed as admin-only; that was revisited during clarification against Constitution VII, which gives the admin role exactly one power the editor role lacks — changing an account's role. Gating the taxonomy behind admin would have quietly added a second, so it is editor-level and the constitution needs no amendment.
- The read-only snapshot backend reports an empty taxonomy and offers no management, following the precedent already set for the checklist.
- Moving documents is in scope and is what makes deletion safe (US6). Today's per-document control can move a file between categories but offers no sub-group; that gap is closed here. A destination is a category plus optionally one of its sub-groups.
- When a deletion moves documents, they all go to a single chosen destination rather than being sorted individually — they can be rearranged afterwards with the same move control.
- Unsubmitted text in an add field survives leaving and re-entering management mode on the same page. It is not expected to survive a reload or a move to another category — it is protection against a mis-click, not a saved draft.
