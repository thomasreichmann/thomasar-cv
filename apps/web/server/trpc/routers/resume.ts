import { TRPCError } from "@trpc/server";
import { emptyResume, resumeContent } from "@thomasar-cv/db/schema";
import { z } from "zod";

import { ownedResumes } from "@/server/resume/ownership";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * Résumé reads and writes, scoped to the signed-in user. Every procedure goes
 * through `ownedResumes` - the single ownership boundary (issue #5) - and never
 * touches the db for `resume` directly, so no caller can reach or write another
 * user's row. Identity and ownership are never caller input: `create` stamps the
 * session user, and update / remove scope `where id and user_id` in one statement,
 * surfacing a missing or not-owned id as NOT_FOUND so ids can't be probed.
 *
 * `content` is validated by `resumeContent` on the way in, so a malformed document
 * is refused (BAD_REQUEST) before it can reach the opaque jsonb column. Versioning
 * / variant procedures land in a later milestone (ADR 0001).
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

  /**
   * Create a résumé owned by the caller. Ownership is stamped from the session,
   * never taken from input. Content defaults to the minimal empty document, so a
   * new résumé is always a valid document the editor can fill in. A guest
   * (anonymous session) may own at most one résumé (ADR 0008): a second create is
   * refused FORBIDDEN, so an account's writes stay unbounded while a guest's do not.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        content: resumeContent.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resumes = ownedResumes(ctx.db, ctx.session.user.id);
      // A legitimate guest never reaches this branch: the client reuses their
      // existing résumé rather than creating a second, so only a caller bypassing
      // the UI gets here. Enforcing the one-per-guest invariant server-side is
      // what actually bounds a guest's row growth (ADR 0008) - the client check is
      // an optimization, not a guarantee.
      if (ctx.session.user.isAnonymous && (await resumes.list()).length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Guest mode is limited to one résumé.",
        });
      }
      return resumes.create({
        name: input.name,
        content: input.content ?? emptyResume,
      });
    }),

  /**
   * Update an owned résumé's name and/or whole content document. At least one
   * field is required - an update that sets nothing is refused (BAD_REQUEST). Only
   * the supplied fields are written: absent optional inputs never reach `.set()`.
   */
  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          name: z.string().min(1).optional(),
          content: resumeContent.optional(),
        })
        .refine((v) => v.name !== undefined || v.content !== undefined, {
          message: "Provide a name and/or content to update.",
        }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...values } = input;
      return ownedResumes(ctx.db, ctx.session.user.id).update(id, values);
    }),

  /** Delete one owned résumé; NOT_FOUND if it is missing or another user's. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ownedResumes(ctx.db, ctx.session.user.id).remove(input.id),
    ),
});
