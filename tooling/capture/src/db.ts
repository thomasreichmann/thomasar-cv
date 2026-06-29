import { createDb, schema } from "@thomasar-cv/db";
import { eq } from "drizzle-orm";

import { readEnvFile } from "./env";
import { DB_ENV, WEB_ENV } from "./paths";

export type Db = ReturnType<typeof createDb>;

export interface DevUser {
  id: string;
  email: string;
}

/** Prefer an exported DATABASE_URL, else fall back to packages/db/.env (what migrations use). Seeding writes to whatever this resolves to - the shared dev DB in normal use. */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? readEnvFile(DB_ENV).DATABASE_URL;
  if (!url) {
    throw new Error(
      "No DATABASE_URL. Export it, or copy packages/db/.env.example to packages/db/.env (see tooling/capture/README.md).",
    );
  }
  return url;
}

/** The dev-login account's email, used to find its row after the sign-in shortcut provisions it. */
export function devLoginEmail(): string {
  const email =
    process.env.DEV_LOGIN_EMAIL ?? readEnvFile(WEB_ENV).DEV_LOGIN_EMAIL;
  if (!email) {
    throw new Error(
      "No DEV_LOGIN_EMAIL in apps/web/.env.local; the capture tool signs in through the dev shortcut, which needs it set.",
    );
  }
  return email;
}

export function connect(): Db {
  return createDb(resolveDatabaseUrl());
}

export async function findDevUser(db: Db, email: string): Promise<DevUser> {
  const rows = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error(
      `Dev user ${email} not found. The sign-in step provisions it on first run; ensure the dev server is reachable and DEV_LOGIN_* is set.`,
    );
  }
  return row;
}
