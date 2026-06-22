import { createDb, type Connection } from "@thomasar-cv/db";
import {
  deleteResume,
  findUserByEmail,
  seedResume,
  seedUser,
  truncateAll,
} from "@thomasar-cv/db/testing/seed";

/**
 * The back door for e2e setup. Browser specs drive the app through the UI; this
 * builds a direct connection to the same DATABASE_URL the e2e server uses (the
 * ephemeral Postgres from docker-compose.e2e.yml) so a spec can put the database
 * into a known state without clicking through it first. Seeding goes through the
 * db package's typed helpers, not hand-written SQL, so the setup can't drift
 * from the schema.
 */
let connection: Connection | undefined;

function db(): Connection {
  if (!connection) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Run e2e via `pnpm test:e2e`, which starts the ephemeral database and loads apps/web/.env.e2e.",
      );
    }
    connection = createDb(url);
  }
  return connection;
}

export function resetDb(): Promise<void> {
  return truncateAll(db());
}

export function findUser(email: string) {
  return findUserByEmail(db(), email);
}

export function seedResumeFor(values: Parameters<typeof seedResume>[1]) {
  return seedResume(db(), values);
}

// Auth users come from BetterAuth sign-up, which hashes the password; seed a row
// directly only for the rare case that doesn't go through auth.
export function seedUserRow(overrides: Parameters<typeof seedUser>[1]) {
  return seedUser(db(), overrides);
}

export function removeResume(id: string) {
  return deleteResume(db(), id);
}
