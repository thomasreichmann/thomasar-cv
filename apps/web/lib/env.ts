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
  // Shared secret the cron sweep authenticates with (issue #68). Vercel attaches
  // `Authorization: Bearer ${CRON_SECRET}` to scheduled invocations only when
  // this var is set on the project, so it gates the otherwise-public route.
  // Optional in the schema because the whole object is parsed on first access of
  // any var (the eager db singleton reads DATABASE_URL at import): a required
  // field would force the secret into dev, tests, and `next build`, none of which
  // run the cron. The route refuses when it is unset, so a missing secret fails
  // closed rather than opening the endpoint.
  CRON_SECRET: z.string().min(1).optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cache: ServerEnv | null = null;

export const env = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    cache ??= serverSchema.parse(process.env);
    return cache[prop as keyof ServerEnv];
  },
});
