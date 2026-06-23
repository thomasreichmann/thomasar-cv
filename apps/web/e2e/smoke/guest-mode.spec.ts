import { expect, test } from "../fixtures/console";

// Runs unauthenticated (the bare `smoke` project carries no storage state) -
// guest mode (issue #67) is precisely the no-session entry point. A fresh email
// per run keeps the sign-up unique against the shared e2e database.
function uniqueEmail() {
  return `guest-convert-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}

test.describe("guest mode (issue #67)", () => {
  test("try-it opens the editor; signing up keeps the work", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /try it/i }).click();

    // Lands straight in the editor on a single résumé, with the guest banner.
    await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+/i);
    await expect(page.getByText(/editing as a guest/i)).toBeVisible();

    // A guest has no dashboard: hitting it routes back to their one résumé.
    const editorUrl = page.url();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(editorUrl);

    // Make an identifiable, saved edit so we can prove it survives conversion.
    const resumeName = `Guest CV ${Date.now()}`;
    await page.getByLabel("Résumé name").fill(resumeName);
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.click();
    await expect(save).toBeDisabled(); // clean again once the write lands

    // Convert by creating an account (the banner's Sign up links to /sign-up;
    // Base UI keeps role="button" on it even rendered as an anchor).
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up/);
    await page.getByLabel("Name").fill("Guest Convert");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("guest-convert-password-123");
    await page.getByRole("button", { name: /create account/i }).click();

    // The new account lands on its dashboard with the guest's résumé merged in.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(resumeName)).toBeVisible();
  });
});
