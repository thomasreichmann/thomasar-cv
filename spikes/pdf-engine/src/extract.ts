/**
 * Extract the text layer the way an ATS would: read text items in content-
 * stream order (what `getTextContent` preserves) and check the résumé content
 * comes out as an ordered subsequence. Positions let us also prove there is one
 * column - reading order should march down the page, never jump back up.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractResult = {
  pageCount: number;
  width: number;
  height: number;
  /** All text items concatenated in stream (reading) order. */
  text: string;
  /** Times reading order jumps back up the page by more than a line (column interleave signal). */
  upJumps: number;
};

export async function extract(pdf: Buffer): Promise<ExtractResult> {
  const task = getDocument({
    data: new Uint8Array(pdf),
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const doc = await task.promise;

  const viewport = (await doc.getPage(1)).getViewport({ scale: 1 });
  const parts: string[] = [];
  let prevY: number | null = null;
  let upJumps = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      const y = item.transform[5];
      // A jump back UP the page (y increases) by more than ~half a line means
      // the reading order left a column and started a new one higher up.
      if (prevY !== null && y - prevY > 6) upJumps++;
      prevY = y;
      if (str.trim()) parts.push(str);
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

/** True if every token appears in order (ordered subsequence) in `haystack`. */
export function isOrderedSubsequence(
  haystack: string,
  tokens: string[],
): { ok: boolean; firstMissing?: string; firstOutOfOrder?: string } {
  let cursor = 0;
  for (const token of tokens) {
    const idx = haystack.indexOf(token, cursor);
    if (idx === -1) {
      // Missing entirely, or present but earlier than the cursor (out of order).
      return haystack.includes(token)
        ? { ok: false, firstOutOfOrder: token }
        : { ok: false, firstMissing: token };
    }
    cursor = idx + token.length;
  }
  return { ok: true };
}
