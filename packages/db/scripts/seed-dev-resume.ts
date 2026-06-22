import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

import { createDb } from "@thomasar-cv/db";
import { resume, resumeContent, user } from "@thomasar-cv/db/schema";

/**
 * Seed (or refresh) a résumé on the dev-login account from the author's reference
 * CV, so "Sign in as dev" has a realistic, full-length document to exercise the
 * editor and live preview against - not just the synthetic example fixture.
 *
 * The CV is real personal data, so it stays out of this public repo: the content
 * lives in `reference/thomas-reichmann-cv.json`, git-ignored alongside the
 * reference PDF (see `reference/README.md`). This committed script carries no
 * personal data; without that JSON present it just prints how to add it. The
 * document is re-parsed through `resumeContent` before writing, the same gate the
 * app's write path uses, so a hand-edited JSON can't insert an invalid document.
 *
 * Idempotent: upserts by (owner, name), so re-running refreshes the content
 * rather than stacking duplicate résumés on the dev account.
 *
 * Run: `pnpm --filter @thomasar-cv/db db:seed-dev`
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

// Credentials and the dev-account email live in the web app's env; load it
// without overriding anything already exported (DATABASE_URL=... wins).
config({ path: resolve(repoRoot, "apps/web/.env.local") });

const RESUME_NAME = "Thomas Reichmann (reference CV)";
const CV_PATH = resolve(repoRoot, "reference/thomas-reichmann-cv.json");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (apps/web/.env.local).");

  const devEmail = process.env.DEV_LOGIN_EMAIL;
  if (!devEmail) {
    throw new Error("DEV_LOGIN_EMAIL is not set (apps/web/.env.local).");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(CV_PATH, "utf8"));
  } catch {
    console.error(
      `Missing ${CV_PATH}. It is git-ignored (personal data); create it as a\n` +
        `ResumeContent document, then re-run. See reference/README.md.`,
    );
    process.exit(1);
  }

  const parsed = resumeContent.safeParse(raw);
  if (!parsed.success) {
    console.error(
      `${CV_PATH} is not a valid résumé document:\n`,
      parsed.error.message,
    );
    process.exit(1);
  }
  const content = parsed.data;

  const db = createDb(url);

  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, devEmail))
    .limit(1);

  if (!owner) {
    console.error(
      `No user row for ${devEmail}. Click "Sign in as dev" once (it provisions\n` +
        `the account through BetterAuth), then re-run.`,
    );
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: resume.id })
    .from(resume)
    .where(and(eq(resume.userId, owner.id), eq(resume.name, RESUME_NAME)))
    .limit(1);

  if (existing) {
    await db
      .update(resume)
      .set({ content })
      .where(eq(resume.id, existing.id));
    console.log(`Updated résumé ${existing.id} ("${RESUME_NAME}") for ${devEmail}`);
  } else {
    const [row] = await db
      .insert(resume)
      .values({ userId: owner.id, name: RESUME_NAME, content })
      .returning({ id: resume.id });
    console.log(`Created résumé ${row!.id} ("${RESUME_NAME}") for ${devEmail}`);
  }

  process.exit(0);
}

void main();
