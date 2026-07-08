---

description: "Task list for User Account Menu & Sign Out"

---

# Tasks: User Account Menu & Sign Out

**Input**: Design documents from `/specs/004-user-account-menu/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions-delta.md, quickstart.md

**Tests**: Not included — project has no automated test runner configured; verification is via `tsc --noEmit`, `next lint`, and the live scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

- [X] T001 Add the `dropdown-menu` and `avatar` shadcn/ui primitives via the project's existing CLI config (`npx shadcn@latest add dropdown-menu avatar`), producing `components/ui/dropdown-menu.tsx` and `components/ui/avatar.tsx` in the same Base UI `render`-prop style as the existing primitives

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the session-read/sign-out capability and image config every user story's UI depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `getCurrentUser()` to `lib/supabase/server.ts`: returns `{ email: string; name: string | null; avatarUrl: string | null } | null`; returns `null` immediately when `!AUTH_REQUIRED`, otherwise reads `auth.getUser()` via `createSessionClient()` and maps `user.email`, `user.user_metadata.full_name`, `user.user_metadata.avatar_url` — never throws
- [X] T003 [P] Create `app/actions/auth.ts` with a `signOut(): Promise<void>` Server Action per contracts/server-actions-delta.md: `createSessionClient()` → `auth.signOut()` → throw on error, else `redirect("/login")` from `next/navigation`
- [X] T004 [P] Add a `remotePatterns` entry to `next.config.ts` for Google's avatar host (`lh3.googleusercontent.com`) so `next/image` can render Google profile photos

**Checkpoint**: `tsc --noEmit` passes; `getCurrentUser()` returns `null` in dev mode and real user info once signed in; `signOut()` can be invoked and clears the session.

---

## Phase 3: User Story 1 - See who is signed in (Priority: P1) 🎯 MVP

**Goal**: An avatar representing the signed-in user appears in the header on every page, with a non-broken fallback when there's no profile picture.

**Independent Test**: Sign in, confirm an avatar renders on every page; confirm it falls back to initials/icon when no `avatarUrl` exists (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T005 [US1] Create `components/AccountMenu.tsx` (new client component): accepts `{ email, name, avatarUrl }` props; renders the shadcn `Avatar` using `avatarUrl` when present, otherwise `AvatarFallback` showing initials derived from `name` or the email's local part
- [X] T006 [US1] Update `components/Header.tsx` to accept an optional `user: { email: string; name: string | null; avatarUrl: string | null } | null` prop and render `<AccountMenu {...user} />` only when `user` is non-null (renders nothing extra when `null`, satisfying FR-007 at the component level)
- [X] T007 [US1] Update `app/(app)/layout.tsx` to call `getCurrentUser()` alongside the existing `Promise.all` data fetches and pass the result as the `user` prop to `<Header>`

**Checkpoint**: Avatar (or fallback) visible on every authenticated page; nothing renders when signed out/dev-mode.

---

## Phase 4: User Story 2 - Sign out (Priority: P1)

**Goal**: Clicking the avatar opens a dropdown with the account's email and a working sign-out control that ends the real session.

**Independent Test**: Click avatar → see email + sign-out option → click sign out → land on `/login` → confirm direct navigation to any app page redirects back to `/login` (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T008 [US2] In `components/AccountMenu.tsx`, wrap the `Avatar` in a shadcn `DropdownMenu`/`DropdownMenuTrigger`, with `DropdownMenuContent` showing the account's `email` (and `name` if present) as a non-interactive label, plus a `DropdownMenuItem` labeled "ออกจากระบบ" (sign out)
- [X] T009 [US2] Wire the sign-out `DropdownMenuItem`'s `onClick` to call the `signOut()` Server Action from `app/actions/auth.ts` inside a `useTransition`, matching the existing `DeleteWeekButton`/`AddWeekButton` pattern
- [X] T010 [US2] While the sign-out transition is pending, disable the dropdown item and show a busy label (e.g. "กำลังออกจากระบบ...") per FR-008; on a caught error, show `toast.error` per FR-009 and leave the menu/avatar in place (still signed in)

**Checkpoint**: Full sign-out flow works end-to-end against the real Supabase project; a second click during the pending state is a no-op (button disabled).

---

## Phase 5: User Story 3 - Account menu behaves correctly with no session (Priority: P2)

**Goal**: Confirm the auth-disabled dev mode and any no-session render path stay unaffected — no new logic expected beyond what US1's conditional render (T006) already provides.

**Independent Test**: With `AUTH_REQUIRED = false`, confirm the header renders with no avatar/menu and no errors (quickstart.md Scenario 4).

### Implementation for User Story 3

- [ ] T011 [US3] Verify (live, via Claude Preview) that setting `AUTH_REQUIRED = false` in `lib/auth-config.ts` results in `getCurrentUser()` returning `null`, `Header` receiving `user: null`, and no `AccountMenu` rendering, with zero console/runtime errors — no code change expected; if a gap is found, fix it in `lib/supabase/server.ts` or `components/Header.tsx`

**Checkpoint**: Dev mode (`AUTH_REQUIRED = false`) remains fully functional with no visual or runtime regressions.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
- [ ] T013 [P] Check the header at a 375px mobile viewport (Claude Preview mobile preset) — avatar and existing stat chips/logo must not overlap or clip (quickstart.md Scenario 5)
- [ ] T014 Run all 5 scenarios in `specs/004-user-account-menu/quickstart.md` against the live dev server with the real Supabase project (via the Claude Preview browser tool), including the busy-state/failure-handling checks in Scenario 3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — BLOCKS Phase 3 (T005 needs the `Avatar`/`DropdownMenu` primitives to exist).
- **Foundational (Phase 2)**: No dependencies on Phase 1's primitives — can run in parallel with Phase 1, but BLOCKS all user stories (T005–T011 all need `getCurrentUser`/`signOut`/the image config).
- **User Story 1 (Phase 3)**: Depends on Phase 1 + Phase 2. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on US1's `AccountMenu` component existing (T008–T010 extend the component T005 created) and on Foundational's `signOut` action (T003).
- **User Story 3 (Phase 5)**: Depends on US1's conditional-render logic (T006) existing — this phase is a verification checkpoint, not new logic.
- **Polish (Phase 6)**: Depends on US1–US3 being complete.

### Parallel Opportunities

- T001 (Setup) and T002–T004 (Foundational) can run in parallel — different files, no shared dependency.
- T002, T003, T004 (Foundational) touch three unrelated files and can run in parallel.
- T012 and T013 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (shadcn primitives) + Phase 2 (Foundational — session read, sign-out action, image config).
2. Complete Phase 3 (US1 — avatar visible everywhere).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently.
4. This alone already satisfies "see who's signed in," even before sign-out is wired up.

### Incremental Delivery

1. Setup + Foundational → US1 (avatar visible) → US2 (sign out works) → US3
   (no-session verification) → Polish.
2. Each story adds value without breaking the previous ones.
