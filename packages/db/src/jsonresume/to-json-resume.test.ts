import { describe, expect, it } from "vitest";

import { emptyResume } from "../schema/resume-content";
import type { ResumeContent } from "../schema/resume-content";
import { exampleResume } from "../fixtures/example-resume";
import { jsonResume } from "./schema";
import { toJsonResume } from "./to-json-resume";

/** Parse through the shared schema, throwing on any shape violation. */
const asValid = (content: ResumeContent) => jsonResume.parse(toJsonResume(content));

describe("toJsonResume", () => {
  it("produces a valid JSON Resume document for the fully-populated example", () => {
    // The example exercises every section type; a clean parse is the AC2 proof
    // that export yields a valid document.
    expect(() => asValid(exampleResume)).not.toThrow();
  });

  it("produces a valid (empty) document for a blank résumé", () => {
    const doc = asValid(emptyResume);
    expect(doc).toEqual({});
  });

  it("covers every section type the model has", () => {
    const doc = toJsonResume(exampleResume);
    // experience -> work, education, skills, projects all present; summary folds
    // into basics; custom is the one type with no standard home (asserted below).
    expect(doc.work?.length).toBeGreaterThan(0);
    expect(doc.education?.length).toBeGreaterThan(0);
    expect(doc.skills?.length).toBeGreaterThan(0);
    expect(doc.projects?.length).toBeGreaterThan(0);
    expect(doc.basics?.summary).toBeTruthy();
  });

  it("maps the header name and folds availability into basics.label", () => {
    const { basics } = toJsonResume(exampleResume);
    expect(basics?.name).toBe("Jane Doe");
    expect(basics?.label).toBe("Open to remote (US / EU)");
  });

  it("splits contacts into the singular basics fields and profiles", () => {
    const { basics } = toJsonResume(exampleResume);
    expect(basics?.email).toBe("jane@example.dev");
    expect(basics?.profiles).toEqual([
      { network: "LinkedIn", username: "linkedin.com/in/janedoe" },
      { network: "GitHub", username: "github.com/janedoe" },
    ]);
  });

  it("keeps an extra contact of a singular kind as a profile rather than dropping it", () => {
    const content: ResumeContent = {
      ...exampleResume,
      header: {
        name: "Jane Doe",
        contacts: [
          { kind: "email", value: "first@example.dev" },
          { kind: "email", value: "second@example.dev" },
          { kind: "phone", value: "+1 555 0100" },
        ],
      },
    };
    const { basics } = toJsonResume(content);
    expect(basics?.email).toBe("first@example.dev");
    expect(basics?.phone).toBe("+1 555 0100");
    expect(basics?.profiles).toEqual([
      { network: "Email", username: "second@example.dev" },
    ]);
  });

  it("maps experience, with company context into work.description", () => {
    const acme = toJsonResume(exampleResume).work?.[0];
    expect(acme).toMatchObject({
      name: "Acme Corp",
      position: "Senior Engineer",
      description: "Series B logistics platform",
      location: "Remote",
      startDate: "2024-02",
    });
    expect(acme?.highlights?.length).toBeGreaterThan(0);
  });

  it("omits endDate for an ongoing role and sets it for a finished one", () => {
    const work = toJsonResume(exampleResume).work ?? [];
    const [acme, globex] = work;
    // Acme is ongoing (end: null) -> JSON Resume marks "Present" by no endDate.
    expect(acme?.endDate).toBeUndefined();
    expect(globex).toMatchObject({ startDate: "2021-06", endDate: "2024-01" });
  });

  it("drops hidden items and sections from the export", () => {
    // The example's intern role is hidden, so only the two visible roles export.
    const names = toJsonResume(exampleResume).work?.map((w) => w.name);
    expect(names).toEqual(["Acme Corp", "Globex"]);
  });

  it("maps a single graduation year to endDate only", () => {
    const edu = toJsonResume(exampleResume).education?.[0];
    expect(edu).toMatchObject({
      institution: "State University",
      studyType: "BSc Computer Science",
      endDate: "2021",
    });
    expect(edu?.startDate).toBeUndefined();
  });

  it("maps a skills group's category to name and skills to keywords", () => {
    const skills = toJsonResume(exampleResume).skills ?? [];
    expect(skills[0]).toEqual({
      name: "Languages",
      keywords: ["TypeScript", "Go", "SQL"],
    });
  });

  it("maps a project with its url, description, and highlights", () => {
    const project = toJsonResume(exampleResume).projects?.[0];
    expect(project).toMatchObject({
      name: "résumé-as-data",
      url: "https://github.com/janedoe/resume-as-data",
      description: "A structured-data résumé builder with faithful PDF export.",
    });
    expect(project?.highlights?.length).toBe(1);
  });

  it("omits custom sections, which the standard has no field for", () => {
    // The example's only custom section is "Languages"; it must not leak into a
    // top-level key, and the export stays valid without it.
    const doc = toJsonResume(exampleResume);
    expect(doc).not.toHaveProperty("languages");
    expect(() => asValid(exampleResume)).not.toThrow();
  });

  it("strips unknown JSON Resume sections instead of rejecting them", () => {
    // The import side (#55) leans on this: a real document carries sections we
    // don't model, and the shared schema drops them without failing the parse.
    const parsed = jsonResume.parse({
      basics: { name: "X" },
      volunteer: [{ organization: "Red Cross" }],
      meta: { version: "v1.0.0" },
    });
    expect(parsed).toEqual({ basics: { name: "X" } });
  });

  it("never serializes an explicit null", () => {
    // The mapper omits absent fields rather than nulling them - notably an ongoing
    // role drops endDate - so the JSON stays clean and standard.
    expect(JSON.stringify(toJsonResume(exampleResume))).not.toContain("null");
  });
});
