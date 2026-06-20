import { index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { resumeSchema } from "./resume-schema";
import type { ResumeContent } from "./resume-content";

/** Factory so each table gets fresh column builders rather than sharing instances. */
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * A résumé. Deliberately thin: the row owns identity, ownership, and a label,
 * while the entire résumé content is a single validated `jsonb` document (see
 * `resume-content.ts`). Keeping content as one document - not a tree of rows -
 * is what makes the planned git-like versioning cheap: a snapshot or a tailored
 * variant is just another row pointing at a copy of `content`. The version /
 * variant tables themselves are out of scope here (separate issue); this shape
 * is chosen so they slot on top without reshaping content.
 * See `docs/decisions/0001-resume-persistence.md`.
 */
export const resume = resumeSchema.table(
  "resume",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Human label for this résumé, e.g. "Default" or a variant's name. */
    name: text("name").notNull(),
    /**
     * The whole résumé document. Opaque `jsonb` to Postgres; its shape is owned
     * and validated by `resumeContent` (Zod) on every write, not by the column.
     */
    content: jsonb("content").$type<ResumeContent>().notNull(),
    ...timestamps(),
  },
  (t) => [index("resume_user_id_idx").on(t.userId)],
);
