import { describe, expect, it } from "vitest";

import { emptyResume, resumeContent } from "../schema/resume-content";
import type { ResumeContent, Section } from "../schema/resume-content";
import { exampleResume } from "../fixtures/example-resume";
import { fromJsonResume } from "./from-json-resume";
import { toJsonResume } from "./to-json-resume";

/** Node ids are freshly minted per import, so equality is asserted id-blind. */
function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "id")
        .map(([key, val]) => [key, stripIds(val)]),
    ) as T;
  }
  return value;
}

/** The one section of a given type, narrowed so its items are precisely typed. */
function sectionOfType<T extends Section["type"]>(
  content: ResumeContent,
  type: T,
): Extract<Section, { type: T }> {
  const found = content.sections.find((s) => s.type === type);
  if (!found) throw new Error(`expected a ${type} section`);
  return found as Extract<Section, { type: T }>;
}

describe("fromJsonResume", () => {
  it("produces the empty document for an empty JSON Resume", () => {
    // The inverse of export's "blank résumé -> {}" - a document with nothing to
    // map yields the same minimal valid résumé `resume.create` defaults to.
    expect(fromJsonResume({})).toEqual(emptyResume);
  });

  it("always returns a schema-valid content document", () => {
    // The mapper runs its output through `resumeContent`, so a created résumé is
    // never half-formed even from a sparse document.
    expect(() => resumeContent.parse(fromJsonResume({ work: [{}] }))).not.toThrow();
  });

  it("maps name, and reads availability back out of basics.label", () => {
    const content = fromJsonResume({
      basics: { name: "Jane Doe", label: "Open to remote" },
    });
    expect(content.header.name).toBe("Jane Doe");
    expect(content.header.availability).toBe("Open to remote");
  });

  it("rebuilds singular contacts and profiles into header contacts", () => {
    const content = fromJsonResume({
      basics: {
        email: "jane@example.dev",
        phone: "+1 555 0100",
        url: "https://jane.dev",
        profiles: [
          { network: "LinkedIn", username: "linkedin.com/in/janedoe" },
          { network: "GitHub", username: "github.com/janedoe" },
        ],
      },
    });
    expect(content.header.contacts).toEqual([
      { kind: "email", value: "jane@example.dev" },
      { kind: "phone", value: "+1 555 0100" },
      { kind: "website", value: "https://jane.dev" },
      { kind: "linkedin", value: "linkedin.com/in/janedoe" },
      { kind: "github", value: "github.com/janedoe" },
    ]);
  });

  it("keeps an extra email profile as a second email contact, url and all", () => {
    // Export parks a second email in `profiles` with a mailto: href; the inverse
    // restores it as another email contact rather than dropping it.
    const content = fromJsonResume({
      basics: {
        email: "first@example.dev",
        profiles: [
          {
            network: "Email",
            username: "second@example.dev",
            url: "mailto:second@example.dev",
          },
        ],
      },
    });
    expect(content.header.contacts).toEqual([
      { kind: "email", value: "first@example.dev" },
      {
        kind: "email",
        value: "second@example.dev",
        url: "mailto:second@example.dev",
      },
    ]);
  });

  it("maps an unrecognized network to an `other` contact that keeps its label", () => {
    const content = fromJsonResume({
      basics: { profiles: [{ network: "Mastodon", username: "@jane@hachyderm.io" }] },
    });
    expect(content.header.contacts).toEqual([
      { kind: "other", value: "@jane@hachyderm.io", label: "Mastodon" },
    ]);
  });

  it("drops a profile that has no username", () => {
    const content = fromJsonResume({
      basics: { profiles: [{ network: "GitHub" }, { username: "kept" }] },
    });
    expect(content.header.contacts).toEqual([{ kind: "other", value: "kept" }]);
  });

  it("turns basics.summary into a single summary section", () => {
    const content = fromJsonResume({ basics: { summary: "One sharp paragraph." } });
    expect(sectionOfType(content, "summary")).toMatchObject({
      title: "Summary",
      items: [{ text: "One sharp paragraph." }],
    });
  });

  it("maps work, with description into context and an ongoing role to end: null", () => {
    const content = fromJsonResume({
      work: [
        {
          name: "Acme Corp",
          position: "Senior Engineer",
          description: "Series B logistics platform",
          location: "Remote",
          startDate: "2024-02",
          highlights: ["Led the rewrite."],
        },
        { name: "Globex", position: "Engineer", startDate: "2021-06", endDate: "2024-01" },
      ],
    });
    const section = sectionOfType(content, "experience");
    expect(section.title).toBe("Experience");
    expect(section.items[0]).toMatchObject({
      company: "Acme Corp",
      title: "Senior Engineer",
      context: "Series B logistics platform",
      location: "Remote",
      dateRange: { start: { year: 2024, month: 2 }, end: null },
      bullets: ["Led the rewrite."],
    });
    expect(section.items[1]).toMatchObject({
      dateRange: { start: { year: 2021, month: 6 }, end: { year: 2024, month: 1 } },
    });
  });

  it("rejoins studyType and area into one degree string", () => {
    const content = fromJsonResume({
      education: [{ institution: "State University", studyType: "BSc", area: "Computer Science" }],
    });
    expect(sectionOfType(content, "education").items[0]).toMatchObject({
      institution: "State University",
      degree: "BSc Computer Science",
    });
  });

  it("trims the studyType/area parts so a stray space doesn't double up in the degree", () => {
    const content = fromJsonResume({
      education: [{ institution: "State University", studyType: "BSc ", area: " CS" }],
    });
    expect(sectionOfType(content, "education").items[0]).toMatchObject({
      degree: "BSc CS",
    });
  });

  it("maps a single graduation year to an end-only date range", () => {
    const content = fromJsonResume({
      education: [{ institution: "State University", studyType: "BSc", endDate: "2021" }],
    });
    const item = sectionOfType(content, "education").items[0];
    expect(item?.dateRange.end).toEqual({ year: 2021 });
    expect(item?.dateRange.start).toBeUndefined();
  });

  it("maps skills, omitting the category when the group is unnamed", () => {
    const content = fromJsonResume({
      skills: [
        { name: "Languages", keywords: ["TypeScript", "Go"] },
        { keywords: ["misc"] },
      ],
    });
    expect(sectionOfType(content, "skills").items).toEqual([
      { id: expect.any(String), hidden: false, category: "Languages", skills: ["TypeScript", "Go"] },
      { id: expect.any(String), hidden: false, skills: ["misc"] },
    ]);
  });

  it("maps a project, attaching a date range only when one is present", () => {
    const content = fromJsonResume({
      projects: [
        {
          name: "résumé-as-data",
          url: "https://example.dev/p",
          description: "A structured-data résumé builder.",
          highlights: ["ATS-clean by construction."],
        },
        { name: "ongoing", startDate: "2025-01" },
      ],
    });
    const items = sectionOfType(content, "projects").items;
    expect(items[0]).toMatchObject({
      name: "résumé-as-data",
      url: "https://example.dev/p",
      description: "A structured-data résumé builder.",
      bullets: ["ATS-clean by construction."],
    });
    expect(items[0]?.dateRange).toBeUndefined();
    // A project with only a start is ongoing - a range with a null end.
    expect(items[1]?.dateRange).toEqual({ start: { year: 2025, month: 1 }, end: null });
  });

  it("does not fabricate an ongoing project range from an empty or unreadable endDate", () => {
    // An empty/unparseable endDate carries no date; it must not become a `null`
    // end (which renders as "Present") when there is no start either.
    const content = fromJsonResume({
      projects: [
        { name: "blank", endDate: "" },
        { name: "junk", endDate: "whenever" },
      ],
    });
    const items = sectionOfType(content, "projects").items;
    expect(items[0]?.dateRange).toBeUndefined();
    expect(items[1]?.dateRange).toBeUndefined();
  });

  it("tolerates partial and malformed dates rather than failing the import", () => {
    const content = fromJsonResume({
      work: [
        { name: "A", startDate: "2020-07-15", endDate: "2020-13" },
        { name: "B", startDate: "sometime" },
      ],
    });
    const items = sectionOfType(content, "experience").items;
    // Day is dropped (we model none); an out-of-range month falls back to the year.
    expect(items[0]?.dateRange).toEqual({ start: { year: 2020, month: 7 }, end: { year: 2020 } });
    // An unreadable date is dropped; with no end the role reads as ongoing.
    expect(items[1]?.dateRange).toEqual({ end: null });
  });

  it("drops a malformed date with trailing garbage rather than misreading the year", () => {
    // The anchored parser rejects "20245" / "2024-99-13extra" outright instead of
    // silently coercing them to a plausible-but-wrong { year: 2024 }.
    const content = fromJsonResume({
      work: [{ name: "A", startDate: "20245", endDate: "2024-99-13extra" }],
    });
    // Neither bound parses, so the role has no start and reads as ongoing.
    expect(sectionOfType(content, "experience").items[0]?.dateRange).toEqual({
      end: null,
    });
  });

  it("omits a section whose JSON Resume array is empty", () => {
    const content = fromJsonResume({ work: [], education: [], skills: [], projects: [] });
    expect(content.sections).toEqual([]);
  });

  it("round-trips the visible, mappable résumé back through the same field table", () => {
    // The strongest AC proof: export then import the example and confirm every
    // field the standard *can* hold survives the round trip. What the export
    // deliberately drops (the hidden intern role, the custom "Languages" section,
    // the education location) is absent here by design, documented in ADR 0007.
    const expected: ResumeContent = resumeContent.parse({
      schemaVersion: 1,
      header: {
        name: "Jane Doe",
        contacts: [
          { kind: "email", value: "jane@example.dev" },
          { kind: "linkedin", value: "linkedin.com/in/janedoe" },
          { kind: "github", value: "github.com/janedoe" },
        ],
        availability: "Open to remote (US / EU)",
      },
      sections: [
        {
          id: "summary",
          type: "summary",
          title: "Summary",
          items: [
            {
              id: "s",
              text: "Full-stack engineer focused on building reliable, ATS-clean tools with a small, sharp feature set.",
            },
          ],
        },
        {
          id: "experience",
          type: "experience",
          title: "Experience",
          items: [
            {
              id: "a",
              company: "Acme Corp",
              context: "Series B logistics platform",
              title: "Senior Engineer",
              location: "Remote",
              dateRange: { start: { year: 2024, month: 2 }, end: null },
              bullets: [
                "Led the rewrite of the routing service, cutting p95 latency by 40%.",
                "Owned the migration to typed end-to-end APIs.",
              ],
            },
            {
              id: "g",
              company: "Globex",
              title: "Engineer",
              location: "Berlin, DE",
              dateRange: { start: { year: 2021, month: 6 }, end: { year: 2024, month: 1 } },
              bullets: ["Built the internal data pipeline serving 12 teams."],
            },
          ],
        },
        {
          id: "education",
          type: "education",
          title: "Education",
          items: [
            {
              id: "e",
              institution: "State University",
              degree: "BSc Computer Science",
              dateRange: { end: { year: 2021 } },
            },
          ],
        },
        {
          id: "skills",
          type: "skills",
          title: "Skills",
          items: [
            { id: "l", category: "Languages", skills: ["TypeScript", "Go", "SQL"] },
            { id: "i", category: "Infrastructure", skills: ["Postgres", "Docker", "AWS"] },
          ],
        },
        {
          id: "projects",
          type: "projects",
          title: "Projects",
          items: [
            {
              id: "p",
              name: "résumé-as-data",
              url: "https://github.com/janedoe/resume-as-data",
              description: "A structured-data résumé builder with faithful PDF export.",
              bullets: ["Single-page A4, real text layer, ATS-clean by construction."],
            },
          ],
        },
      ],
    });

    const restored = fromJsonResume(toJsonResume(exampleResume));
    expect(stripIds(restored)).toEqual(stripIds(expected));
  });
});
