import { defineConfig, devices } from "@playwright/test";
import { serverEnv, shared } from "./playwright.config";

// specs/049-end-to-end-scenarios US5: the same app, the same data, started the
// way production starts it — sign-in required. Its own run rather than a second
// server beside the other one, because two development servers watching one
// project keep invalidating each other's builds.
const GUARDED_PORT = 3211;

export default defineConfig({
  ...shared,
  projects: [
    {
      name: "guarded",
      testMatch: /signed-out\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${GUARDED_PORT}` },
    },
  ],
  webServer: {
    command: `npx next dev -p ${GUARDED_PORT}`,
    url: `http://localhost:${GUARDED_PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: serverEnv,
  },
});
