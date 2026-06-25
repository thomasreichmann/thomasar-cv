"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

/**
 * Browser auth client. Talks to the `/api/auth/*` route handler; the base URL
 * is inferred from the current origin, so no config is needed. Re-exports the
 * hooks/actions the UI uses so components import from one place.
 *
 * The anonymous plugin (issue #67) mirrors the server's: it exposes
 * `signIn.anonymous()` to start a guest session and surfaces `isAnonymous` on
 * the session user so the UI can tell a guest from a real account.
 */
export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

export const { useSession, signIn, signOut } = authClient;

// `signUp` is annotated against `authClient` rather than destructured: with the
// anonymous plugin in the mix, its inferred type pulls in a better-auth internal
// that isn't portably nameable, so a bare re-export trips TS2883. Tying the type
// back to the already-named `authClient` keeps it portable.
export const signUp: typeof authClient.signUp = authClient.signUp;
