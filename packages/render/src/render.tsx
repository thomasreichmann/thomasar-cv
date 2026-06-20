/**
 * Server-side rendering of a résumé to PDF bytes. This is the single path that
 * both the on-screen preview (issue #18, shown via pdf.js) and the download
 * export (issue #19) go through, so the bytes are identical by construction.
 * `renderToBuffer` is pure JS - no headless browser - so it runs in any Node
 * function with nothing to provision (see `docs/decisions/0002-pdf-engine.md`).
 */
import { renderToBuffer } from "@react-pdf/renderer";

import type { ResumeContent } from "@thomasar-cv/db/schema";

import { ResumeDocument, type ResumeDocumentProps } from "./document";

export type RenderOptions = Omit<ResumeDocumentProps, "content">;

export function renderResumeToBuffer(
  content: ResumeContent,
  options: RenderOptions = {},
): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument content={content} {...options} />);
}
