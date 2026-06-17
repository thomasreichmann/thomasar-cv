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
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Résumé preview
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Single-page A4, rendered from the seeded example résumé.
          </p>
        </header>
        <div className="flex justify-center">
          <PdfPreview base64={base64} />
        </div>
      </div>
    </main>
  );
}
