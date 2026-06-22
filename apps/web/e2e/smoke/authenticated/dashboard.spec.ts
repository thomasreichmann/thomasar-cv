import { expect, test } from "../../fixtures/authenticated";

/**
 * The end-to-end proof that the chosen auth approach works: a request carrying
 * the worker user's session cookie (loaded via the authenticated fixture) passes
 * the server-side session check on the protected dashboard. The email is rendered
 * from that server-resolved session, so seeing it is the proof; the heading and
 * "New résumé" control confirm the management surface (#36) mounts.
 */
test("a signed-in user reaches the résumé dashboard", async ({
  page,
  workerAccount,
}) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Your résumés" }),
  ).toBeVisible();
  await expect(page.getByText(workerAccount.email)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New résumé" }),
  ).toBeVisible();
});
