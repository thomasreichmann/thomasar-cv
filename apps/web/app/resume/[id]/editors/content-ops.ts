import type {
  Contact,
  CustomItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Section,
  SectionType,
  SkillsItem,
  SummaryItem,
} from "@thomasar-cv/db/schema";

/**
 * Pure helpers the section editors (#37) build their immutable updates from.
 * Kept free of React and of the `@thomasar-cv/db/schema` Zod *values* so it stays
 * a plain data module the web package's node-env Vitest can exercise directly -
 * the editor components themselves only have Playwright coverage.
 */

/**
 * A node's `id` only has to be unique within one document and stable for the life
 * of an edit session (so a row keeps its React key and, later, its reorder/diff
 * identity). `crypto.randomUUID` satisfies both in the browser and under Node's
 * test runner; the prefix is purely to make a stored document readable.
 */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Replace element `index` with `next`, returning a new array (originals untouched). */
export function replaceAt<T>(items: readonly T[], index: number, next: T): T[] {
  return items.map((item, i) => (i === index ? next : item));
}

/** Drop element `index`, returning a new array. */
export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

export const SECTION_TYPES: readonly SectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "custom",
];

export const SECTION_LABEL: Record<SectionType, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  custom: "Custom",
};

/** What one entry in each section type is called, for "Add a …" controls. */
export const SECTION_ITEM_NOUN: Record<SectionType, string> = {
  summary: "line",
  experience: "role",
  education: "entry",
  skills: "group",
  projects: "project",
  custom: "entry",
};

export function emptyContact(): Contact {
  return { kind: "email", value: "" };
}

export function emptySummaryItem(): SummaryItem {
  return { id: newId("sum"), hidden: false, text: "" };
}

export function emptyExperienceItem(): ExperienceItem {
  // `dateRange: { end: null }` is the empty-but-valid span (start optional, end
  // nullable); the date control reads its starting mode from a default, not from
  // this ambiguous value. See date-range-field.tsx.
  return {
    id: newId("exp"),
    hidden: false,
    company: "",
    title: "",
    dateRange: { end: null },
    bullets: [],
  };
}

export function emptyEducationItem(): EducationItem {
  return {
    id: newId("edu"),
    hidden: false,
    institution: "",
    degree: "",
    dateRange: { end: null },
    details: [],
  };
}

export function emptySkillsItem(): SkillsItem {
  return { id: newId("skill"), hidden: false, skills: [] };
}

export function emptyProjectItem(): ProjectItem {
  return { id: newId("proj"), hidden: false, name: "", bullets: [] };
}

export function emptyCustomItem(): CustomItem {
  return { id: newId("custom"), hidden: false, bullets: [] };
}

/** A fresh section of `type`, seeded with one blank entry so it is never an empty void. */
export function emptySection(type: SectionType): Section {
  const base = { id: newId("sec"), hidden: false, title: SECTION_LABEL[type] };
  switch (type) {
    case "summary":
      return { ...base, type, items: [emptySummaryItem()] };
    case "experience":
      return { ...base, type, items: [emptyExperienceItem()] };
    case "education":
      return { ...base, type, items: [emptyEducationItem()] };
    case "skills":
      return { ...base, type, items: [emptySkillsItem()] };
    case "projects":
      return { ...base, type, items: [emptyProjectItem()] };
    case "custom":
      return { ...base, type, items: [emptyCustomItem()] };
  }
}
