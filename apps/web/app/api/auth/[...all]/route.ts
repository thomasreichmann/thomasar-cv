import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

/**
 * Single catch-all entrypoint for every BetterAuth endpoint (sign-up, sign-in,
 * sign-out, session, ...). The client and server SDKs address them by path
 * under `/api/auth`.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
