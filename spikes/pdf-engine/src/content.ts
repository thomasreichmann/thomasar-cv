/**
 * Shared render model for the spike. Flattens the real `exampleResume` fixture
 * into an ordered list of blocks that BOTH engines render identically, and that
 * also serves as the oracle for the expected single-column reading order.
 *
 * The point of the proof is reading order under a realistic layout, so the item
 * header is a two-element row: heading on the left, date right-aligned. That
 * right-aligned date is the classic cause of a scrambled ATS text layer, so a
 * passing extraction here actually means something.
 */
import {
  exampleResume,
  resolveText,
  type DateRange,
  type LocalizedText,
  type YearMonth,
} from "@thomasar-cv/db/schema";

const LOCALE = "en";
const t = (v: LocalizedText) => resolveText(v, LOCALE);

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

function fmtYM(ym: YearMonth): string {
  return ym.month ? `${MONTHS[ym.month - 1]} ${ym.year}` : `${ym.year}`;
}

/** Render rules from resume-content.ts: start+end, start+Present, or end-only. */
function fmtDate(d: DateRange | undefined): string | undefined {
  if (!d) return undefined;
  const end = d.end === null ? "Present" : fmtYM(d.end);
  if (d.start) return `${fmtYM(d.start)} - ${end}`;
  return end; // end-only (e.g. graduation year)
}

/** A visual block in reading order. A `row` is heading-left, date-right. */
export type Block =
  | { t: "name"; text: string }
  | { t: "contacts"; text: string }
  | { t: "availability"; text: string }
  | { t: "sectionTitle"; text: string }
  | { t: "row"; left: string; right?: string }
  | { t: "sub"; text: string }
  | { t: "bullet"; text: string }
  | { t: "text"; text: string };

const visible = <T extends { hidden: boolean }>(xs: T[]) =>
  xs.filter((x) => !x.hidden);

const join = (parts: (string | undefined)[], sep = " · ") =>
  parts.filter(Boolean).join(sep);

export function buildBlocks(): Block[] {
  const out: Block[] = [];
  const { header, sections } = exampleResume;

  out.push({ t: "name", text: t(header.name) });
  out.push({
    t: "contacts",
    text: header.contacts.map((c) => c.value).join(" · "),
  });
  if (header.availability)
    out.push({ t: "availability", text: t(header.availability) });

  for (const section of visible(sections)) {
    out.push({ t: "sectionTitle", text: t(section.title) });

    if (section.type === "summary") {
      for (const it of visible(section.items))
        out.push({ t: "text", text: t(it.text) });
    } else if (section.type === "experience") {
      for (const it of visible(section.items)) {
        out.push({ t: "row", left: t(it.title), right: fmtDate(it.dateRange) });
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
    } else if (section.type === "education") {
      for (const it of visible(section.items)) {
        out.push({
          t: "row",
          left: t(it.degree),
          right: fmtDate(it.dateRange),
        });
        out.push({
          t: "sub",
          text: join([t(it.institution), it.location && t(it.location)]),
        });
        for (const d of it.details) out.push({ t: "bullet", text: t(d) });
      }
    } else if (section.type === "skills") {
      for (const it of visible(section.items)) {
        const skills = it.skills.map(t).join(", ");
        out.push({
          t: "text",
          text: it.category ? `${t(it.category)}: ${skills}` : skills,
        });
      }
    } else if (section.type === "projects") {
      for (const it of visible(section.items)) {
        out.push({ t: "row", left: t(it.name), right: fmtDate(it.dateRange) });
        if (it.url) out.push({ t: "sub", text: it.url });
        if (it.description) out.push({ t: "text", text: t(it.description) });
        for (const b of it.bullets) out.push({ t: "bullet", text: t(b) });
      }
    } else if (section.type === "custom") {
      for (const it of visible(section.items)) {
        if (it.heading) out.push({ t: "sub", text: t(it.heading) });
        if (it.body) out.push({ t: "text", text: t(it.body) });
        for (const b of it.bullets) out.push({ t: "bullet", text: t(b) });
      }
    }
  }

  return out;
}

/**
 * The expected reading order: every block's text, flattened (a row contributes
 * left then right). The extracted PDF text must contain these tokens in this
 * order for the layer to be ATS-clean.
 */
export function expectedOrder(blocks: Block[]): string[] {
  const tokens: string[] = [];
  for (const b of blocks) {
    if (b.t === "row") {
      tokens.push(b.left);
      if (b.right) tokens.push(b.right);
    } else {
      tokens.push(b.text);
    }
  }
  return tokens;
}

/** Content that must NOT appear: the hidden Initech internship. */
export const EXPECTED_ABSENT = ["Initech", "Engineering Intern"];
