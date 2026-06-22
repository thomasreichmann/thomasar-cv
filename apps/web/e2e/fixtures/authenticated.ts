import { request as apiRequest } from "@playwright/test";

import {
  ensureUserAndSaveState,
  userForWorker,
  userStatePath,
} from "../helpers/auth";
import { findUser } from "../helpers/db";
import { test as base, expect } from "./console";

/** The signed-in account a worker's authenticated specs run as. */
export interface WorkerAccount {
  id: string;
  email: string;
  name: string;
  statePath: string;
}

/**
 * Authenticated specs run as a per-worker user (see helpers/auth). `workerAccount`
 * is worker-scoped: it provisions the worker's user once through the real
 * BetterAuth HTTP endpoints, saves its session cookie, and reads back the row id
 * so a fixture can seed data the user owns. `storageState` then loads that cookie,
 * so every spec importing `test` from here starts already signed in as a user no
 * other worker shares.
 */
export const test = base.extend<
  { storageState: string },
  { workerAccount: WorkerAccount }
>({
  workerAccount: [
    async ({}, use, workerInfo) => {
      const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
      const user = userForWorker(workerInfo.parallelIndex);
      const statePath = userStatePath(workerInfo.parallelIndex);

      // A request context (not the test-scoped `request` fixture, which worker
      // fixtures can't use) signs the user up and saves its cookie to statePath.
      const context = await apiRequest.newContext({ baseURL });
      await ensureUserAndSaveState(context, baseURL, user, statePath);
      await context.dispose();

      const owner = await findUser(user.email);
      if (!owner) {
        throw new Error(
          `workerAccount: ${user.email} was provisioned but no row was found.`,
        );
      }

      await use({ id: owner.id, email: user.email, name: user.name, statePath });
    },
    { scope: "worker" },
  ],
  storageState: async ({ workerAccount }, use) => {
    await use(workerAccount.statePath);
  },
});

export { expect };
