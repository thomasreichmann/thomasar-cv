import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";

import type { Connection } from "../connection";
import { exampleResume, resume, user } from "../schema";
import * as schema from "../schema";

/**
 * Real Postgres for tests, in-process via pglite (WASM) - no Docker, no network,
 * no shared Supabase project. We migrate with the SAME generated SQL the real
 * database runs, so a test exercises the actual schema (custom `resume` pgschema,
 * jsonb, foreign keys, indexes), not a hand-rolled stand-in that can drift.
 *
 * Use it for anything whose correctness is the SQL itself - ownership scoping,
 * constraints, cascades. Procedures with no query still belong on the cheap stub
 * db (see the tRPC tests); spinning up pglite for those is wasted work.
 *
 * One instance per test file (`beforeAll`) with a `truncate()` between tests is
 * the intended shape: pglite's cost is the WASM boot, so reusing the instance and
 * only clearing rows keeps the suite fast.
 */

// The generated migrations live at packages/db/drizzle; resolve relative to this
// module so the path holds no matter which package's test run imports the helper.
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export interface TestDb {
  /**
   * Typed as the app's `Connection`: the pglite driver is API-compatible with
   * the postgres-js client, so the same repos and helpers run unchanged here.
   */
  db: Connection;
  /** Delete every row, leaving the migrated schema intact. Run between tests. */
  truncate: () => Promise<void>;
  /** Free the WASM instance. Run in `afterAll`. */
  close: () => Promise<void>;
}

/** Spin up a migrated, empty in-process database. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });

  return {
    db: db as unknown as Connection,
    // Deleting users cascades to resumes (FK is ON DELETE CASCADE), so this one
    // statement clears the owned data every ownership test cares about.
    truncate: async () => {
      await db.delete(user);
    },
    close: () => client.close(),
  };
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
