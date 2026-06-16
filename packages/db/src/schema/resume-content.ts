import { z } from "zod";

/**
 * The résumé *content document*. A whole résumé is persisted as one of these,
 * serialized into a single `jsonb` column on the `resume` table (see
 * `resume.ts`). The document - not a tree of relational rows - is the unit of
 * versioning: a history snapshot or a tailored variant is just another copy of
 * this shape, which is what makes the git-like model in the requirements cheap.
 * See `docs/decisions/0001-resume-persistence.md`.
 *
 * Validation lives here (Zod) rather than in the database: the column is opaque
 * `jsonb`, and every write goes through `resumeContent.parse()` first.
 */

/**
 * i18n seam. A translatable value is a plain string until it actually needs a
 * second language, at which point it becomes `{ default, i18n }`. Translatability
 * is a property of a *value*, not of a field's type, so the common case (text
 * that reads the same in every language) stays a bare string with no duplication.
 *
 * v1 ships single-language, so every value is a string. Turning i18n on is purely
 * additive - upgrade only the values that differ; `resolveText` already tolerates
 * both shapes, so no migration is needed. See the requirements' i18n seam note.
 */
export const localizedText = z.union([
  z.string(),
  z.object({
    default: z.string(),
    i18n: z.record(z.string(), z.string()),
  }),
]);
export type LocalizedText = z.infer<typeof localizedText>;

/** Read a `LocalizedText` for a locale: per-locale override, else the default. */
export function resolveText(value: LocalizedText, locale: string): string {
  if (typeof value === "string") return value;
  return value.i18n[locale] ?? value.default;
}

/** A year, with an optional month (1-12). Month omitted renders year-only. */
export const yearMonth = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
});
export type YearMonth = z.infer<typeof yearMonth>;

/**
 * A date span. `end: null` means the role is ongoing and renders as "Present";
 * a value means it ended. `start` is optional so a single date (e.g. a degree's
 * graduation year) can be expressed as start-absent + end-set. Render rules:
 *   start + end   -> "start - end"
 *   start + null  -> "start - Present"
 *   no start + end-> "end"        (single date, e.g. grad year)
 */
export const dateRange = z.object({
  start: yearMonth.optional(),
  end: yearMonth.nullable(),
});
export type DateRange = z.infer<typeof dateRange>;

/** A contact link in the header. `value` is shown; `url` overrides the href. */
export const contact = z.object({
  kind: z.enum([
    "email",
    "phone",
    "website",
    "linkedin",
    "github",
    "twitter",
    "other",
  ]),
  value: z.string(),
  url: z.string().optional(),
  label: localizedText.optional(),
});
export type Contact = z.infer<typeof contact>;

/**
 * Fields every section and item carry. `id` is a stable, app-generated handle
 * (so reorder/diff/restore track a node across edits and versions); `hidden`
 * lets a node be tailored out without being deleted. Array position is the
 * display order, so "order" needs no separate field - the array *is* the order.
 */
const nodeBase = {
  id: z.string().min(1),
  hidden: z.boolean().default(false),
};

export const summaryItem = z.object({
  ...nodeBase,
  text: localizedText,
});

export const experienceItem = z.object({
  ...nodeBase,
  company: localizedText,
  /** Short company/context descriptor line the common standards lack. */
  context: localizedText.optional(),
  title: localizedText,
  location: localizedText.optional(),
  dateRange,
  bullets: z.array(localizedText).default([]),
});

export const educationItem = z.object({
  ...nodeBase,
  institution: localizedText,
  degree: localizedText,
  location: localizedText.optional(),
  dateRange,
  details: z.array(localizedText).default([]),
});

export const skillsItem = z.object({
  ...nodeBase,
  /** Optional grouping label, e.g. "Languages" or "Cloud". */
  category: localizedText.optional(),
  skills: z.array(localizedText).default([]),
});

export const projectItem = z.object({
  ...nodeBase,
  name: localizedText,
  url: z.string().optional(),
  description: localizedText.optional(),
  bullets: z.array(localizedText).default([]),
  dateRange: dateRange.optional(),
});

export const customItem = z.object({
  ...nodeBase,
  heading: localizedText.optional(),
  body: localizedText.optional(),
  bullets: z.array(localizedText).default([]),
});

/** Fields shared by every section, regardless of type. */
const sectionBase = {
  id: z.string().min(1),
  /** The section heading, e.g. "EXPERIENCE". */
  title: localizedText,
  hidden: z.boolean().default(false),
};

/**
 * Sections are a discriminated union on `type`, so each kind gets a precise item
 * shape while the whole résumé stays a single document. A summary is uniform with
 * the rest - a section whose `items` holds exactly one text node - so render and
 * reorder code can treat every section the same.
 */
export const section = z.discriminatedUnion("type", [
  z.object({
    ...sectionBase,
    type: z.literal("summary"),
    items: z.array(summaryItem),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("experience"),
    items: z.array(experienceItem),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("education"),
    items: z.array(educationItem),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("skills"),
    items: z.array(skillsItem),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("projects"),
    items: z.array(projectItem),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("custom"),
    items: z.array(customItem),
  }),
]);
export type Section = z.infer<typeof section>;
export type SectionType = Section["type"];

export const resumeHeader = z.object({
  name: localizedText,
  contacts: z.array(contact).default([]),
  /** Header-level remote/availability note, e.g. "Open to remote". */
  availability: localizedText.optional(),
});
export type ResumeHeader = z.infer<typeof resumeHeader>;

/**
 * The full résumé document stored in `resume.content`. `schemaVersion` tags the
 * shape of *this JSON*, independent of the résumé's own history/variants, so the
 * document format can be migrated later without guessing.
 */
export const resumeContent = z.object({
  schemaVersion: z.literal(1),
  header: resumeHeader,
  sections: z.array(section).default([]),
});
export type ResumeContent = z.infer<typeof resumeContent>;
