import { exampleResume } from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { resumeFileName } from "./filename";

describe("resumeFileName", () => {
  it("derives the file name from the résumé's name", () => {
    expect(resumeFileName(exampleResume)).toBe("Jane-Doe.pdf");
  });

  it("folds diacritics and collapses punctuation to single hyphens", () => {
    const content = {
      ...exampleResume,
      header: { ...exampleResume.header, name: "José  Núñez-Smith!" },
    };
    expect(resumeFileName(content)).toBe("Jose-Nunez-Smith.pdf");
  });

  it("falls back to 'resume' when the name has no usable characters", () => {
    const content = {
      ...exampleResume,
      header: { ...exampleResume.header, name: "###" },
    };
    expect(resumeFileName(content)).toBe("resume.pdf");
  });
});
