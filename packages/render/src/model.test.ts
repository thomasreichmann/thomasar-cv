import { exampleResume, type ResumeContent } from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { flattenResume, type Block } from "./model";

const texts = (blocks: Block[]): string[] =>
  blocks.flatMap((b) =>
    b.t === "row" ? [b.left, ...(b.right ? [b.right] : [])] : [b.text],
  );

describe("flattenResume", () => {
  it("emits the header (name, contacts, availability) first, in order", () => {
    const blocks = flattenResume(exampleResume, "en");
    expect(blocks.slice(0, 3)).toEqual([
      { t: "name", text: "Jane Doe" },
      {
        t: "contacts",
        text: "jane@example.dev · linkedin.com/in/janedoe · github.com/janedoe",
      },
      { t: "availability", text: "Open to remote (US / EU)" },
    ]);
  });

  it("drops hidden items without deleting them (the Initech internship)", () => {
    const joined = texts(flattenResume(exampleResume, "en")).join("\n");
    expect(joined).not.toContain("Initech");
    expect(joined).not.toContain("Engineering Intern");
  });

  it("drops hidden sections", () => {
    const content: ResumeContent = {
      ...exampleResume,
      sections: [
        {
          id: "sec-hidden",
          type: "summary",
          title: "Hidden",
          hidden: true,
          items: [{ id: "h1", text: "should not render", hidden: false }],
        },
      ],
    };
    expect(texts(flattenResume(content, "en")).join("\n")).not.toContain(
      "should not render",
    );
  });

  it("renders a summary whose lone item is flagged hidden (section-level visibility governs a summary)", () => {
    const content: ResumeContent = {
      ...exampleResume,
      sections: [
        {
          id: "sec-summary",
          type: "summary",
          title: "Summary",
          hidden: false,
          items: [{ id: "s1", text: "still shown", hidden: true }],
        },
      ],
    };
    expect(texts(flattenResume(content, "en")).join("\n")).toContain(
      "still shown",
    );
  });

  it("keeps section and item order from array position", () => {
    const titles = flattenResume(exampleResume, "en")
      .filter((b) => b.t === "sectionTitle")
      .map((b) => (b.t === "sectionTitle" ? b.text : ""));
    expect(titles).toEqual([
      "Summary",
      "Experience",
      "Education",
      "Skills",
      "Projects",
      "Languages",
    ]);
  });

  it("formats date ranges: ongoing, closed, and single graduation year", () => {
    const rights = flattenResume(exampleResume, "en")
      .filter((b) => b.t === "row")
      .map((b) => (b.t === "row" ? b.right : undefined));
    // Acme (ongoing), Globex (closed), education grad year (end-only).
    expect(rights).toContain("Feb 2024 - Present");
    expect(rights).toContain("Jun 2021 - Jan 2024");
    expect(rights).toContain("2021");
  });

  it("renders no date for an entry with neither a start nor an end (not 'Present')", () => {
    // An import with no dates lands as { start: undefined, end: null }; that is
    // "no date", not an ongoing role - it must not fabricate a bare "Present".
    const content: ResumeContent = {
      schemaVersion: 1,
      header: { name: "Jane Doe", contacts: [] },
      sections: [
        {
          id: "sec-exp",
          type: "experience",
          title: "Experience",
          hidden: false,
          items: [
            {
              id: "x1",
              company: "Acme",
              title: "Engineer",
              hidden: false,
              dateRange: { start: undefined, end: null },
              bullets: [],
            },
          ],
        },
      ],
    };
    const rights = flattenResume(content, "en")
      .filter((b) => b.t === "row")
      .map((b) => (b.t === "row" ? b.right : undefined));
    expect(rights).not.toContain("Present");
    expect(rights).toEqual([undefined]);
  });

  it("resolves translatable values for the requested locale", () => {
    const content: ResumeContent = {
      schemaVersion: 1,
      header: {
        name: { default: "Jane Doe", i18n: { de: "Jana Hirsch" } },
        contacts: [],
      },
      sections: [],
    };
    expect(flattenResume(content, "de")[0]).toEqual({
      t: "name",
      text: "Jana Hirsch",
    });
    expect(flattenResume(content, "en")[0]).toEqual({
      t: "name",
      text: "Jane Doe",
    });
  });
});
