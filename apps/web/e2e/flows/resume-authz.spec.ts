import { randomUUID } from "node:crypto";

import { makeResumeContent } from "@thomasar-cv/db/testing/factories";

import { expect, test } from "../fixtures/authenticated";
import { removeResume, seedResumeFor, seedUserRow } from "../helpers/db";

/**
 * The cross-tenant boundary, proven through the browser: signed in as the worker
 * user, a deep link to a résumé owned by someone else resolves to "not found",
 * never the editor. Ownership is enforced in `resume.get` (NOT_FOUND for another
 * user's row); this is the end-to-end check that the editor honors it rather than
 * leaking the document. The foreign owner is a back-door row - it never signs in,
 * so a bare `seedUserRow` is enough; the setup project's reset clears it.
 */

// The deliberate NOT_FOUND comes back as HTTP 404, which the browser logs as a
// failed resource load. That console error is expected here, so declare it; the
// guard still fails the test on anything else (see fixtures/console).
test.use({ expectedConsoleErrors: [/the server responded with a status of 404/] });

test("a résumé owned by another user is not reachable", async ({ page }) => {
  const foreignOwner = await seedUserRow({ id: `foreign-${randomUUID()}` });
  const foreignResume = await seedResumeFor({
    userId: foreignOwner.id,
    name: "Another user's résumé",
    content: makeResumeContent({ headerName: "Another user" }),
  });

  try {
    await page.goto(`/resume/${foreignResume.id}`);

    await expect(
      page.getByRole("heading", { name: "Résumé not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Résumé name" }),
    ).toBeHidden();
  } finally {
    await removeResume(foreignResume.id);
  }
});
