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

/**
 * One user per parallel worker, so résumés seeded by tests on different workers
 * are owned by different accounts and a spec can never see another's rows. Keyed
 * by `parallelIndex` (not `workerIndex`): it is bounded by the worker count and
 * reused when a worker respawns on retry, so the same account is reused and the
 * idempotent sign-in-then-sign-up below covers it.
 */
export function userForWorker(parallelIndex: number): TestUser {
  const slug = `w${parallelIndex}`;
  return {
    name: `E2E worker ${parallelIndex}`,
    email: `user-e2e-${slug}@test.local`,
    password: `user-e2e-${slug}-password-123`,
  };
}

/** Where a worker's signed-in cookie state is saved (one file per worker). */
export function userStatePath(parallelIndex: number): string {
  return `e2e/.auth/user-w${parallelIndex}.json`;
}

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
