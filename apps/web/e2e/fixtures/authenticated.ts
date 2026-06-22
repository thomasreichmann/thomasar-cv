import { USER_STATE_PATH } from "../helpers/auth";
import { test as base, expect } from "./console";

/**
 * Test fixture preloaded with the seeded user's signed-in storage state.
 * Specs that import `test` from here start already authenticated; the state is
 * produced by `global.setup.ts`. It extends the console fixture, so the
 * console-error guard rides along with every authenticated spec.
 */
export const test = base.extend({
  storageState: USER_STATE_PATH,
});

export { expect };
