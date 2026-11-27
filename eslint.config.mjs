import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslint-config-next@16 ships flat-config arrays, so they are spread in
// directly. v15 shipped legacy (.eslintrc-style) configs and needed FlatCompat
// to bridge them; keeping that bridge against v16 made ESLint 10 die with
// "Converting circular structure to JSON", because it re-wrapped a config that
// was already flat.
const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  // .next-e2e/ is the build the browser-driven run makes (specs/049) — build
  // output, the same as .next/, and not ours to lint.
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
