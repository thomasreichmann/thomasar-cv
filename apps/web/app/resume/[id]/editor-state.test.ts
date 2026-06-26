import {
  defaultResumeTheme,
  emptyResume,
  type ResumeContent,
  type ResumeTheme,
} from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import { isDirty, validateDraft, type ResumeDraft } from "./editor-state";

/** A small valid content document with one summary section, for mutation tests. */
const withSummary: ResumeContent = {
  schemaVersion: 1,
  header: { name: "Jane", contacts: [] },
  sections: [
    {
      id: "sec-summary",
      type: "summary",
      title: "Summary",
      hidden: false,
      items: [{ id: "sum-1", text: "Hello", hidden: false }],
    },
  ],
};

const theme = defaultResumeTheme;

describe("validateDraft", () => {
  it("rejects a blank or whitespace-only name", () => {
    expect(validateDraft({ name: "", content: emptyResume, theme }).ok).toBe(
      false,
    );
    expect(validateDraft({ name: "   ", content: emptyResume, theme }).ok).toBe(
      false,
    );
  });

  it("rejects content that does not satisfy the schema", () => {
    const bad = { schemaVersion: 2 } as unknown as ResumeContent;
    const result = validateDraft({ name: "CV", content: bad, theme });
    expect(result.ok).toBe(false);
  });

  it("rejects a theme that does not satisfy the schema", () => {
    const bad = { accent: "#ff0000" } as unknown as ResumeTheme;
    const result = validateDraft({ name: "CV", content: emptyResume, theme: bad });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid draft and returns the name verbatim", () => {
    // Padding is preserved so the saved value matches the field the user sees.
    const result = validateDraft({ name: "  My CV ", content: emptyResume, theme });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("  My CV ");
  });
});

describe("isDirty", () => {
  const base: ResumeDraft = { name: "CV", content: withSummary, theme };

  it("is clean against an equal draft", () => {
    expect(isDirty(base, { name: "CV", content: withSummary, theme })).toBe(
      false,
    );
  });

  it("is clean when only key order differs", () => {
    const reordered: ResumeContent = {
      header: { contacts: [], name: "Jane" },
      sections: withSummary.sections,
      schemaVersion: 1,
    };
    expect(isDirty(base, { name: "CV", content: reordered, theme })).toBe(false);
  });

  it("is dirty when the name changes", () => {
    expect(isDirty(base, { name: "CV 2", content: withSummary, theme })).toBe(
      true,
    );
  });

  it("is dirty when nested content changes", () => {
    const edited: ResumeContent = {
      ...withSummary,
      header: { ...withSummary.header, name: "Janet" },
    };
    expect(isDirty(base, { name: "CV", content: edited, theme })).toBe(true);
  });

  it("is dirty when only the theme changes", () => {
    const recolored: ResumeTheme = { ...theme, accent: "rust" };
    expect(
      isDirty(base, { name: "CV", content: withSummary, theme: recolored }),
    ).toBe(true);
  });
});
