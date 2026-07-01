// v1: no live Supabase project yet — show real data read directly from the
// local v7 folder instead of a database. All mutation UI (upload/edit/
// delete) is hidden while this is true, since there's no real backend to
// write to. Flip to `false` once Supabase is wired up (see DEPLOYMENT.md)
// to switch back to the fully-built Supabase data layer with no other code
// changes needed.
export const USE_MOCK_DATA = true;
