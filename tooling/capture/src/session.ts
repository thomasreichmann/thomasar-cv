import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { chromium } from "@playwright/test";

/**
 * Sign in through the app's "Sign in as dev" shortcut and save the session to
 * `statePath` for the recording context to reuse. This is also what provisions
 * the dev account on a fresh database (the endpoint signs it up on first use), so
 * the later DB lookup by email succeeds. The button only renders off-production,
 * so this path only works against a dev or preview server, never prod.
 */
export async function provisionSession(
  baseUrl: string,
  statePath: string,
): Promise<void> {
  mkdirSync(dirname(statePath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });

    const devButton = page.getByRole("button", { name: "Sign in as dev" });
    if ((await devButton.count()) === 0) {
      throw new Error(
        'No "Sign in as dev" button on /sign-in. It renders off-production only and needs DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD set (see tooling/capture/README.md).',
      );
    }

    await devButton.click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await context.storageState({ path: statePath });
  } finally {
    await browser.close();
  }
}
