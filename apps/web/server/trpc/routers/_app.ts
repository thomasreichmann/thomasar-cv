import { createTRPCRouter, publicProcedure } from "../init";
import { resumeRouter } from "./resume";

export const appRouter = createTRPCRouter({
  /**
   * Liveness probe. Proves the server router reaches the client end to end;
   * safe to drop once a real query exists.
   */
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    time: new Date(),
  })),

  /** Current signed-in user, or null. Reads the session off the tRPC context. */
  me: publicProcedure.query(({ ctx }) => ctx.session?.user ?? null),

  /** Résumé reads and writes, scoped to the signed-in user. */
  resume: resumeRouter,
});

/** Router type consumed by the typed client. Export type only, never values. */
export type AppRouter = typeof appRouter;
