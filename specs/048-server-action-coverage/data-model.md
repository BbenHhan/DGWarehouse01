# Data Model: Cover the Remaining Server Actions

No schema change, no new table, no new column. This feature adds checks only.

The entities exercised, and the rules each check relies on:

| Entity | Rules under test |
|---|---|
| **Photo** | Record plus stored file; both removed together. Belongs to a room and a work type; has one date. |
| **Document** | Record plus stored file; both removed together. A move changes its category and sub-group only, never `storage_path`. |
| **Checklist item** | May be tagged to several rooms; status is per room and rolls up to the item. May have sub-items; deleting a parent removes them. |
| **Account** | Exactly one role (viewer / editor / admin). At least one admin must exist at all times. |
| **Role request** | Pending, then approved or denied exactly once. A viewer may hold only one pending request. |

## Test doubles

**`lib/supabase-stub.ts`** — a stand-in for the Supabase client:

- `from(table)` returns a chainable builder; awaiting it yields the result configured for that table.
- `storage.from(bucket).remove(paths)` records the call and returns the configured result.
- Every call is recorded in order, so a test can assert *what happened and in which order* — which is how the delete ordering rule (research Decision 3) is proved.
