import { initTRPC, TRPCError } from "@trpc/server";
import type { Connection } from "@thomasar-cv/db";
import superjson from "superjson";

import { db } from "@/server/db";

/**
 * Placeholder session shape. BetterAuth (issue #5) replaces this with the real
 * session type and populates `ctx.session` in `createTRPCContext`. Until then
 * the session is always `null`, so `protectedProcedure` rejects every call.
 */
type Session = { user: { id: string } };

/**
 * Pure context builder: assembles ctx from its inputs. Kept separate from
 * `createTRPCContext` so tests can build an equivalent ctx with a stub db and
 * no session, without the request-scoped wiring. New ctx fields added here flow
 * into both production and test callers.
 */
export function buildContext(deps: {
  db: Connection;
  session: Session | null;
}) {
  return { ...deps };
}

/**
 * Per-request context for the fetch handler and RSC. `session` is the single
 * place auth hooks in: once #5 lands, derive it here and every
 * `protectedProcedure` is enforced without touching the procedures themselves.
 */
export async function createTRPCContext() {
  // BetterAuth (#5) replaces this with:
  //   const session = await auth.api.getSession({ headers: await headers() });
  const session: Session | null = null;
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
 * Requires an authenticated session. Currently always throws UNAUTHORIZED
 * because no session is ever set; it becomes enforceable the moment auth
 * populates `ctx.session`. Downstream resolvers get a non-null `ctx.session`.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: ctx.session } });
});
