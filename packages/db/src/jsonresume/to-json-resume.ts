/**
 * Map our content document to a JSON Resume document (issue #54). This is the one
 * place the field correspondence lives, so export and the later import (#55) read
 * the same table rather than two drifting copies; the decisions it encodes -
 * where JSON Resume lacks a field of ours, and where it has one ours folds into -
 * are recorded in `docs/decisions/0007-json-resume-export.md`.
 *
 * It exports the *visible* résumé: hidden sections and items are dropped, exactly
 * as the rendered PDF drops them (see `@thomasar-cv/render`'s `flattenResume`), so
 * a tailored-out role never leaks into the exported file. Localized values are
 * resolved for `locale` (v1 is single-language, so "en" is the only caller).
 */
import {
  resolveText,
  type Contact,
  type EducationItem,
  type ExperienceItem,
  type LocalizedText,
  type ProjectItem,
  type ResumeContent,
  type Section,
  type SkillsItem,
  type YearMonth,
} from "../schema/resume-content";
import type {
  JsonResume,
  JsonResumeBasics,
  JsonResumeEducation,
  JsonResumeProfile,
  JsonResumeProject,
  JsonResumeSkill,
  JsonResumeWork,
} from "./schema";

type Resolve = (value: LocalizedText) => string;

/** JSON Resume dates are partial ISO; we only ever emit "YYYY" or "YYYY-MM". */
function toIsoDate(ym: YearMonth | undefined): string | undefined {
  if (!ym) return undefined;
  return ym.month
    ? `${ym.year}-${String(ym.month).padStart(2, "0")}`
    : `${ym.year}`;
}

const visible = <T extends { hidden: boolean }>(xs: readonly T[]): T[] =>
  xs.filter((x) => !x.hidden);

/**
 * The default `profiles[].network` for a contact kind. The singular kinds (email
 * / phone / website) only land in `profiles` when they are *extras* beyond the
 * one that fills its dedicated basics field, so they need a label too; `other`
 * has no default and relies on the contact's own `label`.
 */
const PROFILE_NETWORK: Record<Contact["kind"], string | undefined> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter",
  email: "Email",
  phone: "Phone",
  website: "Website",
  other: undefined,
};

/**
 * Split header contacts into JSON Resume's `basics`. The first email / phone /
 * website fills its dedicated singular field; every other contact - profile
 * networks and any *extra* email/phone/website - becomes a `profiles[]` entry, so
 * a second email or a portfolio link is preserved rather than silently dropped.
 */
function mapContacts(
  contacts: readonly Contact[],
  t: Resolve,
): Pick<JsonResumeBasics, "email" | "phone" | "url" | "profiles"> {
  let email: string | undefined;
  let phone: string | undefined;
  let url: string | undefined;
  const profiles: JsonResumeProfile[] = [];

  for (const c of contacts) {
    if (c.kind === "email" && email === undefined) {
      email = c.value;
      continue;
    }
    if (c.kind === "phone" && phone === undefined) {
      phone = c.value;
      continue;
    }
    if (c.kind === "website" && url === undefined) {
      url = c.value;
      continue;
    }
    const network = c.label ? t(c.label) : PROFILE_NETWORK[c.kind];
    const profile: JsonResumeProfile = { username: c.value };
    if (network) profile.network = network;
    // An extra email/phone (the first of each already filled its basics field)
    // lands here; give it a usable href - mailto:/tel: - so a consumer renders a
    // working link, not a bare handle. tel: URIs carry no spaces. Explicit wins.
    const href =
      c.url ??
      (c.kind === "email"
        ? `mailto:${c.value}`
        : c.kind === "phone"
          ? `tel:${c.value.replace(/\s+/g, "")}`
          : undefined);
    if (href) profile.url = href;
    profiles.push(profile);
  }

  const out: Pick<JsonResumeBasics, "email" | "phone" | "url" | "profiles"> = {};
  if (email) out.email = email;
  if (phone) out.phone = phone;
  if (url) out.url = url;
  if (profiles.length) out.profiles = profiles;
  return out;
}

/**
 * JSON Resume's single `basics.summary` string. Our model can carry more than one
 * summary item (and, in principle, more than one summary section), so every
 * visible summary item is concatenated, blank-line separated.
 */
function collectSummary(sections: readonly Section[], t: Resolve): string | undefined {
  const parts: string[] = [];
  for (const section of visible(sections)) {
    if (section.type !== "summary") continue;
    for (const item of section.items) {
      const text = t(item.text);
      if (text) parts.push(text);
    }
  }
  return parts.length ? parts.join("\n\n") : undefined;
}

