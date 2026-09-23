import { defineConfig, devices } from "@playwright/test";
import { E2E_DATA_DIR } from "./e2e/fixture";

// specs/049-end-to-end-scenarios.
//
// The scenarios that need to reach the editing controls, which means an
// instance started with sign-in off. The signed-out scenario needs the opposite
// and has a configuration of its own (playwright.guarded.config.ts), run after
// this one — deliberately not both at once. Two development servers watching
// the same project each see the other writing its build directory, decide the
// source has changed and rebuild; a page asked for mid-rebuild can wait minutes,
// which is what one scenario per run used to do.
export const APP_PORT = 3210;

export const serverEnv = {
  NEXT_PUBLIC_DATA_SOURCE: "local",
  LOCAL_DATA_DIR: E2E_DATA_DIR,
  NEXT_DIST_DIR: ".next-e2e",
};

export const shared = {
  testDir: "./e2e",
  // A flake that passes on a retry is a flake nobody fixes (SC-004).
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: (process.env.CI ? "line" : "list") as "line" | "list",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
};

export default defineConfig({
  ...shared,
  projects: [
    {
      name: "app",
      testIgnore: /signed-out\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${APP_PORT}` },
    },
  ],
  webServer: {
    command: `npx next dev -p ${APP_PORT}`,
    url: `http://localhost:${APP_PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Never reaches a deployment: lib/auth-config.ts ignores this whenever the
    // deployment environment is present.
    env: { ...serverEnv, AUTH_REQUIRED: "false" },
  },
});
