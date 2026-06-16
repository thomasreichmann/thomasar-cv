import { describe, expect, it } from "vitest";

import { exampleResume } from "../fixtures/example-resume";
import { resolveText, resumeContent, section } from "./resume-content";

describe("résumé content document", () => {
  it("validates the example résumé and covers every section type", () => {
    const parsed = resumeContent.parse(exampleResume);
    expect(parsed.schemaVersion).toBe(1);

    const types = parsed.sections.map((s) => s.type);
    // Includes section types the real reference CV does not use.
    expect(new Set(types)).toEqual(
      new Set([
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "custom",
      ]),
    );
  });

  it("fills defaults: omitted `hidden` is false, omitted `bullets` is []", () => {
    const experience = exampleResume.sections.find(
      (s) => s.type === "experience",
    );
    if (experience?.type !== "experience")
      throw new Error("missing experience");

    const acme = experience.items.find((i) => i.id === "exp-acme");
    expect(acme?.hidden).toBe(false);

    const education = exampleResume.sections.find(
      (s) => s.type === "education",
    );
    if (education?.type !== "education") throw new Error("missing education");
    // `details` omitted in the fixture -> defaulted to [].
    expect(education.items[0]?.details).toEqual([]);
  });

  it("keeps order and visibility as data on the document itself", () => {
    const experience = exampleResume.sections.find(
      (s) => s.type === "experience",
    );
    if (experience?.type !== "experience")
      throw new Error("missing experience");

    // Array position is the display order.
    expect(experience.items.map((i) => i.id)).toEqual([
      "exp-acme",
      "exp-globex",
      "exp-intern",
    ]);
    // Hidden-not-deleted is representable.
    expect(experience.items.find((i) => i.id === "exp-intern")?.hidden).toBe(
      true,
    );
  });

  it("represents an ongoing role with end: null", () => {
    const experience = exampleResume.sections.find(
      (s) => s.type === "experience",
    );
    if (experience?.type !== "experience")
      throw new Error("missing experience");
    expect(
      experience.items.find((i) => i.id === "exp-acme")?.dateRange.end,
    ).toBeNull();
  });

  it("rejects an unknown section type", () => {
    const bad = {
      id: "x",
      type: "nope",
      title: "Nope",
      items: [],
    };
    expect(section.safeParse(bad).success).toBe(false);
  });

  describe("i18n seam (resolveText)", () => {
    it("returns a plain string as-is for any locale", () => {
      expect(resolveText("Senior Engineer", "pt")).toBe("Senior Engineer");
    });

    it("returns the per-locale override when present", () => {
      const value = {
        default: "Senior Engineer",
        i18n: { pt: "Engenheiro Sênior" },
      };
      expect(resolveText(value, "pt")).toBe("Engenheiro Sênior");
    });

    it("falls back to default when a locale has no override", () => {
      const value = {
        default: "Senior Engineer",
        i18n: { pt: "Engenheiro Sênior" },
      };
      expect(resolveText(value, "fr")).toBe("Senior Engineer");
    });
  });
});