function mapWork(it: ExperienceItem, t: Resolve): JsonResumeWork {
  const work: JsonResumeWork = { name: t(it.company), position: t(it.title) };
  if (it.context) work.description = t(it.context);
  if (it.location) work.location = t(it.location);
  const start = toIsoDate(it.dateRange.start);
  if (start) work.startDate = start;
  // An ongoing role (`end: null`) is "Present" in JSON Resume by *omitting*
  // endDate, not by a sentinel value - so a null end leaves endDate unset.
  if (it.dateRange.end !== null) {
    const end = toIsoDate(it.dateRange.end);
    if (end) work.endDate = end;
  }
  if (it.bullets.length) work.highlights = it.bullets.map(t);
  return work;
}

function mapEducation(it: EducationItem, t: Resolve): JsonResumeEducation {
  // Our single `degree` string ("BSc Computer Science") goes whole into
  // `studyType`; JSON Resume splits degree into studyType + area, but we don't
  // model that split, and `area` alone would read as a fragment. `location` has
  // no home - JSON Resume education has no location field - so it is dropped.
  const edu: JsonResumeEducation = {
    institution: t(it.institution),
    studyType: t(it.degree),
  };
  const start = toIsoDate(it.dateRange.start);
  if (start) edu.startDate = start;
  if (it.dateRange.end !== null) {
    const end = toIsoDate(it.dateRange.end);
    if (end) edu.endDate = end;
  }
  if (it.details.length) edu.courses = it.details.map(t);
  return edu;
}

function mapSkill(it: SkillsItem, t: Resolve): JsonResumeSkill {
  const skill: JsonResumeSkill = {};
  if (it.category) skill.name = t(it.category);
  if (it.skills.length) skill.keywords = it.skills.map(t);
  return skill;
}

function mapProject(it: ProjectItem, t: Resolve): JsonResumeProject {
  const project: JsonResumeProject = { name: t(it.name) };
  if (it.url) project.url = it.url;
  if (it.description) project.description = t(it.description);
  if (it.bullets.length) project.highlights = it.bullets.map(t);
  const start = toIsoDate(it.dateRange?.start);
  if (start) project.startDate = start;
  if (it.dateRange && it.dateRange.end !== null) {
    const end = toIsoDate(it.dateRange.end);
    if (end) project.endDate = end;
  }
  return project;
}

export function toJsonResume(content: ResumeContent, locale = "en"): JsonResume {
  const t: Resolve = (value) => resolveText(value, locale);
  const { header, sections } = content;

  const work: JsonResumeWork[] = [];
  const education: JsonResumeEducation[] = [];
  const skills: JsonResumeSkill[] = [];
  const projects: JsonResumeProject[] = [];

  for (const section of visible(sections)) {
    switch (section.type) {
      case "summary":
        // Folded into basics.summary below, not its own section.
        break;
      case "experience":
        for (const it of visible(section.items)) work.push(mapWork(it, t));
        break;
      case "education":
        for (const it of visible(section.items)) education.push(mapEducation(it, t));
        break;
      case "skills":
        for (const it of visible(section.items)) skills.push(mapSkill(it, t));
        break;
      case "projects":
        for (const it of visible(section.items)) projects.push(mapProject(it, t));
        break;
      case "custom":
        // JSON Resume has no freeform/custom section, and the section title is
        // localized free text - so routing a custom section to a standard one
        // (e.g. a "Languages" section to `languages`) would mean guessing intent
        // from a string. Omitted deliberately rather than guessed; this is the
        // one section type our model has that the standard cannot hold.
        break;
    }
  }

  const basics: JsonResumeBasics = {};
  const name = t(header.name);
  if (name) basics.name = name;
  // Availability ("Open to remote") has no JSON Resume field; `label` is the
  // free-text tagline under the name and is otherwise unused (we model no title),
  // so it is the nearest home.
  if (header.availability) basics.label = t(header.availability);
  Object.assign(basics, mapContacts(header.contacts, t));
  const summary = collectSummary(sections, t);
  if (summary) basics.summary = summary;

  const doc: JsonResume = {};
  if (Object.keys(basics).length) doc.basics = basics;
  if (work.length) doc.work = work;
  if (education.length) doc.education = education;
  if (skills.length) doc.skills = skills;
  if (projects.length) doc.projects = projects;
  return doc;
}
