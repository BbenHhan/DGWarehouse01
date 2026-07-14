# Data Model: Open Sign-Up with Role-Based Access Control

## Entity: `profiles`

One row per Supabase Auth account (`auth.users`), created automatically on sign-up.

| Column       | Type        | Notes                                                             |
|--------------|-------------|--------------------------------------------------------------------|
| `id`         | `uuid`      | Primary key; `references auth.users(id) on delete cascade`         |
| `email`      | `text`      | Denormalized copy of `auth.users.email` at creation time, for the admin screen's display without needing the Auth Admin API |
| `role`       | `text`      | One of `'viewer'` \| `'editor'` \| `'admin'`; `not null default 'viewer'`; `check (role in (...))` |
| `created_at` | `timestamptz` | `not null default now()`                                          |

**Relationships**: One-to-one with `auth.users` (via `id`). Not referenced by any other table — `weeks`/`photos`/`documents` remain unaware of accounts entirely (Decision 3, research.md).

**Lifecycle**:
- Created by a trigger (`handle_new_user`, `security definer`) firing `after insert on auth.users` — covers both email/password sign-up and first-time Google OAuth sign-in.
- One bootstrap row is set to `role = 'admin'` for the existing account holder's email as part of the same migration (research.md Decision 2).
- Updated only via the `updateUserRole` Server Action (admin-only, service-role client) — never by the row's own owner, never by the anon-key client.
- Deleted automatically if the underlying `auth.users` row is ever deleted (`on delete cascade`) — no app code manages deletion (out of scope per spec.md).

**Validation rules**:
- `role` must be one of the three literal values — enforced by a `check` constraint at the database level, in addition to the TypeScript `Role` union type used everywhere in application code.
- FR-012 ("never zero admins") is enforced in the `updateUserRole` Server Action (research.md Decision 6), not as a table constraint — see that decision for why.

## No changes to existing entities

`rooms`, `work_types`, `weeks`, `photos`, `document_categories`, `documents` are unchanged by this feature — none of them reference `profiles`, and their own RLS policies are unchanged (research.md Decision 3).
