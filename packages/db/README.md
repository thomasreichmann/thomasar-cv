# @thomasar-cv/db

Drizzle ORM + Supabase Postgres for thomasar-cv.

Everything is namespaced under a dedicated **`resume`** Postgres schema. The
underlying Supabase project is shared with `nexus` (free-project cap), so this
package never touches `public` and never references nexus tables - the schema is
self-contained and portable.

## Setup

```bash
cp .env.example .env
# fill in DATABASE_URL with the Supabase transaction pooler url (port 6543)
```

`createDb()` connects with `prepare: false`, which the transaction pooler
requires (it runs in transaction mode and does not support prepared statements).

## Scripts

| Script        | What it does                                                        |
| ------------- | ------------------------------------------------------------------- |
| `db:generate` | Diff the schema and emit a SQL migration under `drizzle/`. Offline. |
| `db:migrate`  | Apply pending migrations. Needs `DATABASE_URL`.                     |
| `db:studio`   | Open Drizzle Studio. Needs `DATABASE_URL`.                          |

Run them from this package, e.g. `pnpm --filter @thomasar-cv/db db:generate`.

Migrations are tracked in `resume.__drizzle_migrations` so they never collide
with nexus's own journal.

## Usage

```ts
import { createDb, ping } from "@thomasar-cv/db";

const db = createDb(process.env.DATABASE_URL!);
const rows = await db.select().from(ping);
```

`createDb` mirrors nexus's factory (same shared database): it sets `prepare: false`
for the transaction pooler and takes an optional postgres.js options override.
