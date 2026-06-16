import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

/**
 * Placeholder session shape. BetterAuth (issue #5) replaces this with the real
 * session type and populates `ctx.session` in `createTRPCContext`. Until then
 * the session is always `null`, so `protectedProcedure` rejects every call.
 */
type Session = { user: { id: string } };

/**
 * Per-request context. Built once per incoming request (the fetch handler) or
 * per server-side caller. `session` is the single place auth will hook into:
 * once it lands, read the session here and every `protectedProcedure` is
 * enforced without touching the procedures themselves.
 */
export async function createTRPCContext(opts: { headers: Headers }) {
  return {
    session: null as Session | null,
    headers: opts.headers,
  };
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
