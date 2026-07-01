// TEMPORARY: no Supabase project is configured yet, so auth is disabled
// end-to-end (middleware redirect + every requireUser() check) to let the
// app run without signing in.
//
// Flip this back to `true` once a real Supabase project + credentials exist
// (see DEPLOYMENT.md) — every other auth code path (login page, callback
// route, requireUser()) is already written and just needs this flag.
export const AUTH_REQUIRED = false;
