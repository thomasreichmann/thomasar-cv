import { index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { ResumeContent } from "./resume-content";
import { resume } from "./resume";
import { resumeSchema } from "./resume-schema";
import type { ResumeTheme } from "./resume-theme";

/**
 * An immutable snapshot of a résumé's `{ content, theme }` at a point in time.
 * The live `resume` row is always the working copy; a version row is only ever
 * inserted or cascade-deleted, never edited - hence no `updated_at`, and restore
 * writes the live row plus inserts a fresh snapshot rather than mutating one.
 *
 * Ownership flows through `resume_id -> resume.user_id` (the single signal from
 * ADR 0001), so there is deliberately no denormalized `user_id`: a version is
 * reached only via its owning résumé. Nothing reads this table yet; the migration
 * is deferred to its first reader, the snapshot procedure (#81), per the
 * seam-first habit. See `docs/decisions/0009-version-history-and-diff.md`.
 */
export const resumeVersion = resumeSchema.table(
  "resume_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    /** What this snapshot is, e.g. a user label or an auto "before restore" label. */
    label: text("label").notNull(),
    /** A copy of the content at snapshot time; shape owned by `resumeContent` (Zod). */
    content: jsonb("content").$type<ResumeContent>().notNull(),
    /** A copy of the theme at snapshot time; shape owned by `resumeTheme` (Zod). */
    theme: jsonb("theme").$type<ResumeTheme>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Newest-first history for one résumé is then a single ordered scan; `id` breaks
  // ties between snapshots sharing a `created_at` so the order stays total.
  (t) => [
    index("resume_version_resume_id_created_at_idx").on(
      t.resumeId,
      t.createdAt.desc(),
      t.id,
    ),
  ],
);

export type ResumeVersion = typeof resumeVersion.$inferSelect;
export type NewResumeVersion = typeof resumeVersion.$inferInsert;
