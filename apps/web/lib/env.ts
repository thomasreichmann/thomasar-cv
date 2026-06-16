import { z } from "zod";

/**
 * Server-only environment. Validated lazily on first access (not at import) so
 * `next build` and unit tests that never touch a server var don't need secrets
 * present. Add `NEXT_PUBLIC_*` client vars as a separate eager schema when the
 * first one appears.
 */
const serverSchema = z.object({
  // Supabase transaction pooler url (port 6543). See apps/web/.env.example.
  DATABASE_URL: z.url(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cache: ServerEnv | null = null;

export const env = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    cache ??= serverSchema.parse(process.env);
    return cache[prop as keyof ServerEnv];
  },
});
