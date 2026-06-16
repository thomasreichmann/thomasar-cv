import type { APIRequestContext } from "@playwright/test";

/**
 * Shared e2e auth helpers. Users are created and signed in through the real
 * BetterAuth HTTP endpoints (not the UI), so protected specs can start already
 * authenticated via saved storage state instead of driving the login form
 * every time.
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/** The seeded user reused across authenticated specs. */
export const REGULAR_USER: TestUser = {
  name: "Regular E2E",
  email: "user-e2e@test.local",
  password: "user-e2e-password-123",
};

/** Where the signed-in cookie state for REGULAR_USER is saved. */
export const USER_STATE_PATH = "e2e/.auth/user.json";

// BetterAuth rejects sign-up/sign-in POSTs whose Origin isn't trusted; the
// dev/CI server trusts its own origin, so echo it back.
function authHeaders(baseURL: string) {
  return { Origin: baseURL };
}

/**
 * Ensures `user` exists and saves its signed-in storage state to `statePath`.
 *
 * Sign-in is attempted first so the helper is idempotent against a shared
 * database where the user persists between runs; only when that fails do we
 * register (sign-up also signs in). Either path leaves the request context
 * holding a valid session cookie, which `storageState` then serializes.
 */
export async function ensureUserAndSaveState(
  request: APIRequestContext,
  baseURL: string,
  user: TestUser,
  statePath: string,
): Promise<void> {
  const headers = authHeaders(baseURL);

  const signIn = await request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: user.email, password: user.password },
  });

  if (!signIn.ok()) {
    const signUp = await request.post("/api/auth/sign-up/email", {
      headers,
      data: { name: user.name, email: user.email, password: user.password },
    });
    if (!signUp.ok()) {
      throw new Error(
        `could not provision ${user.email}: sign-in ${signIn.status()}, sign-up ${signUp.status()} ${await signUp.text()}`,
      );
    }
  }

  await request.storageState({ path: statePath });
}
