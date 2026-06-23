import { describe, expect, it } from "vitest";

import { defaultResumeTheme, resumeTheme } from "./resume-theme";

describe("résumé theme", () => {
  it("defaults an empty theme to the neutral baseline", () => {
    expect(resumeTheme.parse({})).toEqual({
      density: "normal",
      spacing: "normal",
      scale: "normal",
      accent: "graphite",
    });
  });

  it("exposes that same baseline as defaultResumeTheme", () => {
    expect(defaultResumeTheme).toEqual(resumeTheme.parse({}));
  });

  it("fills only the omitted controls, keeping the ones supplied", () => {
    expect(resumeTheme.parse({ accent: "rust", scale: "large" })).toEqual({
      density: "normal",
      spacing: "normal",
      scale: "large",
      accent: "rust",
    });
  });

  it("is bounded: rejects a control value outside its closed set", () => {
    expect(resumeTheme.safeParse({ density: "airy" }).success).toBe(false);
    expect(resumeTheme.safeParse({ scale: "huge" }).success).toBe(false);
  });

  it("rejects a freeform accent (a hex color is not a token)", () => {
    expect(resumeTheme.safeParse({ accent: "#ff0000" }).success).toBe(false);
  });
});
