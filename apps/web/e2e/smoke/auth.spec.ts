import { expect, test } from "@playwright/test";

// Runs unauthenticated (the bare `smoke` project carries no storage state).
test.describe("auth (signed out)", () => {
  test("sign-in page renders the form", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("the dashboard redirects to sign-in when signed out", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
