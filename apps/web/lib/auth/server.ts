import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@thomasar-cv/db/schema";

import { db } from "@/server/db";

/**
 * Server-side auth instance. Email + password only (no OAuth / magic-link in
 * v1, per the project decisions). The Drizzle adapter resolves its models by
 * matching BetterAuth's model names to the exported table keys in
 * `@thomasar-cv/db/schema` (user / session / account / verification), which
 * live under the `resume` Postgres schema.
 *
 * `BETTER_AUTH_SECRET` signs session cookies; BetterAuth reads it from the
 * environment. See apps/web/.env.example.
 *
 * `baseURL` is a dynamic config rather than a pinned string: we still want the
 * origin derived per request (Vercel preview deployments each get a distinct
 * URL), but `allowedHosts` validates that derived Host against an allowlist
 * instead of trusting whatever header arrives, and it silences the "Base URL
 * is not set" warning a bare/undefined baseURL emits on every build. The list
 * covers the production domain, all Vercel deploys (aliases + previews), and
 * localhost on any port (dev on 3000, e2e on 3100). `fallback` is the origin
 * used when no request is in scope - e.g. the headerless `auth.api.signUpEmail`
 * call in the dev-login provisioning path, which would otherwise throw.
 */
export const auth = betterAuth({
  baseURL: {
    allowedHosts: ["cv.thomasar.dev", "*.vercel.app", "localhost:*"],
    fallback: "https://cv.thomasar.dev",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the session at most once a day
  },
});
