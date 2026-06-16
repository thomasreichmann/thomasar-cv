import { test as base, expect } from "@playwright/test";

import { USER_STATE_PATH } from "../helpers/auth";

/**
 * Test fixture preloaded with the seeded user's signed-in storage state.
 * Specs that import `test` from here start already authenticated; the state is
 * produced by `global.setup.ts`.
 */
export const test = base.extend({
  storageState: USER_STATE_PATH,
});

export { expect };
