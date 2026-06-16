import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  // Only ever introspect / diff the resume schema - nexus shares this database.
  schemaFilter: ["resume"],
  // Keep our migration journal inside the resume schema so it never collides
  // with nexus's `drizzle.__drizzle_migrations`.
  migrations: {
    schema: "resume",
    table: "__drizzle_migrations",
  },
  // Empty fallback keeps `db:generate` runnable offline (it never connects);
  // `db:migrate` / `db:studio` need a real DATABASE_URL. See .env.example.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
