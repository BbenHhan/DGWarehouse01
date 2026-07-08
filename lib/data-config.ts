export type DataSource = "local" | "mock" | "supabase";

// "local": starts empty, real uploads persisted to a git-ignored disk folder
//   (see lib/local/store.ts) — the interim backend from Constitution III,
//   used because no live Supabase project exists yet. Upload/edit/delete UI
//   is fully active in this mode.
// "mock": read-only snapshot of the real v7 folder (the v1 checkpoint) — all
//   mutation UI is hidden since there's nothing real to write to.
// "supabase": the target production backend once a real project is wired up
//   (see DEPLOYMENT.md). No other code changes needed to switch to it.
// Wrapped in a function so DATA_SOURCE's type stays the DataSource union
// instead of narrowing to the literal "local" — TypeScript narrows a `const`
// initialized directly to one literal for comparisons later in this same
// file, which would make the line below a same-file type error.
function resolveDataSource(): DataSource {
  return "supabase";
}

export const DATA_SOURCE = resolveDataSource();

export const USE_MOCK_DATA = DATA_SOURCE === "mock";
