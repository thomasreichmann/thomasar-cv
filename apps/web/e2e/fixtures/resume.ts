import { makeResumeContent } from "@thomasar-cv/db/testing/factories";

import { REGULAR_USER } from "../helpers/auth";
import { findUser, removeResume, seedResumeFor } from "../helpers/db";
import { test as authed, expect } from "./authenticated";

/**
 * Precondition fixtures (layer 2: factories -> fixtures -> scenarios, see
 * README.md). `seededResume` provisions a résumé owned by the signed-in user
 * through the back door and yields it, so a spec starts with a real row to open
 * instead of creating one through the UI first. It is torn down after the test;
 * the setup project's reset covers a run that crashes before teardown.
 */
interface ResumeFixtures {
  seededResume: { id: string; name: string };
}

export const test = authed.extend<ResumeFixtures>({
  seededResume: async ({}, use, testInfo) => {
    const owner = await findUser(REGULAR_USER.email);
    if (!owner) {
      throw new Error(
        "seededResume: the e2e user does not exist; the setup project must run first.",
      );
    }
    // A name unique to this test keeps parallel specs from asserting on each
    // other's rows.
    const name = `E2E · ${testInfo.title}`.slice(0, 80);
    const row = await seedResumeFor({
      userId: owner.id,
      name,
      content: makeResumeContent({ headerName: name }),
    });

    await use({ id: row.id, name: row.name });

    await removeResume(row.id);
  },
});

export { expect };
