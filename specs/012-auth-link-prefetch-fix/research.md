# Research: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

## Decision 1: An intermediate "click to confirm" page, not an automatic redirect

**Decision**: New route `app/auth/confirm/page.tsx` (client component). The emailed link points here instead of directly to `/auth/callback`. This page reads `code`/`next` from the URL but does **not** call `exchangeCodeForSession` on load — it renders a button; the code exchange only happens inside that button's `onClick` handler.

**Rationale**: This is the standard, widely-used mitigation for exactly this class of problem (an automated GET consuming a one-time-use token) — since a plain HTTP prefetch loads the page's HTML but doesn't execute a click, the code stays untouched until a real person acts. This directly satisfies FR-001/FR-002 ("non-interactive visit MUST NOT consume the code" / "only an explicit action consumes it").

**Alternatives considered**:
- Requiring an OTP re-entry instead of a link — rejected as a much bigger UX change (an extra code the person has to copy/type) for a problem a same-page button click already solves.
- Rate-limiting or fingerprinting to detect "bot-like" requests to `/auth/callback` — rejected as fragile and adversarial (email scanners look exactly like a normal first browser request; there's no reliable signal to distinguish them without user interaction, which is exactly what Decision 1 already provides directly).

## Decision 2: `/auth/callback` stays exactly as-is, only used by Google OAuth going forward

**Decision**: `app/auth/callback/route.ts` is not modified at all. Only the `emailRedirectTo`/`redirectTo` values passed to `signUp()` and `resetPasswordForEmail()` (in `app/login/page.tsx`) change, from `${origin}/auth/callback` to `${origin}/auth/confirm` (and `${origin}/auth/confirm?next=/reset-password` for the reset flow, replacing `${origin}/auth/callback?next=/reset-password`). Google OAuth's `redirectTo` in `handleGoogleSignIn` is untouched.

**Rationale**: Google's OAuth code arrives via a direct redirect from Google's own consent screen — never a link sitting in an email inbox — so it was never exposed to prefetching (FR-007/SC-003's "must not be touched" requirement). Leaving `/auth/callback` untouched is both the smallest change and removes any risk of regressing the already-working, already-verified OAuth flow.

## Decision 3: `exchangeCodeForSession` runs client-side, not via a new server route

**Decision**: `/auth/confirm`'s button handler calls `supabase.auth.exchangeCodeForSession(code)` using the existing browser client (`lib/supabase/client.ts`), the same one already used for sign-in/sign-up/reset-password on this app's login page — not a new POST endpoint or Server Action.

**Rationale**: The PKCE `code_verifier` needed to complete the exchange was stored (as a cookie) by whichever browser initiated the `signUp()`/`resetPasswordForEmail()` call in the first place — the exchange has to happen in that same browser regardless of whether it's triggered by a server route or client code. Doing it client-side keeps this consistent with every other auth operation on this page (Constitution II — Server Actions are for app-data mutations; Supabase Auth session establishment already uses the client-side flow throughout this app, e.g. `/reset-password/page.tsx`'s `updateUser` call), and avoids introducing a new API surface for a single button click.

**Alternatives considered**: Having the button `onClick` navigate to `/auth/callback?code=...` (reusing the existing server route) — rejected because that just moves the "auto-exchange on GET" problem one click later without actually changing its nature; the button would still be triggering a plain navigational GET, indistinguishable in principle from what a very aggressive scanner could still trigger. Calling `exchangeCodeForSession` directly inside the click handler is the more direct fix.

## Decision 4: Genuinely invalid links still show the existing error pattern

**Decision**: If `code` is missing from `/auth/confirm`'s URL, or `exchangeCodeForSession` itself returns an error (real expiry, already completed, tampered link), the page shows the same "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว" message pattern already used elsewhere in the app (`app/login/page.tsx`'s `EXPIRED_LINK_ERROR`, `app/reset-password/page.tsx`'s no-session state), with a link back to `/login`.

**Rationale**: Satisfies FR-004/SC-002 — this fix must not turn a real invalid-link case into a silent or ambiguous outcome; reusing the exact existing message keeps the app's error vocabulary consistent rather than inventing new wording for what is, from the user's perspective, the same situation as before.

## Decision 5: Accepted scope boundary — this defends against passive prefetch, not a scanner that fully executes JavaScript and interacts with the page

**Decision**: This fix is scoped to the realistic, common case: security scanners that fetch a URL's HTML (and sometimes its linked resources) without executing arbitrary JavaScript click handlers or driving a full interactive browser session. It is not designed to defeat a hypothetical scanner sophisticated enough to run a full headless browser and programmatically click buttons.

**Rationale**: This matches how virtually every real-world implementation of this mitigation (Supabase's own guidance, and the equivalent pattern used by other auth providers) scopes the problem — the overwhelming majority of email-security prefetching is exactly the "plain GET" case this closes off; defending against a fully interactive bot is a different, much rarer threat model not evidenced by the bug report that motivated this feature.
