/**
 * The download filename for an exported résumé (issue #19), derived from the
 * résumé's own name so the file a recruiter receives is "Jane-Doe.pdf" rather
 * than an opaque slug. Diacritics are folded and any run of non-alphanumerics
 * collapses to a single hyphen, which keeps the name safe for a plain
 * `Content-Disposition: attachment; filename="..."` header across browsers.
 *
 * Content-derived, so it lives beside the content schema (next to `resolveText`)
 * rather than in the render package: the PDF export and the JSON Resume export
 * (#54) both need it, and the JSON route has no reason to pull in the PDF
 * renderer just for a filename. The extension is a parameter so one slug serves
 * every output format.
 */
import { resolveText, type ResumeContent } from "./resume-content";

/** Unicode combining diacritical marks, left behind by NFKD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

export function resumeFileName(
  content: ResumeContent,
  locale = "en",
  ext = "pdf",
): string {
  const slug = resolveText(content.header.name, locale)
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "") // fold diacritics: é -> e
    .replace(/[^A-Za-z0-9]+/g, "-") // non-alphanumeric runs -> single hyphen
    .replace(/^-+|-+$/g, "");
  return `${slug || "resume"}.${ext}`;
}
