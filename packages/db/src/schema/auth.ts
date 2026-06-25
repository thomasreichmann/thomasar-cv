import { boolean, text, timestamp } from "drizzle-orm/pg-core";

import { resumeSchema } from "./resume-schema";

/**
 * BetterAuth's core tables (email + password only - no OAuth, no roles in v1).
 * Column shapes mirror BetterAuth's defaults; the JS field names must stay
 * camelCase because the Drizzle adapter resolves models by these keys. The
 * tables live under the `resume` schema so they never collide with the nexus
 * project's own auth tables in the shared database.
 *
 * Regenerate `account` / `verification` cautiously: BetterAuth reads/writes
 * these columns by name, so renames must round-trip through its field config.
 */

/** Created-once / auto-touched timestamps, fresh builders per call. */
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const user = resumeSchema.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Set by BetterAuth's anonymous plugin: a guest user (issue #67) is a real
  // `user` row flagged here, so an anonymous résumé is owned through the same
  // boundary as any other. Defaults false; a normal sign-up never sets it. The
  // JS key must stay camelCase for the Drizzle adapter to resolve the field.
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  ...timestamps(),
});

export const session = resumeSchema.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

export const account = resumeSchema.table("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  // Hashed password for the email + password provider.
  password: text("password"),
  ...timestamps(),
});

export const verification = resumeSchema.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps(),
});
