import { exampleResume } from "@thomasar-cv/db/schema";
import { renderResumeToBuffer } from "@thomasar-cv/render";

import { PdfPreview } from "./pdf-preview";

/**
 * Proves the v0.2 rendering bet (issue #18): the seeded résumé fixture rendered
 * to a single-page A4 PDF and shown on screen. The PDF is generated here on the
 * server through the shared render definition - the same `renderResumeToBuffer`
 * the export (issue #19) will call - and the bytes are handed to the client,
 * which paints them with pdf.js. The preview is literally the export's bytes, so
 * there is no second layout to keep in sync (see ADR 0002).
 *
 * The fixture carries no personal data, so this route is intentionally public.
 */
export default async function PreviewPage() {
  const pdf = await renderResumeToBuffer(exampleResume);
  const base64 = pdf.toString("base64");

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-14">
      <div
        aria-hidden
        className="glow left-1/2 top-28 size-[680px] -translate-x-1/2"
      />

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-faint">
            Single-page A4
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
            Résumé preview
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Rendered from the seeded example résumé - the same bytes the export
            ships.
          </p>
        </header>
        <div className="flex justify-center">
          <PdfPreview base64={base64} />
        </div>
      </div>
    </main>
  );
}
