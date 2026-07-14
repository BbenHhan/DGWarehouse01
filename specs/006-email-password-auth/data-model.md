# Data Model: Email/Password Authentication

No new entities. This feature adds no app-level data — it only adds a new way to authenticate against the account that already exists in Supabase Auth's built-in `auth.users` table (created earlier via Google OAuth sign-in). Password hashes, reset tokens, and their expiry are all owned and managed internally by Supabase Auth (Constitution Principle VII: "not a hand-rolled credentials table or hashing implementation") — nothing here is queried, stored, or modeled by this application's own schema.

The only new piece of application-owned logic is a pure validation rule, not a data entity:

- **Password strength check** (`lib/password.ts`): a pure function, `validatePassword(password: string): string | null`, returning a Thai error message or `null` if the password meets the minimum length requirement (research.md Decision 4). No persistence involved.
