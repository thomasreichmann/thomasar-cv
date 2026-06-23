import { defaultResumeTheme, resumeTheme } from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("resolves the default theme to the template's original values", () => {
    expect(resolveTheme(defaultResumeTheme)).toEqual({
      scale: 1,
      lineHeight: 1.35,
      spacing: 1,
      accent: "#1a1a1a",
    });
  });

  it("maps each control independently to its raw value", () => {
    const theme = resumeTheme.parse({
      scale: "large",
      density: "compact",
      spacing: "relaxed",
      accent: "rust",
    });
    expect(resolveTheme(theme)).toEqual({
      scale: 1.08,
      lineHeight: 1.2,
      spacing: 1.4,
      accent: "#9c3d1a",
    });
  });

  it("gives every accent token a distinct color", () => {
    const accents = ["graphite", "rust", "navy", "forest", "plum"] as const;
    const colors = accents.map(
      (accent) => resolveTheme(resumeTheme.parse({ accent })).accent,
    );
    expect(new Set(colors).size).toBe(accents.length);
  });
});
