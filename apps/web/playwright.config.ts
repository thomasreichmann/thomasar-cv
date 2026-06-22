import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

/**
 * Load apps/web/.env.e2e without overriding anything already set, so one config
 * works three ways: `pnpm test:e2e` (scripts/e2e.mjs has already set the vars), a
 * direct `playwright test` against an already-running ephemeral database (this
 * load supplies them), and CI (its job-level DATABASE_URL / BETTER_AUTH_SECRET
 * are left untouched). Keeps the run off the shared Supabase project no matter
 * how Playwright is invoked.
 */
function loadE2EEnv() {
  const file = fileURLToPath(new URL("./.env.e2e", import.meta.url));
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    const key = match?.[1];
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = match[2] ?? "";
  }
}
loadE2EEnv();

// A dedicated port so the e2e server never collides with (or gets reused in
// place of) a normal `pnpm dev` on 3000, which points at the real database.
const PORT = process.env.E2E_PORT ?? "3100";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Projects run in stages: `setup` resets the database and saves the signed-in
 * storage state; `smoke` and `flows` then run, depending on it. Authenticated
 * specs opt into that state via the `authenticated` fixture. `webServer` boots
 * the app pointed at the ephemeral database (DATABASE_URL set here wins over the
 * app's .env.local), reused locally and started fresh in CI.
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
    {
      name: "flows",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /flows\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT,
      // Separate build dir so this server coexists with a normal `next dev` on
      // .next (Next's dev lock is per build dir). See next.config.ts.
      NEXT_DIST_DIR: ".next-e2e",
      // Pin the auth base URL to the e2e origin so BetterAuth doesn't fall back
      // to deriving it per-request (which it warns about).
      BETTER_AUTH_URL: BASE_URL,
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
    },
  },
});
