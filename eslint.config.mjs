import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next@15 ships legacy (.eslintrc-style) configs rather than
// flat-config arrays — FlatCompat bridges the two for ESLint 9's flat config.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // .next-e2e/ is the build the browser-driven run makes (specs/049) — build
  // output, the same as .next/, and not ours to lint.
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
