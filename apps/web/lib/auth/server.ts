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
 * No `baseURL` is set on purpose: BetterAuth then derives the origin from each
 * request, which is what we want on Vercel where preview deployments each get
 * a distinct URL. Set `BETTER_AUTH_URL` to pin it for a stable domain. (The
 * "Base URL is not set" dev warning is expected and harmless for email +
 * password, which has no OAuth callback to redirect to.)
 */
export const auth = betterAuth({
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
