import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Options } from "postgres";

import * as schema from "./schema";

/**
 * Build a Drizzle connection. Pass the Supabase transaction pooler url
 * (see .env.example). Mirrors the nexus `createDb` factory so both packages
 * connect to the shared database the same way.
 */
export function createDb(
  url: string,
  options?: Options<Record<string, never>>,
) {
  const client = postgres(url, {
    // The Supabase transaction-mode pooler (port 6543) does not support
    // prepared statements: statements can land on different pooled backends
    // and intermittently lose transactions. Callers on a direct connection
    // can override.
    prepare: false,
    ...options,
  });
  return drizzle(client, { schema });
}

export type Connection = ReturnType<typeof createDb>;

/** Transaction type, extracted from the db.transaction callback parameter. */
export type Transaction = Parameters<
  Parameters<Connection["transaction"]>[0]
>[0];

/** Database type that accepts both connections and transactions. */
export type DB = Connection | Transaction;
