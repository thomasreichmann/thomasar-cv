/**
 * The template-agnostic layer of the render definition. `flattenResume` turns a
 * `ResumeContent` document into an ordered, locale-resolved list of visual
 * blocks in single-column reading order; a template (see `templates/`) decides
 * only how those blocks look. Splitting it this way is what keeps "one rendering
 * definition" honest: reading order and visibility live here once, so every
 * template - and the PDF export that reuses this - shares the same order, and
 * adding a template can never reshuffle or resurrect content.
 *
 * Lifted from the #17 spike's `content.ts`, where it was proven to extract in
 * correct single-column order even with right-aligned dates (the layout that
 * usually scrambles an ATS text layer). See `docs/decisions/0002-pdf-engine.md`.
 */
import {
  resolveText,
  type DateRange,
  type LocalizedText,
  type ResumeContent,
  type YearMonth,
} from "@thomasar-cv/db/schema";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtYearMonth(ym: YearMonth): string {
  return ym.month ? `${MONTHS[ym.month - 1]} ${ym.year}` : `${ym.year}`;
}

/**
 * Date rendering rules from `resume-content.ts`:
 *   start + end   -> "start - end"
 *   start + null  -> "start - Present"   (ongoing)
 *   no start + end-> "end"               (single date, e.g. graduation year)
 *   no start + null-> (nothing)           (no date at all - not "Present")
 */
function fmtDateRange(d: DateRange | undefined): string | undefined {
  if (!d) return undefined;
  // A range with neither a start nor a real end carries no date - render nothing
  // rather than a bare "Present" (an import with no dates lands here).
  if (!d.start && d.end === null) return undefined;
  const end = d.end === null ? "Present" : fmtYearMonth(d.end);
  return d.start ? `${fmtYearMonth(d.start)} - ${end}` : end;
}

/**
 * A visual block in reading order. A `row` is a two-part header (heading on the
 * left, date right-aligned); everything else is a single run of text. The block
 * vocabulary is intentionally small and presentational-but-generic, so any
 * template can style it and the ATS text layer stays a flat, ordered sequence.
 */
export type Block =
  | { t: "name"; text: string }
  | { t: "contacts"; text: string }
  | { t: "availability"; text: string }
  | { t: "sectionTitle"; text: string }
  | { t: "row"; left: string; right?: string }
  | { t: "sub"; text: string }
  | { t: "bullet"; text: string }
  | { t: "text"; text: string };

const visible = <T extends { hidden: boolean }>(xs: readonly T[]): T[] =>
  xs.filter((x) => !x.hidden);

const join = (parts: (string | undefined)[], sep = " · "): string =>
  parts.filter(Boolean).join(sep);

/**
 * Flatten a résumé into ordered blocks for a locale. Section and item order come
 * from array position; hidden sections and items are dropped; every translatable
 * value is read through `resolveText`, so the i18n seam stays intact.
 */
export function flattenResume(
  content: ResumeContent,
  locale: string,
): Block[] {
  const t = (v: LocalizedText) => resolveText(v, locale);
  const out: Block[] = [];
  const { header, sections } = content;

  out.push({ t: "name", text: t(header.name) });
  if (header.contacts.length > 0) {
    out.push({
      t: "contacts",
      text: header.contacts.map((c) => c.value).join(" · "),
    });
  }
  if (header.availability) {
    out.push({ t: "availability", text: t(header.availability) });
  }

  for (const section of visible(sections)) {
    out.push({ t: "sectionTitle", text: t(section.title) });

    switch (section.type) {
      case "summary":
        // A summary is one logical block; its visibility is the section's own
        // `hidden`, already applied above. The editor exposes no per-item toggle
        // for it, so honoring a lone item's `hidden` here would only drop the
        // summary text with no way to bring it back - so it is left in.
        for (const it of section.items) {
          out.push({ t: "text", text: t(it.text) });
        }
        break;
      case "experience":
        for (const it of visible(section.items)) {
          out.push({
            t: "row",
            left: t(it.title),
            right: fmtDateRange(it.dateRange),
          });
          out.push({
            t: "sub",
            text: join([
              t(it.company),
              it.context && t(it.context),
              it.location && t(it.location),
            ]),
          });
          for (const b of it.bullets) out.push({ t: "bullet", text: t(b) });
        }
        break;
      case "education":
        for (const it of visible(section.items)) {
          out.push({
            t: "row",
            left: t(it.degree),
            right: fmtDateRange(it.dateRange),
          });
          out.push({
            t: "sub",
            text: join([t(it.institution), it.location && t(it.location)]),
          });
          for (const d of it.details) out.push({ t: "bullet", text: t(d) });
        }
        break;
      case "skills":
        for (const it of visible(section.items)) {
          const skills = it.skills.map(t).join(", ");
          out.push({
            t: "text",
            text: it.category ? `${t(it.category)}: ${skills}` : skills,
          });
        }
        break;
      case "projects":
        for (const it of visible(section.items)) {
          out.push({
            t: "row",
            left: t(it.name),
            right: fmtDateRange(it.dateRange),
          });
          if (it.url) out.push({ t: "sub", text: it.url });
          if (it.description) out.push({ t: "text", text: t(it.description) });
          for (const b of it.bullets) out.push({ t: "bullet", text: t(b) });
        }
        break;
      case "custom":
        for (const it of visible(section.items)) {
          if (it.heading) out.push({ t: "sub", text: t(it.heading) });
          if (it.body) out.push({ t: "text", text: t(it.body) });
          for (const b of it.bullets) out.push({ t: "bullet", text: t(b) });
        }
        break;
    }
  }

  return out;
}
