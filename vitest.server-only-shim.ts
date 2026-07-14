// Next.js's own bundler swaps the real "server-only" package (which
// unconditionally throws — it relies on webpack aliasing it away for
// genuine server bundles) for a no-op when building server code. Vitest has
// no such bundler-level swap, so vitest.config.ts aliases "server-only" to
// this empty module instead, for the same effect (specs/005-automated-testing).
export {};
