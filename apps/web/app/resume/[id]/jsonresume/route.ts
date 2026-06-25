import { resumeFileName } from "@thomasar-cv/db/schema";
import { toJsonResume } from "@thomasar-cv/db/jsonresume";
import { TRPCError } from "@trpc/server";

import { auth } from "@/lib/auth/server";
import { db } from "@/server/db";
import { ownedResumes } from "@/server/resume/ownership";

/**
 * Download an owned résumé as a JSON Resume document (issue #54). Scoped to the
 * signed-in owner through the one ownership boundary (`ownedResumes`), so a
 * caller can only export their own résumé and a missing or not-owned id surfaces
 * as 404 - the same non-probeable outcome the tRPC API gives. The content->JSON
 * Resume correspondence lives entirely in `toJsonResume`; this route only wires
 * auth, the lookup, and the download headers around it.
 *
 * It exports the *saved* document, not unsaved editor edits: the route reads the
 * persisted row, so a user exports what they last saved.
 */
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  // `get` raises NOT_FOUND for a missing or not-owned id; map only that to 404 and
  // let anything else (a real DB fault) surface as a 500.
  const row = await ownedResumes(db, session.user.id)
    .get(id)
    .catch((err: unknown) => {
      if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
      throw err;
    });
  if (!row) return new Response("Not found", { status: 404 });

  const body = JSON.stringify(toJsonResume(row.content), null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${resumeFileName(row.content, "en", "json")}"`,
      // User-specific content; never cache it anywhere.
      "Cache-Control": "no-store",
    },
  });
}
