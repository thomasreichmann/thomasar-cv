import { resumeContent } from "@thomasar-cv/db/schema";
import { renderResumeToBuffer } from "@thomasar-cv/render";

import { auth } from "@/lib/auth/server";

/**
 * Renders an *unsaved* résumé document to PDF bytes for the editor's live
 * preview (issue #39). The editor POSTs its in-memory content here on every
 * (debounced) edit and paints the bytes with pdf.js, so the preview is the same
 * `renderResumeToBuffer` the export ships - one render definition, no second
 * HTML layout of the résumé to keep in sync (ADR 0002). Order and `hidden` are
 * honored by `flattenResume`, so #38's structural edits show up here for free.
 *
 * Unlike `/preview/pdf` (a public demo of the fixture), this renders whatever the
 * caller sends, so it is gated on a session: it is the editor's surface, and an
 * open render endpoint is needless compute for anyone to spend. It reads no row -
 * the content is the request body - so there is no ownership to check beyond
 * being signed in. The body is validated by `resumeContent` before it can reach
 * the renderer, the same gate the write path uses.
 *
 * react-pdf needs the Node runtime (the edge runtime lacks the APIs it relies on).
 */
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = resumeContent.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid résumé content", { status: 400 });
  }

  const pdf = await renderResumeToBuffer(parsed.data);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      // Per-keystroke, user-specific bytes: never cache them anywhere.
      "Cache-Control": "no-store",
      "Content-Length": String(pdf.length),
    },
  });
}
