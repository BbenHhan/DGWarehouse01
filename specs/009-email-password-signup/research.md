# Research: Email/Password Sign-Up

## Decision 1: Where sign-up lives

**Decision**: A third mode (`"signin" | "signup" | "forgot"`) on the existing `app/login/page.tsx`, not a separate `/signup` route.

**Rationale**: The page already toggled between sign-in and forgot-password without navigation (Feature 006); adding sign-up as a third mode of the same client-side state machine is the smallest change, and keeps the "one login page, one URL" shape the login flow has had since Feature 006/007 — nothing else in the app (middleware's `PUBLIC_PATHS`, the `/auth/callback` route) needs to know about a new route.

**Alternatives considered**: A dedicated `/signup` page — rejected as unnecessary routing surface for what is, functionally, one more form on the same screen.

## Decision 2: Handling both confirmation-required and confirmation-off outcomes

**Decision**: After `supabase.auth.signUp()` resolves, branch on whether `data.session` is populated — if so, hard-navigate into the app (same pattern as sign-in, research.md Decision 3 from specs/006-email-password-auth); if not, show the same "check your email" pattern already used for the password-reset flow.

**Rationale**: Supabase's email-confirmation requirement is a per-project dashboard setting, not something this feature should assume one way or the other — `signUp()`'s response already tells the caller which case happened (`session` present vs. `null`), so branching on that is the only way to handle both correctly without hardcoding an assumption about the project's configuration.

**Alternatives considered**: Assuming confirmation is always required (always show "check your email") — rejected because it would show a misleading message and fail to sign in the user on any project where confirmation is off.

## Decision 3: Not revealing existing-email status

**Decision**: No special handling needed — Supabase's `signUp()` already avoids revealing whether an email is already registered when the project has email-enumeration protection enabled (the same behavior already relied on for the forgot-password flow, specs/006-email-password-auth research.md Decision 5). The sign-up form's error path shows a generic message for any real failure, and does not attempt to distinguish "already registered" from other causes.

**Rationale**: Consistent with the existing forgot-password flow's approach — this is confirming existing platform behavior already depended on elsewhere in the app, not a new decision.

## Decision 4: Reusing the existing password validator

**Decision**: `handleSignUp` calls `validatePassword` from `lib/password.ts` (specs/006-email-password-auth) before attempting `signUp()`, identical to how `app/reset-password/page.tsx` already validates client-side.

**Rationale**: One password-strength rule for the whole app, defined once — a second, sign-up-specific validator would be pure duplication of an already-correct 4-line function.

## Retroactive note

This feature's implementation predates this plan — the code was written and live-verified against the real Supabase project (new account created via `signUp()`, `profiles.role` confirmed `viewer` via the Feature 007 trigger, test account cleaned up) before this spec/plan/tasks set was authored, at the user's explicit request to formalize an already-shipped gap-fix through the full workflow. This document reflects the decisions actually made, not a forward-looking proposal.
