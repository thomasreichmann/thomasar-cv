import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";

import type { Connection } from "../connection";
import * as schema from "../schema";
import { truncateAll } from "./seed";

// The connection-generic seed helpers live in ./seed (so the e2e runner can use
// them without importing pglite/WASM); re-export them here so existing imports
// from `@thomasar-cv/db/testing` keep working unchanged.
export {
  deleteResume,
  findUserByEmail,
  seedResume,
  seedUser,
  truncateAll,
} from "./seed";

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
 *
 * The browser e2e suite needs a real, networked Postgres instead (a separate
 * process connects to it), so it uses an ephemeral container rather than pglite,
 * but reuses the same ./seed helpers. See apps/web/e2e.
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
  const connection = db as unknown as Connection;

  return {
    db: connection,
    truncate: () => truncateAll(connection),
    close: () => client.close(),
  };
}
