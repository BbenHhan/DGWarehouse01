import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // See vitest.server-only-shim.ts for why this alias exists.
      "server-only": path.resolve(__dirname, "vitest.server-only-shim.ts"),
    },
  },
  // tsconfig.json sets "jsx": "preserve" because Next.js does its own JSX
  // transform at build time. Vitest honours that tsconfig setting and would
  // hand untransformed JSX straight to the bundler, so component tests fail to
  // parse — this overrides it with the standard automatic runtime for tests
  // only, leaving the app's own build untouched.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    // e2e/ belongs to Playwright, which brings its own `test` and `expect`.
    // Vitest would otherwise try to collect those files and fail on the import.
    exclude: [...configDefaults.exclude, "e2e/**"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
