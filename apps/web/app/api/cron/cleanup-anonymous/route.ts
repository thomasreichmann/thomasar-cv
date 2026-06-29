import { db } from "@/server/db";
import {
  ANONYMOUS_TTL_MS,
  deleteAbandonedAnonymousUsers,
} from "@/server/anonymous/cleanup";
import { env } from "@/lib/env";

/**
 * Scheduled sweep of abandoned anonymous guests, the TTL job ADR 0005 deferred
 * to #68. Vercel Cron hits this on the schedule in `apps/web/vercel.json`; the
 * deletion itself (and the activity rule and TTL) lives in `deleteAbandonedAnonymousUsers`.
 *
 * Not publicly invocable: Vercel attaches `Authorization: Bearer ${CRON_SECRET}`
 * to cron invocations when that var is set on the project, and this refuses any
 * request whose header does not match - including, fail-closed, every request
 * when the secret is unset. There is no manual trigger; the schedule is the only
 * caller. Node runtime because the sweep talks to Postgres through the same
 * pooled `db` singleton the rest of the server uses.
 */
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - ANONYMOUS_TTL_MS);
  const deleted = await deleteAbandonedAnonymousUsers(db, cutoff);

  return Response.json({ deleted, cutoff: cutoff.toISOString() });
}
