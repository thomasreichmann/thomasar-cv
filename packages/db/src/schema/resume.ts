import {
  type AnyPgColumn,
  index,
  jsonb,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { resumeSchema } from "./resume-schema";
import type { ResumeContent } from "./resume-content";
import { defaultResumeTheme, type ResumeTheme } from "./resume-theme";

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
    /**
     * How the paper looks: a sibling of `content`, never nested inside it, so a
     * layout tweak stays a layout tweak in history and a snapshot/variant copies
     * the look in the same row copy (ADR 0006). Shape owned by `resumeTheme`
     * (Zod) on every write. The column defaults to the neutral baseline, so every
     * row that predates this column reads back as the original ink-only look.
     */
    theme: jsonb("theme").$type<ResumeTheme>().notNull().default(defaultResumeTheme),
    /**
     * Groups a variant under the base it was forked from (ADR 0010): null on a
     * base, the base's id on a variant. `set null` orphans a base's variants into
     * independent bases rather than cascading them away - they are "independent
     * once created", unlike `resume_version`, which cascades. Grouping stays one
     * level deep: forking a variant points the new row at the same base, never at
     * the variant. The self-reference needs the explicit `AnyPgColumn` return type
     * to break TypeScript's circular inference.
     */
    baseResumeId: uuid("base_resume_id").references(
      (): AnyPgColumn => resume.id,
      { onDelete: "set null" },
    ),
    /**
     * Optional company or role a variant is tailored for, e.g.
     * "Acme - Staff Engineer" (ADR 0010): null on a base or an untargeted variant.
     * One free-text column, not split into company/role until a reader needs the
     * structure.
     */
    target: text("target"),
    ...timestamps(),
  },
  (t) => [index("resume_user_id_idx").on(t.userId)],
);
