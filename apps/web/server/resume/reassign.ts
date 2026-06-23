import { eq } from "drizzle-orm";

import type { DB } from "@thomasar-cv/db";
import { resume } from "@thomasar-cv/db/schema";

/**
 * Move every résumé owned by `fromUserId` to `toUserId`. This is the guest
 * conversion merge (ADR 0005): on sign-up or sign-in from a guest session, the
 * anonymous user's résumés are reassigned to the account they authenticated as.
 *
 * It deliberately writes across the ownership boundary that `ownedResumes`
 * enforces - that helper scopes every statement to a single `userId` so no
 * caller can touch another owner's rows, which is exactly what a merge must do.
 * So this is the one sanctioned cross-owner write, kept here (not in a router)
 * and called only from `onLinkAccount`, never from request input: both ids come
 * from BetterAuth's verified sessions, never from the caller.
 *
 * One statement, so the move is atomic (all the guest's rows move or none do)
 * and idempotent (a retry matches nothing the second time). Appending only -
 * the target keeps its own résumés plus the guest's as distinct rows; no dedup,
 * no row dropped (ADR 0005). Résumé ids are random UUIDs, so moving rows between
 * owners never collides on the primary key.
 */
export async function reassignResumes(
  db: DB,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  await db
    .update(resume)
    .set({ userId: toUserId })
    .where(eq(resume.userId, fromUserId));
}
