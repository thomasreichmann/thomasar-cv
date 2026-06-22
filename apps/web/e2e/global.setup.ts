import { test as setup } from "@playwright/test";

import {
  REGULAR_USER,
  USER_STATE_PATH,
  ensureUserAndSaveState,
} from "./helpers/auth";
import { resetDb } from "./helpers/db";

/**
 * Brings the database to a known state and persists the signed-in user. Runs
 * once before the suites (as the `setup` dependency): it empties the database so
 * every run starts clean regardless of what a previous run left, then creates
 * the shared user and saves its cookie so authenticated specs load it instead of
 * signing in themselves.
 */
setup(
  "reset the database and authenticate the regular user",
  async ({ request, baseURL }) => {
    await resetDb();
    await ensureUserAndSaveState(
      request,
      baseURL ?? "http://localhost:3100",
      REGULAR_USER,
      USER_STATE_PATH,
    );
  },
);
