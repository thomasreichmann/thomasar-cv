import { initTRPC, TRPCError } from "@trpc/server";
import type { Connection } from "@thomasar-cv/db";
import { headers } from "next/headers";
import superjson from "superjson";

import { auth } from "@/lib/auth/server";
import { db } from "@/server/db";

/** The session BetterAuth resolves for the request (null when signed out). */
type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Pure context builder: assembles ctx from its inputs. Kept separate from
 * `createTRPCContext` so tests can build an equivalent ctx with a stub db and
 * no session, without the request-scoped wiring. New ctx fields added here flow
 * into both production and test callers.
 */
export function buildContext(deps: { db: Connection; session: Session }) {
  return { ...deps };
}

/**
 * Per-request context for the fetch handler and RSC. Resolving the session
 * here is the single place auth hooks in: every `protectedProcedure` is
 * enforced off `ctx.session` without touching the procedures themselves.
 */
export async function createTRPCContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  return buildContext({ db, session });
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/** Build a router. */
export const createTRPCRouter = t.router;

/** Build a server-side caller for a router (used by RSC and tests). */
export const createCallerFactory = t.createCallerFactory;

/** Open to anyone. */
export const publicProcedure = t.procedure;

/**
 * Requires an authenticated session: rejects with UNAUTHORIZED when
 * `ctx.session` is null. Downstream resolvers get a non-null `ctx.session`.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: ctx.session } });
});
