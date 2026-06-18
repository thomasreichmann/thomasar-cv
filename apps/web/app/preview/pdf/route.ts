import { exampleResume } from "@thomasar-cv/db/schema";
import { renderResumeToBuffer, resumeFileName } from "@thomasar-cv/render";

/**
 * Downloadable PDF export of the seeded résumé (issue #19). It renders through
 * the same `renderResumeToBuffer` that paints the preview (issue #18), so the
 * downloaded file is byte-for-byte what the screen shows - one render
 * definition, two surfaces, no drift (see ADR 0002). The text layer is
 * single-column and selectable by construction; issue #20 turns that into a
 * test.
 *
 * The fixture carries no personal data, so this route is intentionally public,
 * matching the preview page. react-pdf needs the Node runtime (the edge runtime
 * lacks the APIs it relies on).
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const pdf = await renderResumeToBuffer(exampleResume);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resumeFileName(exampleResume)}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
