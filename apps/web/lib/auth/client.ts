"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Talks to the `/api/auth/*` route handler; the base URL
 * is inferred from the current origin, so no config is needed. Re-exports the
 * hooks/actions the UI uses so components import from one place.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
