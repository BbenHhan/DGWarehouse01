# Server Actions Contract Delta: `signOut` (new)

New file `app/actions/auth.ts`, alongside the existing action files
(`app/actions/photos.ts`, `app/actions/documents.ts`).

## New action

```ts
signOut(): Promise<void>
```

Unlike every other Server Action in this app, `signOut` does not return an
`ActionResult<T>` — it either redirects (via `next/navigation`'s `redirect()`,
which throws internally to abort rendering) on success, or throws a real error
on failure, which the calling Client Component (`AccountMenu`) catches to show
`toast.error`. This matches how `redirect()` already has to be used in Next.js
Server Actions (it cannot be "returned" as a normal value).

**Behavior**:
1. Get the session-aware client via `createSessionClient()`.
2. Call `supabase.auth.signOut()`.
3. If it errors, throw (caught by the caller).
4. If it succeeds, `redirect("/login")`.

**Caller** (`components/AccountMenu.tsx`, new): calls `signOut()` inside a
`useTransition`, matching the existing pattern in `DeleteWeekButton`/
`AddWeekButton` — button shows a busy label while pending, `toast.error` on a
caught failure.

## New read helper (not a Server Action, but part of this feature's contract)

```ts
// lib/supabase/server.ts
getCurrentUser(): Promise<{ email: string; name: string | null; avatarUrl: string | null } | null>
```

Called from `app/(app)/layout.tsx` (Server Component) and passed down to
`Header` → `AccountMenu`. Returns `null` whenever `AUTH_REQUIRED` is `false` or
no session exists — never throws.
