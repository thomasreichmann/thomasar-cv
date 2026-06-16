import { pgSchema, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Everything lives under a dedicated `resume` schema. The underlying Supabase
 * project is shared with `nexus` (free-project cap), so we never touch `public`
 * and never reference nexus tables - the schema stays self-contained and portable.
 */
export const resumeSchema = pgSchema("resume");

/**
 * Trivial table that exists only to prove the migration pipeline end to end.
 * Safe to drop once a real table lands.
 */
export const ping = resumeSchema.table("ping", {
  id: serial("id").primaryKey(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
