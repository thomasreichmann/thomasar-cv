import { TRPCError } from "@trpc/server";
import { user } from "@thomasar-cv/db/schema";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";

import { createTRPCRouter, publicProcedure } from "../init";

/**
 * Dev-only sign-in shortcut. Hands the browser a known account's credentials so
 * reviewing a protected page on a Vercel preview is one click instead of typing
 * a login every time. The browser signs in through the normal `signIn.email`
 * path, so the resulting session is a real login, not a special-cased one.
 *
 * The server is the boundary, not the button: the credentials are the secret,
 * and the button is cosmetic client code anyone can read. So we refuse here
 * unless this is a non-production deployment AND a dev account is configured -
 * production never returns a credential even if the endpoint is hit directly.
 *
 * The gate keys on `VERCEL_ENV`, not `NODE_ENV`: Next builds preview
 * deployments with NODE_ENV=production too, so NODE_ENV can't tell a preview
 * apart from production. VERCEL_ENV is "preview" on previews, "production" on
 * prod, and unset locally. DEV_LOGIN_* is the second, config-level lock - set
 * it on Vercel Preview only, never Production, and the account stays unreachable
 * there even while prod and preview still share one database.
 */
export const devRouter = createTRPCRouter({
  credentials: publicProcedure.mutation(async ({ ctx }) => {
    if (process.env.VERCEL_ENV === "production") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const email = process.env.DEV_LOGIN_EMAIL;
    const password = process.env.DEV_LOGIN_PASSWORD;
    if (!email || !password) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Dev login is not configured (set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD).",
      });
    }

    // Provision on first use so the shortcut works against a fresh local or
    // preview database, then no-ops. Only sign up when the row is absent;
    // signUpEmail hashes the password the same way the real form does, so the
    // credentials returned below actually sign in.
    const [existing] = await ctx.db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existing) {
      await auth.api.signUpEmail({ body: { name: "Dev", email, password } });
    }

    return { email, password };
  }),
});
