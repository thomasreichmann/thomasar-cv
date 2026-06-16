import { test as setup } from "@playwright/test";

import { REGULAR_USER, USER_STATE_PATH, ensureUserAndSaveState } from "./helpers/auth";

/**
 * Seeds the shared test user and persists its signed-in state. Runs once
 * before the smoke suite (as the `setup` project dependency) so authenticated
 * specs can load the cookie instead of signing in themselves.
 */
setup("seed and authenticate the regular user", async ({ request, baseURL }) => {
  await ensureUserAndSaveState(
    request,
    baseURL ?? "http://localhost:3000",
    REGULAR_USER,
    USER_STATE_PATH,
  );
});
