import { REGULAR_USER } from "../../helpers/auth";
import { expect, test } from "../../fixtures/authenticated";

/**
 * The end-to-end proof that the chosen auth approach works: a request carrying
 * the seeded user's session cookie (loaded via the authenticated fixture)
 * passes the server-side session check on the protected dashboard.
 */
test("a signed-in user reaches the protected dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Your account" }),
  ).toBeVisible();
  await expect(page.getByText("Signed in as")).toBeVisible();
  await expect(page.getByText(REGULAR_USER.email)).toBeVisible();
});
