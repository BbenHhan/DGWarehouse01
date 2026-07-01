# Research: Progress Tracker Web Migration

All Technical Context items were resolvable directly from the user-confirmed stack
and the project constitution — no open `NEEDS CLARIFICATION` markers remain. The
items below record the decisions that shape the data model and Server Action
design, plus the reasoning for defaults not explicitly given by the user.

## 1. Auth flow

- **Decision**: Supabase Auth with magic link (email OTP link) as the primary
  sign-in method, `@supabase/ssr` for session handling, and Next.js `middleware.ts`
  refreshing the session cookie on every request. Google OAuth is wired as an
  alternate provider on the same login screen.
- **Rationale**: Matches constitution Principle VII (single-user auth via
  Supabase, magic link or Google OAuth) and the user's explicit request. Magic
  link needs no password management for a single user.
- **Alternatives considered**: Custom email/password — rejected, adds password
  reset/hashing surface area with no benefit for one user. NextAuth.js — rejected,
  redundant given Supabase Auth is already the data platform.

## 2. Supabase client boundary

- **Decision**: Two client factories — `lib/supabase/server.ts` (service role
  key, used only inside Server Actions and Server Components) and
  `lib/supabase/client.ts` (anon key, used only in Client Components for realtime
  subscriptions and read-only display).
- **Rationale**: Directly required by constitution Principle II; keeps the
  service role key out of any bundle shipped to the browser.
- **Alternatives considered**: Single shared client — rejected, would require
  passing the service role key to the browser or duplicating logic awkwardly.

## 3. File upload path

- **Decision**: Client selects files and submits them as `FormData` to a Server
  Action. The Server Action streams each file to the appropriate Supabase Storage
  bucket (`photos` or `documents`) via the server-side client, then inserts a
  matching metadata row. Batch uploads loop per-file inside one Server Action
  invocation and return a per-file result array (`{ fileName, success, error? }`).
- **Rationale**: Server Actions are the only sanctioned mutation path (Principle
  II); per-file result reporting satisfies FR-005 and US3's "partial batch
  failure" acceptance scenario.
- **Alternatives considered**: Direct client-to-Storage upload with a signed URL
  — rejected for this iteration because it would bypass the Server Action
  mutation boundary the constitution mandates; can be revisited later purely as
  a performance optimization if upload sizes become a bottleneck.

## 4. Upload limits

- **Decision**: 25 MB max per file, 20 files max per batch upload.
- **Rationale**: The spec deliberately left exact numeric limits as an
  implementation decision (see spec Assumptions). 25 MB comfortably covers
  typical smartphone photos (including HEIC) and common document sizes while
  staying under typical serverless function payload/time budgets; 20 files per
  batch keeps a single Server Action invocation fast enough to feel responsive.
- **Alternatives considered**: Unlimited size/count — rejected, risks slow or
  failing uploads on mobile networks with no clear user benefit.

## 5. Optimistic delete

- **Decision**: Client-side optimistic state update (React `useOptimistic` or
  equivalent local state) removes the item immediately on delete confirmation;
  if the `deletePhoto`/`deleteDoc` Server Action fails, the item is restored and
  an error toast is shown.
- **Rationale**: Directly required by constitution Principle V and spec FR-011 /
  SC-003 (removal within 1 second of confirmation, before the network request
  necessarily completes).
- **Alternatives considered**: Wait for server confirmation before removing from
  view — rejected, does not meet the sub-1-second UX requirement on slower
  connections.

## 6. Week creation model

- **Decision**: Weeks are rows in a `weeks` table scoped to a `room_id` +
  `work_type_id` pair, created on demand via an "add week" action in the UI
  (auto-incrementing a `week_number` per room/work-type). Rooms, work types, and
  document categories are fixed, seeded once via migration and not user-editable.
- **Rationale**: Matches the spec Assumption that weeks are open-ended while
  rooms/work types/categories mirror the fixed v7 structure.
- **Alternatives considered**: Fully free-text week labels — rejected, breaks
  chronological ordering and consistent display; a numbered sequence per
  room/work-type keeps ordering deterministic while still being open-ended.

## 7. Image delivery

- **Decision**: Supabase Storage buckets configured for public read access;
  Next.js `<Image>` consumes the public URL directly, with `next.config`
  `images.remotePatterns` allow-listing the Supabase project's storage domain.
- **Rationale**: Required by constitution Principle III; public-read buckets are
  the standard Supabase pattern for this use case since write/delete stay gated
  behind Server Actions and RLS regardless of read being public.
- **Alternatives considered**: Signed URLs per request — rejected as unnecessary
  complexity for a single-user, non-sensitive photo archive; adds latency to
  every image load for no real access-control benefit here.

## 8. Realtime usage

- **Decision**: Client-side Supabase Realtime subscription on the `photos` and
  `documents` tables, scoped to the currently viewed week/category, to refresh
  the view if the same user makes a change from another device/tab.
- **Rationale**: Constitution Principle II explicitly calls out the client
  Supabase client for "realtime/display"; the spec's multi-device edge case
  (same item edited from phone and desktop) is best served by picking up the
  other session's change automatically rather than requiring a manual refresh.
- **Alternatives considered**: Polling — rejected, unnecessary overhead when
  Supabase Realtime is already part of the platform.

## 9. Seed script scope

- **Decision**: `supabase/seed/seed-from-v7.ts` is an optional, one-time Node
  script run locally (not deployed) that walks the v7 local folder structure,
  uploads each file to the matching Storage bucket, and inserts corresponding
  metadata rows. It is not part of the production app and is not required for
  the feature to be considered complete.
- **Rationale**: Spec lists this as explicitly optional; keeping it as a
  standalone script avoids coupling the production app's code paths to a
  one-time migration concern.
- **Alternatives considered**: Building an in-app "import" UI — rejected as
  scope creep for a single one-time operation.
