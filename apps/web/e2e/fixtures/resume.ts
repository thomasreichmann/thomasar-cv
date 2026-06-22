import { makeResumeContent } from "@thomasar-cv/db/testing/factories";

import { removeResume, seedResumeFor } from "../helpers/db";
import { test as authed, expect } from "./authenticated";

/**
 * Precondition fixtures (layer 2: factories -> fixtures -> scenarios, see
 * README.md). `seededResume` provisions a résumé owned by the signed-in worker
 * user through the back door and yields it, so a spec starts with a real row to
 * open instead of creating one through the UI first. It is torn down after the
 * test; the setup project's reset covers a run that crashes before teardown.
 */
interface ResumeFixtures {
  seededResume: { id: string; name: string };
}

export const test = authed.extend<ResumeFixtures>({
  seededResume: async ({ workerAccount }, use, testInfo) => {
    // The name is per-test only so failures are legible; isolation comes from
    // per-worker ownership (workerAccount), not the name.
    const name = `E2E · ${testInfo.title}`.slice(0, 80);
    const row = await seedResumeFor({
      userId: workerAccount.id,
      name,
      content: makeResumeContent({ headerName: name }),
    });

    await use({ id: row.id, name: row.name });

    await removeResume(row.id);
  },
});

export { expect };
