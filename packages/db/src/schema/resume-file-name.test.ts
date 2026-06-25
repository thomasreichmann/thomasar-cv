import { describe, expect, it } from "vitest";

import { exampleResume } from "../fixtures/example-resume";
import { resumeFileName } from "./resume-file-name";

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

  it("honors a non-default extension", () => {
    expect(resumeFileName(exampleResume, "en", "json")).toBe("Jane-Doe.json");
  });
});
