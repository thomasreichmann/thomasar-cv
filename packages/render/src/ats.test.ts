/**
 * The ATS check (issue #20): make the "real, single-column text layer" claim
 * verifiable instead of assumed. Render the seeded résumé to the exact bytes the
 * export ships, pull its text layer the way an ATS reader would, and assert the
 * content comes out whole and in single-column reading order.
 *
 * The oracle is the render model itself (`flattenResume`, issue #18), not a
 * hand-kept copy of the expected text, so the expectation can never drift from
 * what the PDF actually renders. The teeth are in the experience/education/
 * project rows, whose right-aligned dates are the layout that usually scrambles
 * a text layer; a passing extraction over those means something.
 */
import { exampleResume, resumeTheme } from "@thomasar-cv/db/schema";
import { beforeAll, describe, expect, it } from "vitest";

import {
  extractTextLayer,
  isOrderedSubsequence,
  type ExtractResult,
} from "./extract";
import { flattenResume, type Block } from "./model";
import { renderResumeToBuffer } from "./render";

// Collapse whitespace so assertions test content and reading order, not the
// incidental spacing pdfjs reports between text runs.
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The expected reading order, derived from the render model: every block's text
 * in order, a `row` contributing its left heading then its right-aligned date.
 */
const expectedOrder = (blocks: Block[]): string[] =>
  blocks
    .flatMap((b) =>
      b.t === "row" ? [b.left, ...(b.right ? [b.right] : [])] : [b.text],
    )
    .map(norm)
    .filter(Boolean);

describe("exported résumé ATS text layer", () => {
  let layer: ExtractResult;
  let text: string;
  let tokens: string[];

  beforeAll(async () => {
    // Render once through the same path the export uses, then read it back.
    const pdf = await renderResumeToBuffer(exampleResume);
    layer = await extractTextLayer(pdf);
    text = norm(layer.text);
    tokens = expectedOrder(flattenResume(exampleResume, "en"));
  });

  it("is a single A4 page", () => {
    expect(layer.pageCount).toBe(1);
    // A4 is 595 x 842 pt; allow a rounding point of slack.
    expect(Math.abs(layer.width - 595)).toBeLessThanOrEqual(2);
    expect(Math.abs(layer.height - 842)).toBeLessThanOrEqual(2);
  });

  it("carries every content block, verbatim and in reading order", () => {
    const result = isOrderedSubsequence(text, tokens);
    // Pinpoint the first defect so a failure names the offending content.
    expect(result.firstMissing, "content absent from text layer").toBe(
      undefined,
    );
    expect(result.firstOutOfOrder, "content out of reading order").toBe(
      undefined,
    );
    expect(result.ok).toBe(true);
  });

  it("stays a single column: reading order never jumps back up the page", () => {
    expect(layer.upJumps).toBe(0);
  });

  it("omits hidden content (the tailored-out Initech internship)", () => {
    expect(text).not.toContain("Initech");
    expect(text).not.toContain("Engineering Intern");
  });
});

// The theme is presentation only: it sizes and colors blocks but never reorders
// or drops them. So the ATS guarantees that do not depend on page capacity -
// whole content, single-column reading order - must hold under any theme, not
// just the default. (Page count is a layout consequence of scale/spacing and is
// deliberately not asserted here.) Render under a non-default theme and re-run
// those checks.
describe("ATS text layer survives a non-default theme", () => {
  let layer: ExtractResult;
  let text: string;
  let tokens: string[];

  beforeAll(async () => {
    const pdf = await renderResumeToBuffer(exampleResume, {
      theme: resumeTheme.parse({
        density: "compact",
        spacing: "compact",
        scale: "small",
        accent: "rust",
      }),
    });
    layer = await extractTextLayer(pdf);
    text = norm(layer.text);
    tokens = expectedOrder(flattenResume(exampleResume, "en"));
  });

  it("carries every content block, verbatim and in reading order", () => {
    expect(isOrderedSubsequence(text, tokens).ok).toBe(true);
  });

  it("stays a single column", () => {
    expect(layer.upJumps).toBe(0);
  });
});

describe("isOrderedSubsequence", () => {
  it("accepts tokens that appear in order", () => {
    expect(isOrderedSubsequence("a b c d", ["a", "c"]).ok).toBe(true);
  });

  it("flags a token that is absent entirely", () => {
    expect(isOrderedSubsequence("a b c", ["a", "z"])).toEqual({
      ok: false,
      firstMissing: "z",
    });
  });

  it("flags a token present but out of order", () => {
    expect(isOrderedSubsequence("a b c", ["c", "a"])).toEqual({
      ok: false,
      firstOutOfOrder: "a",
    });
  });
});
