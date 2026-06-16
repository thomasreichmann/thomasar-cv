import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Two-stage run: the `setup` project seeds the shared test user and saves its
 * signed-in storage state; `smoke` then runs the specs (authenticated specs
 * opt into that state via the `authenticated` fixture). `webServer` boots the
 * app and is reused locally but always started fresh in CI.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /smoke\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
