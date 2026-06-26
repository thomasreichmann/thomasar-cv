import { and, eq } from "drizzle-orm";

import type { DB } from "@thomasar-cv/db";
import { resume } from "@thomasar-cv/db/schema";

import { assertOne } from "@/server/ownership";

type ResumeRow = typeof resume.$inferSelect;
/**
 * What a write may set. Never `id` or `userId`: identity is generated and
 * ownership is taken from the session, never from caller input - so the only way
 * to set `user_id` is `create`, which stamps the session's user. `theme` rides
 * alongside `content` as a sibling presentation document (ADR 0006).
 */
type ResumeWrite = Pick<typeof resume.$inferInsert, "name" | "content" | "theme">;

/**
 * Ownership-scoped access to résumés for one user. This is THE path routers use
 * to read or write `resume` rows (issue #5): every query is filtered by `userId`,
 * so no caller can reach another user's data, and writes prove it by scoping
 * `where id and user_id` in the same statement. Routers must never touch `db` for
 * `resume` directly - that would bypass this boundary. We connect as a service
 * role through the pooler (no Postgres RLS), so this helper is the only boundary.
 *
 * `resume.user_id` is the sole ownership signal; ids inside the `content` jsonb
 * are never trusted for authz. The later versioning / variant tables, which are
 * owned through a résumé, can follow this same shape.
 */
export function ownedResumes(db: DB, userId: string) {
  /** A single owned row: the id must exist AND belong to this user. */
  const owned = (id: string) =>
    and(eq(resume.id, id), eq(resume.userId, userId));

  return {
    /** All of this user's résumés. */
    list(): Promise<ResumeRow[]> {
      return db.select().from(resume).where(eq(resume.userId, userId));
    },

    /** One owned résumé, or NOT_FOUND when it is missing or another user's. */
    async get(id: string): Promise<ResumeRow> {
      return assertOne(await db.select().from(resume).where(owned(id)));
    },

    /** Create a résumé owned by this user. */
    async create(values: ResumeWrite): Promise<ResumeRow> {
      return assertOne(
        await db
          .insert(resume)
          .values({ ...values, userId })
          .returning(),
      );
    },

    /**
     * Update an owned résumé. The `where id and user_id` runs in the same
     * statement as the write - never read-then-write - and `assertOne` turns
     * "no row affected" into NOT_FOUND, so a cross-user update can neither
     * silently no-op nor touch another user's row.
     */
    async update(id: string, values: Partial<ResumeWrite>): Promise<ResumeRow> {
      return assertOne(
        await db.update(resume).set(values).where(owned(id)).returning(),
      );
    },

    /** Delete an owned résumé, or NOT_FOUND when it is missing or another user's. */
    async remove(id: string): Promise<ResumeRow> {
      return assertOne(await db.delete(resume).where(owned(id)).returning());
    },
  };
}
