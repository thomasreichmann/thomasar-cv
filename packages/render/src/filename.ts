/**
 * The download filename for an exported résumé (issue #19). Derived from the
 * résumé's own name so the file a recruiter receives is "Jane-Doe.pdf" rather
 * than an opaque slug. Diacritics are folded and any run of non-alphanumerics
 * collapses to a single hyphen, which keeps the name safe for a plain
 * `Content-Disposition: attachment; filename="..."` header across browsers.
 */
import { resolveText, type ResumeContent } from "@thomasar-cv/db/schema";

/** Unicode combining diacritical marks, left behind by NFKD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

export function resumeFileName(content: ResumeContent, locale = "en"): string {
  const slug = resolveText(content.header.name, locale)
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "") // fold diacritics: é -> e
    .replace(/[^A-Za-z0-9]+/g, "-") // non-alphanumeric runs -> single hyphen
    .replace(/^-+|-+$/g, "");
  return `${slug || "resume"}.pdf`;
}
