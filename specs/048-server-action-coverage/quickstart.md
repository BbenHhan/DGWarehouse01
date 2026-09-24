# Quickstart: Cover the Remaining Server Actions

## Prerequisites

None. No session, no database, no network.

## Run the new checks

```bash
npx vitest run app/actions
```

Expected: every action refuses a viewer and a signed-out caller with distinct Thai messages and leaves the stored data unchanged; deletes remove the stored file as well as the record; a bad file is refused before being stored while the rest of its batch succeeds; the checklist's room and sub-item rules hold; and the two account safeguards cannot be talked around.

## Prove the checks are worth having (SC-005)

Revert one protected behaviour at a time and confirm the suite goes red, then restore it:

- remove the rights check from one action
- delete the row without removing the stored file
- let `moveDocuments` write `storage_path`
- allow the last admin to be demoted
- let an already-handled role request be approved again

## Full gate

```bash
npx vitest run && npx tsc --noEmit && npm run lint
```
