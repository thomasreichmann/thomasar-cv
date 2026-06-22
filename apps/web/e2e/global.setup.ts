import { test as setup } from "@playwright/test";

import { resetDb } from "./helpers/db";

/**
 * Brings the database to a known state before the suites run (as the `setup`
 * dependency). It empties the database so every run starts clean regardless of
 * what a previous run left. Authentication is no longer done here: each worker
 * provisions and signs in its own user lazily (see fixtures/authenticated), so
 * this only has to guarantee the clean slate they build on.
 */
setup("reset the database", async () => {
  await resetDb();
});
