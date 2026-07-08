# Implementation Plan: User Account Menu & Sign Out

**Branch**: `004-user-account-menu` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-user-account-menu/spec.md`

## Summary

Add an avatar + dropdown account menu to the shared header, sourced from the
current Supabase session (already established by the existing auth system).
Sign out is implemented as a Server Action using the session-aware Supabase
client, so cookies are cleared server-side and the browser is redirected to
`/login` in one round trip. The menu is entirely absent when no session exists
(covers both the interim auth-disabled dev mode and any unexpected no-session
render), so nothing new is introduced to break that mode.

## Technical Context

**Language/Version**: TypeScript 5 (Next.js 15 App Router, existing project — unchanged)

**Primary Dependencies**: Two new shadcn/ui primitives added via the existing
shadcn CLI setup (`components.json`, style `base-nova` / Base UI): `dropdown-menu`
and `avatar`. No other new dependency — `@supabase/ssr`'s existing session client
already exposes `auth.signOut()` and `auth.getUser()`.

**Storage**: N/A — this feature reads/mutates auth session state only, not
application data (`DATA_SOURCE` is unaffected).

**Testing**: Manual verification via the Claude Preview browser tool (no
automated test runner in this project) — `tsc --noEmit`, `next lint`, and the
live scenarios in `quickstart.md`, now runnable end-to-end for the first time
against the real Supabase project set up this session.

**Target Platform**: Web (Next.js dev server), mobile-first per Constitution IV.

**Project Type**: Web application (single Next.js project).

**Performance Goals**: N/A — a header menu and one auth call, not a
performance-sensitive path.

**Constraints**: Must not render anything (avatar or menu) when there is no
session — must degrade identically whether `AUTH_REQUIRED` is `false` (dev mode)
or `true` with an unexpectedly missing session (FR-007). Must not leave the user
in an ambiguous signed-out-looking-but-still-signed-in state on failure (FR-009).

**Scale/Scope**: 1 new Server Action (`signOut`), 1 new server-side read helper
(`getCurrentUser`), 1 new component (`AccountMenu`), 2 new shadcn/ui primitives,
1 existing component extended (`Header`), 1 existing layout extended
(`app/(app)/layout.tsx`), 1 `next.config.ts` remote-image-pattern addition (for
Google-hosted avatar photos).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only** — ✅ No new routes; existing layout/header extended.
- **II. Server Actions & Supabase Client Boundary** — ✅ `signOut` is a new
  Server Action using `createSessionClient()` (the same cookie-aware client
  already used for `auth.getUser()` checks) — not the service-role client,
  since ending one's own session isn't a privileged app-data mutation.
- **III. Storage-Agnostic File Persistence with a Cloud Migration Path** — ✅
  Not implicated for app data; the avatar photo is a third-party (Google)
  profile image, unrelated to the `DATA_SOURCE` backends. Still rendered via
  Next.js `<Image>` per the spirit of this principle, requiring one new
  `remotePatterns` entry in `next.config.ts` for Google's avatar host.
- **IV. Thai-First, Mobile-First UI** — ✅ Menu copy in Thai ("ออกจากระบบ" etc.);
  avatar/menu sized to fit the existing mobile-first header without crowding
  the logo or stat chips.
- **V. Resilient Async UX** — ✅ Sign-out button shows a busy state during the
  request (FR-008) and a clear error via the existing `toast` pattern on
  failure (FR-009) — directly required by this principle already.
- **VI. Tailwind-Only Styling** — ✅ New primitives added via the project's
  existing shadcn CLI config, matching current component conventions exactly.
- **VII. Single-User Auth via Supabase** — ✅ This feature is precisely the
  "sign out" capability this principle's auth system was missing a UI for; no
  multi-user concepts introduced.
- **VIII. Universal File Attachments** — ✅ Not implicated (no upload surface).

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-user-account-menu/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── server-actions-delta.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
components/ui/dropdown-menu.tsx    # new — via shadcn CLI
components/ui/avatar.tsx           # new — via shadcn CLI
components/AccountMenu.tsx         # new — client component: avatar + dropdown + sign-out button
app/actions/auth.ts                # new — signOut Server Action
lib/supabase/server.ts             # + getCurrentUser(): non-throwing session read for display
components/Header.tsx              # + renders <AccountMenu> when a user is present
app/(app)/layout.tsx                # + fetches current user, passes to <Header>
next.config.ts                     # + images.remotePatterns entry for Google avatar host
```

**Structure Decision**: No new projects/directories. Same-project addition:
one new Server Action file (mirrors the existing `app/actions/photos.ts` /
`documents.ts` pattern), one new small client component (mirrors
`AddWeekButton`/`EditModal`'s "narrow interactive island" pattern), and two
shadcn primitives added the same way the existing ones already in
`components/ui/` were.

## Complexity Tracking

*No violations — table omitted.*
