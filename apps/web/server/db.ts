import { createDb, type Connection } from "@thomasar-cv/db";

import { env } from "@/lib/env";

let connection: Connection | undefined;

/**
 * Process-wide pooled connection, created on first use. Lazy (not a top-level
 * `createDb(...)`) so importing this module, e.g. for the tRPC context type,
 * never reads `DATABASE_URL` until a procedure actually needs the database.
 */
export function getDb(): Connection {
  return (connection ??= createDb(env.DATABASE_URL));
}
