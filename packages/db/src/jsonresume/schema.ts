import { z } from "zod";

/**
 * A JSON Resume document (https://jsonresume.org/schema, v1.0.0), modeled as the
 * subset of fields this tool maps to and from. It is the single shared contract
 * for both directions - export validates its output against it, import (#55)
 * validates its input - so the two halves of the interop can never drift on
 * shape. Field correspondence and the gaps JSON Resume has are recorded in
 * `docs/decisions/0007-json-resume-export.md`.
 *
 * Every field is optional and unknown keys are *stripped*, not rejected (Zod's
 * default object behavior). A real document carries sections we don't model
 * (volunteer, awards, references, ...); on export we never emit them, and on
 * import a strict parse rejecting an otherwise-valid file would be wrong - the
 * extras are dropped silently instead, which is exactly #55's "unknown fields
 * are dropped without failing" rule.
 *
 * Dates are a partial ISO string - "YYYY", "YYYY-MM", or "YYYY-MM-DD" - kept as a
 * bare string rather than a tightened regex: we only ever *emit* year or
 * year-month, and on import we'd rather accept a slightly-off date than reject a
 * whole résumé over one field.
 */
const jsonResumeProfile = z.object({
  network: z.string().optional(),
  username: z.string().optional(),
  url: z.string().optional(),
});
export type JsonResumeProfile = z.infer<typeof jsonResumeProfile>;

const jsonResumeBasics = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional(),
  profiles: z.array(jsonResumeProfile).optional(),
});
export type JsonResumeBasics = z.infer<typeof jsonResumeBasics>;

const jsonResumeWork = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  /** JSON Resume documents this as the company descriptor ("e.g. Social Media
   * Company"), which is exactly our experience `context` line. */
  description: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});
export type JsonResumeWork = z.infer<typeof jsonResumeWork>;

const jsonResumeEducation = z.object({
  institution: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
  courses: z.array(z.string()).optional(),
});
export type JsonResumeEducation = z.infer<typeof jsonResumeEducation>;

const jsonResumeSkill = z.object({
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
export type JsonResumeSkill = z.infer<typeof jsonResumeSkill>;

const jsonResumeProject = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});
export type JsonResumeProject = z.infer<typeof jsonResumeProject>;

export const jsonResume = z.object({
  basics: jsonResumeBasics.optional(),
  work: z.array(jsonResumeWork).optional(),
  education: z.array(jsonResumeEducation).optional(),
  skills: z.array(jsonResumeSkill).optional(),
  projects: z.array(jsonResumeProject).optional(),
});
export type JsonResume = z.infer<typeof jsonResume>;

/**
 * The import boundary's input schema. Same shape as `jsonResume`, but rejects an
 * object with *none* of the recognized sections: because every field is optional
 * and unknown keys are stripped, a bare `{}` - or any JSON object (a misclicked
 * package.json, tsconfig, ...) - would otherwise validate and silently import as
 * a blank résumé. Requiring one recognized section makes a non-résumé file
 * surface as a clear rejection (BAD_REQUEST) with nothing created, the contract
 * ADR 0007 documents. The guard lives here, not on `jsonResume`, because *export*
 * validates its output against `jsonResume` and a legitimately empty résumé
 * exports to `{}` - which is a valid JSON Resume document, just not an importable
 * one.
 */
export const jsonResumeImport = jsonResume.refine(
  (doc) =>
    [doc.basics, doc.work, doc.education, doc.skills, doc.projects].some(
      (section) => section !== undefined,
    ),
  { message: "Not a JSON Resume document." },
);
