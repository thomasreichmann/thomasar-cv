import {
  contact as contactSchema,
  resumeContent,
  section as sectionSchema,
} from "@thomasar-cv/db/schema";
import { describe, expect, it } from "vitest";

import {
  emptyContact,
  emptySection,
  moveAt,
  newId,
  removeAt,
  replaceAt,
  SECTION_TYPES,
  toggleHidden,
} from "./content-ops";

describe("newId", () => {
  it("is unique, prefixed, and non-empty", () => {
    const a = newId("exp");
    const b = newId("exp");
    expect(a).not.toBe(b);
    expect(a.startsWith("exp_")).toBe(true);
    expect(a.length).toBeGreaterThan("exp_".length);
  });
});

describe("emptySection", () => {
  // The editors construct nodes by hand, so the factories have to land exactly on
  // the schema or a save would bounce as invalid content.
  it.each(SECTION_TYPES)("builds a schema-valid %s section", (type) => {
    const built = emptySection(type);
    expect(built.type).toBe(type);
    expect(built.items).toHaveLength(1);
    expect(() => sectionSchema.parse(built)).not.toThrow();
  });

  it("seeds a whole document that still parses", () => {
    const doc = {
      schemaVersion: 1,
      header: { name: "" },
      sections: SECTION_TYPES.map((type) => emptySection(type)),
    };
    expect(() => resumeContent.parse(doc)).not.toThrow();
  });
});

describe("emptyContact", () => {
  it("is a schema-valid contact", () => {
    expect(() => contactSchema.parse(emptyContact())).not.toThrow();
  });
});

describe("list helpers", () => {
  it("replaceAt swaps one element without mutating the source", () => {
    const source = [1, 2, 3];
    expect(replaceAt(source, 1, 9)).toEqual([1, 9, 3]);
    expect(source).toEqual([1, 2, 3]);
  });

  it("removeAt drops one element without mutating the source", () => {
    const source = [1, 2, 3];
    expect(removeAt(source, 0)).toEqual([2, 3]);
    expect(source).toEqual([1, 2, 3]);
  });

  it("moveAt shifts one element up and down without mutating the source", () => {
    const source = [1, 2, 3];
    expect(moveAt(source, 2, 1)).toEqual([1, 3, 2]);
    expect(moveAt(source, 0, 2)).toEqual([2, 3, 1]);
    expect(source).toEqual([1, 2, 3]);
  });

  it("moveAt past either end is a no-op clone", () => {
    const source = [1, 2, 3];
    expect(moveAt(source, 0, -1)).toEqual([1, 2, 3]);
    expect(moveAt(source, 2, 3)).toEqual([1, 2, 3]);
    expect(moveAt(source, 0, -1)).not.toBe(source);
  });

  it("toggleHidden flips the flag, preserving the rest of the node", () => {
    const node = { id: "exp-1", hidden: false, company: "Acme" };
    expect(toggleHidden(node)).toEqual({
      id: "exp-1",
      hidden: true,
      company: "Acme",
    });
    expect(toggleHidden({ ...node, hidden: true }).hidden).toBe(false);
    expect(node.hidden).toBe(false);
  });
});
