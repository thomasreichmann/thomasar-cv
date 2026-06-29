import { serial, text, timestamp } from "drizzle-orm/pg-core";

import { resumeSchema } from "./resume-schema";

export { resumeSchema };
export * from "./auth";
export * from "./resume";
export * from "./resume-content";
export * from "./resume-version";
export * from "./resume-file-name";
export * from "./resume-theme";
export { exampleResume } from "../fixtures/example-resume";

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
