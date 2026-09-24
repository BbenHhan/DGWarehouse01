# Contract: what each new test file must prove

Every file asserts the Thai text the app actually returns.

## Shared, for every action (FR-001 to FR-004)

| Caller | Expected |
|---|---|
| Not signed in | `กรุณาเข้าสู่ระบบก่อนทำรายการนี้`, nothing stored changes |
| Signed in, viewer | `คุณไม่มีสิทธิ์ทำรายการนี้`, nothing stored changes |
| Editor, on an account action | refused — accounts need an admin |
| Any refused caller with invalid input | refused for rights, not for the input |

## `app/actions/photos.test.ts`

- `uploadPhoto`: stores a valid file; refuses a file over the limit and a disallowed type, naming the file, storing nothing; a mixed batch stores the good and reports the bad.
- `deletePhoto`: removes the record **and** the file from disk; an unknown id → `ไม่พบรูปภาพนี้`.
- `deletePhoto`, Supabase branch: removes the stored object, and does **not** delete the row when removing the object fails.
- `editPhoto`: changes only what was passed; an edit with nothing to change is refused.

## `app/actions/documents.test.ts`

- `uploadDoc`: as above, plus a typed sub-group name resolves to that sub-group.
- `deleteDoc`: record and file both gone; unknown id → `ไม่พบเอกสารนี้`; Supabase branch as for photos.
- `editDoc`, `moveDocuments`: a move relocates every document, reports the count, and leaves every `storage_path` untouched; an empty list is a no-op.

## `app/actions/checklist.test.ts`

- `addChecklistItem`: tags the rooms given; blank text refused.
- `setChecklistItemRoomStatus`: ticking one room leaves the other rooms and the item's own status unchanged (FR-010).
- `setChecklistItemStatus`: a parent follows its sub-items — finished only when all are, reopened when one is (FR-011).
- `deleteChecklistItem`: a parent takes its sub-items and nothing else (FR-012).
- `editChecklistItem`: text, detail and dates change; an edit with no fields is refused.

## `app/actions/users.test.ts` (stand-in client)

- Every action requires an admin; an editor is refused.
- `updateUserRole`: demoting the only admin is refused with the role unchanged; demoting one of two succeeds.
- `approveRoleRequest` / `denyRoleRequest`: a request already handled is refused.
- `requestEditorAccess`: a second request while one is pending is refused.
- `listAccounts`, `listPendingRoleRequests`: refused for non-admins.

## `app/actions/auth.test.ts` (stand-in client)

- `signOut` ends the session and sends the person to the login page.
