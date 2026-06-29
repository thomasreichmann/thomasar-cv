import { schema } from "@thomasar-cv/db";
import { and, eq } from "drizzle-orm";

import type { Db, DevUser } from "./db";

/** Stable label so the seed is idempotent and never clobbers another résumé the dev account happens to hold. */
const SHOWCASE_NAME = "Jane Doe — Product Engineer";

/**
 * Idempotently put a fully-populated résumé on the dev account so editor and
 * preview captures always have real content to show. Uses the example fixture
 * (synthetic, no personal data) and resets content and theme on every run, so a
 * previous capture's theme tweaks never bleed into the next recording. Scoped to
 * a résumé with the showcase name, so any other résumé under the dev account is
 * left untouched. Returns the id to navigate to.
 */
export async function seedShowcaseResume(
  db: Db,
  user: DevUser,
): Promise<string> {
  const content = schema.exampleResume;
  const existing = await db
    .select({ id: schema.resume.id })
    .from(schema.resume)
    .where(
      and(
        eq(schema.resume.userId, user.id),
        eq(schema.resume.name, SHOWCASE_NAME),
      ),
    )
    .limit(1);

  const found = existing[0];
  if (found) {
    await db
      .update(schema.resume)
      .set({ name: SHOWCASE_NAME, content, theme: schema.defaultResumeTheme })
      .where(eq(schema.resume.id, found.id));
    return found.id;
  }

  const inserted = await db
    .insert(schema.resume)
    .values({
      userId: user.id,
      name: SHOWCASE_NAME,
      content,
      theme: schema.defaultResumeTheme,
    })
    .returning({ id: schema.resume.id });
  const row = inserted[0];
  if (!row) throw new Error("Failed to insert the showcase résumé.");
  return row.id;
}
