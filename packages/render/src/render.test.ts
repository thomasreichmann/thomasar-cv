import { exampleResume } from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { renderResumeToBuffer } from "./render";

describe("renderResumeToBuffer", () => {
  it("renders the seeded résumé to a non-empty PDF", async () => {
    const buffer = await renderResumeToBuffer(exampleResume);
    expect(buffer.length).toBeGreaterThan(0);
    // Every PDF starts with the "%PDF-" magic header.
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  // The deep ATS check (extract the text layer, assert single-column reading
  // order) lives in `ats.test.ts`; here we only prove the render definition
  // produces a PDF at all.
});
