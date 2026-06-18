/**
 * Pull the text layer the way an ATS reader would: walk the text items in
 * content-stream order (the order `getTextContent` preserves, which is what a
 * parser ingests) and join them into one ordered string. Item positions let us
 * also prove the layout is a single column - reading order should march down the
 * page and never jump back up mid-column.
 *
 * Promoted from the #17 spike's `extract.ts` (see
 * `docs/decisions/0002-pdf-engine.md`), with one fix: `prevY` resets at every
 * page boundary, so a new page starting back at the top is not miscounted as a
 * backward jump. Harmless on today's one-page résumé, wrong the moment a second
 * page exists - and single-column reading order is exactly what this asserts.
 */
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractResult = {
  pageCount: number;
  width: number;
  height: number;
  /** Every text item concatenated in stream (reading) order. */
  text: string;
  /** Times reading order jumps back up a page by more than a line (a column-interleave signal). */
  upJumps: number;
};

export async function extractTextLayer(pdf: Buffer): Promise<ExtractResult> {
  const task = getDocument({
    data: new Uint8Array(pdf),
    useSystemFonts: false,
    // The template draws built-in Helvetica, whose metrics ship with pdfjs, so
    // its warning about a missing `standardFontDataUrl` is benign here; quiet it
    // to errors. Wire a real `standardFontDataUrl` once the template embeds a
    // font subset, so glyph-to-unicode mapping stays reliable for that font.
    verbosity: VerbosityLevel.ERRORS,
  });
  const doc = await task.promise;

  const viewport = (await doc.getPage(1)).getViewport({ scale: 1 });
  const parts: string[] = [];
  let upJumps = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Reading order is per page: a new page legitimately starts at the top, so
    // reset the baseline and never count the page break itself as a jump.
    let prevY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      // A jump back UP the page (y increases) by more than ~half a line means
      // reading order left a column and resumed higher up - the column interleave
      // an ATS would read out of order.
      if (prevY !== null && y - prevY > 6) upJumps++;
      prevY = y;
      if (item.str.trim()) parts.push(item.str);
    }
  }

  await task.destroy();

  return {
    pageCount: doc.numPages,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    text: parts.join(" "),
    upJumps,
  };
}

/** True if every token appears in order (an ordered subsequence) in `haystack`. */
export function isOrderedSubsequence(
  haystack: string,
  tokens: string[],
): { ok: boolean; firstMissing?: string; firstOutOfOrder?: string } {
  let cursor = 0;
  for (const token of tokens) {
    const idx = haystack.indexOf(token, cursor);
    if (idx === -1) {
      // Absent entirely, or present only before the cursor (so out of order).
      return haystack.includes(token)
        ? { ok: false, firstOutOfOrder: token }
        : { ok: false, firstMissing: token };
    }
    cursor = idx + token.length;
  }
  return { ok: true };
}
