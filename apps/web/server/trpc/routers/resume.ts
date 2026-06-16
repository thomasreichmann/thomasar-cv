import { z } from "zod";

import { ownedResumes } from "@/server/resume/ownership";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * Résumé reads, scoped to the signed-in user. Both procedures go through
 * `ownedResumes` - the single ownership boundary (issue #5) - and never touch the
 * db for `resume` directly. Editing / variant procedures land in a later issue;
 * the helper already exposes the scoped writes they will use.
 */
export const resumeRouter = createTRPCRouter({
  /** This user's résumés. */
  list: protectedProcedure.query(({ ctx }) =>
    ownedResumes(ctx.db, ctx.session.user.id).list(),
  ),

  /** One of this user's résumés; NOT_FOUND if it is missing or another user's. */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ownedResumes(ctx.db, ctx.session.user.id).get(input.id),
    ),
});
