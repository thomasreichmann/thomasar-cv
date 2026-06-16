import { createTRPCRouter, publicProcedure } from "../init";

export const appRouter = createTRPCRouter({
  /**
   * Liveness probe. Proves the server router reaches the client end to end;
   * safe to drop once a real query exists.
   */
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    time: new Date(),
  })),
});

/** Router type consumed by the typed client. Export type only, never values. */
export type AppRouter = typeof appRouter;
