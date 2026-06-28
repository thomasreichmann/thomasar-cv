import {
  defaultResumeTheme,
  emptyResume,
  resumeContent,
  resumeTheme,
} from "@thomasar-cv/db/schema";
import { fromJsonResume, jsonResumeImport } from "@thomasar-cv/db/jsonresume";
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
   * never taken from input. Content defaults to the minimal empty document and
   * theme to the neutral baseline, so a new résumé is always a valid document the
   * editor can fill in with the original ink-only look.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        content: resumeContent.optional(),
        theme: resumeTheme.optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ownedResumes(ctx.db, ctx.session.user.id).create({
        name: input.name,
        content: input.content ?? emptyResume,
        theme: input.theme ?? defaultResumeTheme,
      }),
    ),

  /**
   * Create a résumé from a JSON Resume document (issue #55) - the inverse of the
   * export route. The `jsonResumeImport` schema validates the upload, stripping
   * the sections we don't model (so unknown / extra fields drop without failing)
   * and rejecting a malformed shape - including a JSON object with no recognized
   * section - as BAD_REQUEST *before* anything is written, so a bad import never
   * leaves a partial résumé behind. `fromJsonResume` carries the field
   * correspondence - the same table the export reads. The new row is named from
   * the document's person name (the editor can rename), defaulting when it
   * carries none.
   */
  importJsonResume: protectedProcedure
    .input(jsonResumeImport)
    .mutation(({ ctx, input }) =>
      ownedResumes(ctx.db, ctx.session.user.id).create({
        name: input.basics?.name?.trim() || "Imported résumé",
        content: fromJsonResume(input),
        theme: defaultResumeTheme,
      }),
    ),

  /**
   * Update an owned résumé's name, content document and/or theme. At least one
   * field is required - an update that sets nothing is refused (BAD_REQUEST). Only
   * the supplied fields are written: absent optional inputs never reach `.set()`,
   * so a theme-only save leaves the content untouched and vice-versa.
   */
  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          name: z.string().min(1).optional(),
          content: resumeContent.optional(),
          theme: resumeTheme.optional(),
        })
        .refine(
          (v) =>
            v.name !== undefined ||
            v.content !== undefined ||
            v.theme !== undefined,
          { message: "Provide a name, content and/or theme to update." },
        ),
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
