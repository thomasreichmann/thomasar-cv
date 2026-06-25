import { expect, test } from "../fixtures/console";
import { findUser, seedResumeFor } from "../helpers/db";

// Runs unauthenticated (the bare `smoke` project carries no storage state) -
// guest mode (issue #67) is precisely the no-session entry point. A fresh email
// per run keeps the sign-up unique against the shared e2e database.
function uniqueEmail() {
  return `guest-convert-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}

// The e2e server is `next dev`, which compiles routes on first hit. This spec is
// the only one that exercises the guest chain (`/sign-in/anonymous`, the editor,
// then `/sign-up`), so it pays that cold-compile cost itself instead of riding
// routes an earlier warm-up touched - and each step is gated behind the previous
// one's network round-trip, so the default 5s expect timeout is too tight on a
// cold CI runner. Give the navigations room rather than leaning on CI's retry.
const COLD = 20_000;

test.describe("guest mode (issue #67)", () => {
  // Both tests drive the cold-compiled guest chain (`/`, anonymous sign-in, the
  // editor, then an auth route). Run them serially so they don't hit that
  // first-hit compilation at the same time - parallel cold compiles starve each
  // other past even the COLD budget and flake both - and so the second rides the
  // routes the first already warmed.
  test.describe.configure({ mode: "serial" });

  test("try-it opens the editor; signing up keeps the work", async ({
    page,
  }) => {
    test.slow(); // cold-compiled routes; triples the per-test budget

    await page.goto("/");
    await page.getByRole("button", { name: /try it/i }).click();

    // Lands straight in the editor on a single résumé, with the guest banner.
    // The push only fires after anonymous sign-in + résumé create resolve, both
    // cold here, so this is the wait most exposed to first-hit compile latency.
    await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+/i, { timeout: COLD });
    await expect(page.getByText(/editing as a guest/i)).toBeVisible({
      timeout: COLD,
    });

    // A guest has no dashboard: hitting it routes back to their one résumé.
    const editorUrl = page.url();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(editorUrl, { timeout: COLD });

    // Make an identifiable, saved edit so we can prove it survives conversion.
    const resumeName = `Guest CV ${Date.now()}`;
    await page.getByLabel("Résumé name").fill(resumeName);
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.click();
    // Save is disabled both while the write is in flight and once clean, so this
    // can resolve mid-save; the post-conversion dashboard assertion below is what
    // actually proves the edit was persisted, not just submitted.
    await expect(save).toBeDisabled({ timeout: COLD });

    // Convert by creating an account (the banner's Sign up links to /sign-up;
    // Base UI keeps role="button" on it even rendered as an anchor).
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up/, { timeout: COLD });
    // Wait for the form to hydrate before filling. The submit button is disabled
    // until hydration (a pre-hydration click would post the form natively and
    // leak the credentials into the URL), so its enabling also marks the inputs
    // interactive: typing earlier races hydration, whose first client render
    // reconciles the controlled inputs back to empty and silently drops what was
    // typed - the click then aborts on native required-field validation before
    // any submit event reaches React.
    const createAccount = page.getByRole("button", { name: /create account/i });
    await expect(createAccount).toBeEnabled({ timeout: COLD });
    await page.getByLabel("Name").fill("Guest Convert");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("guest-convert-password-123");
    await createAccount.click();

    // The new account lands on its dashboard with the guest's résumé merged in.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: COLD });
    await expect(page.getByText(resumeName)).toBeVisible({ timeout: COLD });
  });

  test("signing in merges the guest's draft into an existing account", async ({
    page,
    request,
  }) => {
    test.slow(); // cold-compiled routes; triples the per-test budget

    // The merge that matters is into an account that ALREADY owns a résumé - the
    // append-without-dropping path the sign-up test can't reach, since a brand-
    // new account starts empty. Provision that account through the back door:
    // sign-up over BetterAuth's HTTP endpoint so the password hashes the way the
    // form's sign-in expects (a raw row seed wouldn't), then seed its existing
    // résumé directly once the generated user id is known.
    const account = {
      name: "Returning User",
      email: uniqueEmail(),
      password: "returning-user-password-123",
    };
    const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
    // BetterAuth rejects a sign-up POST whose Origin it doesn't trust; the
    // server trusts its own origin, so echo it back.
    const signUp = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: baseURL },
      data: account,
    });
    expect(signUp.ok()).toBeTruthy();

    const owner = await findUser(account.email);
    if (!owner) throw new Error(`account ${account.email} was not provisioned`);
    const existingName = `Existing CV ${Date.now()}`;
    await seedResumeFor({ userId: owner.id, name: existingName });

    // Guest flow: start a session and make an identifiable, saved edit on the
    // one guest résumé - the draft that has to survive the merge.
    await page.goto("/");
    await page.getByRole("button", { name: /try it/i }).click();
    await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+/i, { timeout: COLD });
    await expect(page.getByText(/editing as a guest/i)).toBeVisible({
      timeout: COLD,
    });

    const guestName = `Guest draft ${Date.now()}`;
    await page.getByLabel("Résumé name").fill(guestName);
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.click();
    await expect(save).toBeDisabled({ timeout: COLD });

    // Convert by signing IN to the existing account (the banner's Sign in links
    // to /sign-in). onLinkAccount fires on sign-in too, reassigning the guest's
    // draft onto the account it authenticates as.
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: COLD });

    // Wait for the form to hydrate before filling, same as the sign-up test: the
    // submit button enabling marks the controlled inputs interactive, so typed
    // values stick instead of being wiped by hydration's first render.
    const signInSubmit = page.getByRole("button", {
      name: "Sign in",
      exact: true,
    });
    await expect(signInSubmit).toBeEnabled({ timeout: COLD });
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await signInSubmit.click();

    // The account's dashboard now carries BOTH résumés: its own plus the merged-
    // in guest draft, neither dropped (ADR 0005). This is the assertion the
    // function-level reassign test can't make - that the wiring delivers the
    // append on the sign-in path, into a non-empty account.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: COLD });
    await expect(page.getByText(existingName)).toBeVisible({ timeout: COLD });
    await expect(page.getByText(guestName)).toBeVisible({ timeout: COLD });
  });
});
