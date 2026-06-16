import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Everything lives under a dedicated `resume` Postgres schema. The underlying
 * Supabase project is shared with `nexus` (free-project cap), so we never touch
 * `public` and never collide with nexus's own tables - including its BetterAuth
 * `user` / `session` / `account` tables, which sit in `public`. Ours sit here.
 *
 * Defined in its own module so both `index.ts` (ping) and `auth.ts` can import
 * it without a circular dependency through the schema barrel.
 */
export const resumeSchema = pgSchema("resume");
