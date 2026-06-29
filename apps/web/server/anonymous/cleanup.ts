import { and, eq, gte, lt, notExists } from "drizzle-orm";

import type { DB } from "@thomasar-cv/db";
import { resume, user } from "@thomasar-cv/db/schema";

/**
 * How long an abandoned anonymous guest (and its cascaded résumés) lingers
 * before the sweep removes it. 30 days sits comfortably past the 7-day session
 * lifetime, so a guest who has not touched their work in a month is
 * unambiguously gone, not mid-edit (ADR 0008). This is a retention policy, not a
 * tuning knob: change it here and the documented decision with it. (#68)
 */
export const ANONYMOUS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Delete every abandoned anonymous user whose last activity predates `olderThan`,
 * which cascades their résumés, sessions, and accounts away (every foreign key to
 * `user.id` is `ON DELETE CASCADE`). This is the TTL sweep ADR 0005 deferred to
 * #68: a converted guest is already removed by the anonymous plugin on link, so
 * any row still flagged `isAnonymous` is one that never converted, and the only
 * question is whether it has gone cold.
 *
 * "Last activity" is the most recent of the user's own `updatedAt` and their
 * newest résumé's `updatedAt`, so a guest still editing a month-old session is
 * kept. We express that without a join: delete when the user row is itself stale
 * AND no résumé of theirs was touched since the cutoff. Editing a résumé does not
 * touch the user row, so the résumé clause is what actually protects an active
 * guest; the user clause covers a guest who never created one. The correlated
 * `notExists` rides the `resume_user_id_idx`.
 *
 * Like `reassignResumes`, this writes across the ownership boundary
 * `ownedResumes` enforces, which is exactly what a sweep must do, so it lives
 * here (not in a router) and runs only from the cron route, never from request
 * input. The cutoff is a server clock value, never caller-supplied. Returns the
 * number of users removed for the job to log.
 */
export async function deleteAbandonedAnonymousUsers(
  db: DB,
  olderThan: Date,
): Promise<number> {
  const deleted = await db
    .delete(user)
    .where(
      and(
        eq(user.isAnonymous, true),
        lt(user.updatedAt, olderThan),
        notExists(
          db
            .select({ id: resume.id })
            .from(resume)
            .where(
              and(eq(resume.userId, user.id), gte(resume.updatedAt, olderThan)),
            ),
        ),
      ),
    )
    .returning({ id: user.id });

  return deleted.length;
}
