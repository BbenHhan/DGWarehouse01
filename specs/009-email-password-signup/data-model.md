# Data Model: Email/Password Sign-Up

No new entities. This feature adds a creation path to the account/role model Feature 007 already established (`auth.users` + `profiles`, trigger-populated `role = 'viewer'`) — it does not change that model's shape, add columns, or add tables. The only "new" surface is a client-side form-mode state (`"signin" | "signup" | "forgot"`) in `app/login/page.tsx`, which is UI state, not persisted data.
