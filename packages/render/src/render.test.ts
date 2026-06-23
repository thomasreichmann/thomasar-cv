import { exampleResume, resumeTheme } from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { renderResumeToBuffer } from "./render";

describe("renderResumeToBuffer", () => {
  it("renders the seeded résumé to a non-empty PDF", async () => {
    const buffer = await renderResumeToBuffer(exampleResume);
    expect(buffer.length).toBeGreaterThan(0);
    // Every PDF starts with the "%PDF-" magic header.
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  // The theme is applied in this one render path, so the preview and the export
  // (both of which call this function) cannot show different themes. A custom
  // theme must change the output; if it did not, the theme would not be reaching
  // the page at all.
  it("applies the theme: a custom theme changes the bytes", async () => {
    const def = await renderResumeToBuffer(exampleResume);
    const themed = await renderResumeToBuffer(exampleResume, {
      theme: resumeTheme.parse({ accent: "rust", scale: "large" }),
    });
    expect(themed.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(themed.equals(def)).toBe(false);
  });

  // The deep ATS check (extract the text layer, assert single-column reading
  // order) lives in `ats.test.ts`; here we only prove the render definition
  // produces a PDF at all.
});
