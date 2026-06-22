import { eq } from "drizzle-orm";

import type { Connection } from "../connection";
import { exampleResume, resume, user } from "../schema";

/**
 * Connection-generic test seeding. Every function takes the `Connection` to act
 * on, so the same helpers serve the in-process pglite database (unit and
 * integration tests, see ./pglite) and a real Postgres (e2e, see
 * apps/web/e2e/helpers/db). Keeping them here - free of the pglite (WASM) import
 * that ./pglite carries - lets the e2e runner reuse them without pulling pglite
 * into the browser-test process.
 */

/**
 * Delete every row, leaving the migrated schema intact. Deleting users cascades
 * to their resumes, sessions, and accounts (every foreign key to `user.id` is
 * ON DELETE CASCADE), so this one statement clears all owned data. Run between
 * tests, or once before an e2e run, to start from an empty database.
 */
export async function truncateAll(db: Connection): Promise<void> {
  await db.delete(user);
}

/**
 * Insert a user. Resumes carry a foreign key to `user.id`, so every ownership
 * test needs the owner to exist first; this fills the BetterAuth-managed columns
 * tests never care about. Pass a distinct `id` per user to keep emails unique.
 */
export async function seedUser(
  db: Connection,
  overrides: { id: string } & Partial<typeof user.$inferInsert>,
): Promise<typeof user.$inferSelect> {
  const [row] = await db
    .insert(user)
    .values({
      name: `User ${overrides.id}`,
      email: `${overrides.id}@example.test`,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("seedUser: insert returned no row");
  return row;
}

/**
 * Insert a résumé owned by `userId`, defaulting to the shared example content so
 * tests that only care about ownership don't have to author a valid document.
 */
export async function seedResume(
  db: Connection,
  values: { userId: string } & Partial<typeof resume.$inferInsert>,
): Promise<typeof resume.$inferSelect> {
  const [row] = await db
    .insert(resume)
    .values({
      name: "Default",
      content: exampleResume,
      ...values,
    })
    .returning();
  if (!row) throw new Error("seedResume: insert returned no row");
  return row;
}

/**
 * Look up a user by email. The e2e setup creates its user through BetterAuth's
 * sign-up endpoint (so the password hashes the way sign-in expects), which means
 * the generated id isn't known up front; a fixture that seeds data owned by that
 * user reads it back with this.
 */
export async function findUserByEmail(
  db: Connection,
  email: string,
): Promise<typeof user.$inferSelect | undefined> {
  const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return row;
}

export async function deleteResume(db: Connection, id: string): Promise<void> {
  await db.delete(resume).where(eq(resume.id, id));
}
