import { createDb } from "@thomasar-cv/db";

import { env } from "@/lib/env";

/**
 * Process-wide pooled connection, created once at import (mirrors nexus). The
 * `postgres` client only opens a socket on the first query, so construction is
 * cheap, but it reads `DATABASE_URL` eagerly: the var must be set wherever this
 * module loads (runtime, `next build`, and tests, which use a placeholder).
 */
export const db = createDb(env.DATABASE_URL);
