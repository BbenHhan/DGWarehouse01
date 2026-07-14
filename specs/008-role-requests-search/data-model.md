# Data Model: Role Requests & User Search

## Entity: `role_requests` (new)

One row per role request a viewer submits.

| Column         | Type          | Notes                                                                 |
|----------------|---------------|------------------------------------------------------------------------|
| `id`           | `uuid`        | Primary key                                                            |
| `requester_id` | `uuid`        | `references profiles(id) on delete cascade` (research.md Decision 2)   |
| `status`       | `text`        | `'pending'` \| `'approved'` \| `'denied'`, `not null default 'pending'`, `check` constraint |
| `requested_at` | `timestamptz` | `not null default now()`                                               |
| `resolved_at`  | `timestamptz` | `null` until approved/denied                                           |
| `resolved_by`  | `uuid`        | `references profiles(id)`, `null` until resolved — which admin acted   |

**Constraints**:
- Partial unique index on `(requester_id) where status = 'pending'` — enforces "at most one pending request per account" at the database level (research.md Decision 1, FR-003).

**Lifecycle**:
- Created by `requestEditorAccess()` (viewer-only, server-checked — research.md Decision 7).
- Resolved by `approveRoleRequest()`/`denyRoleRequest()` (admin-only), which atomically transition `status` from `pending` to `approved`/`denied` and stamp `resolved_at`/`resolved_by` — a request whose `status` is no longer `pending` by the time the update runs is left untouched and the action reports "already resolved" (research.md Decision 6).
- Approving additionally updates the requester's `profiles.role` to `editor`, scoped to only apply when their role is still `viewer` (research.md Decision 5) — never deleted, resolved requests remain as history (spec.md Assumptions).

## Entity: `profiles` (modified — adds one column)

Adds `full_name text` (nullable) to the table Feature 007 created, populated by the same `handle_new_user()` trigger from `new.raw_user_meta_data->>'full_name'` (research.md Decision 3). No other change to `profiles`' shape, RLS, or lifecycle from Feature 007.

## No changes to other entities

`rooms`, `work_types`, `weeks`, `photos`, `document_categories`, `documents` are unchanged.
