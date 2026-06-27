/**
 * Map a JSON Resume document back into our content document (issue #55) - the
 * inverse of `toJsonResume`, reading the same field correspondence table so the
 * two halves of the interop can't drift. The input is already validated and
 * stripped by the shared `jsonResume` schema (unknown sections dropped, a
 * malformed shape rejected) before it reaches this mapper, exactly as export
 * validates its output against that schema; the import-side decisions encoded
 * here - JSON Resume's `studyType`+`area` rejoined into our single `degree`, an
 * unrecognized profile network kept as an `other` contact, dates we can't parse
 * dropped rather than failing the whole import - are recorded in the "Import"
 * section of `docs/decisions/0007-json-resume-export.md`.
 *
 * Import always builds a *new* document: every section and item is minted a
 * fresh id here (JSON Resume carries none), and there is no merge into an
 * existing résumé (out of scope). The result is run through `resumeContent`
 * before returning, so it is always a valid document - the same guarantee
 * `emptyResume` gives - and the node defaults (`hidden`, empty arrays) fill in.
 */
import { z } from "zod";

import {
  contact,
  educationItem,
  experienceItem,
  projectItem,
  resumeContent,
  section,
  skillsItem,
  summaryItem,
  type Contact,
  type ResumeContent,
  type YearMonth,
} from "../schema/resume-content";
import type {
  JsonResume,
  JsonResumeBasics,
  JsonResumeEducation,
  JsonResumeProject,
  JsonResumeSkill,
  JsonResumeWork,
} from "./schema";

/**
 * A node id only has to be unique within one document and stable for the life of
 * an edit; a fresh uuid satisfies both. Mirrors the editor's `newId` (the prefix
 * is purely to keep a stored document readable).
 */
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

/**
 * Read a JSON Resume partial-ISO date ("YYYY", "YYYY-MM", "YYYY-MM-DD") into our
 * `YearMonth`. We model no day, so a day component is dropped; an out-of-range
 * month (or a value we can't read at all) drops to year-only or to `undefined`
 * rather than failing the import - one off date is not worth rejecting a résumé.
 */
function fromIsoDate(value: string | undefined): YearMonth | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : undefined;
  if (month === undefined || month < 1 || month > 12) return { year };
  return { year, month };
}

/** Invert `toJsonResume`'s `PROFILE_NETWORK`: a known network label to our kind. */
const NETWORK_TO_KIND: Record<string, Contact["kind"]> = {
  linkedin: "linkedin",
  github: "github",
  twitter: "twitter",
  email: "email",
  phone: "phone",
  website: "website",
};

/**
 * Rebuild header contacts from `basics`. The singular `email` / `phone` / `url`
 * fields come back as their kinds, and each `profiles[]` entry maps by its
 * network - so a second email that export parked in `profiles` returns as a
 * second email contact. A network our model has no kind for lands as `other`
 * with the network name kept as the label, so nothing is silently lost.
 */
function toContacts(
  basics: JsonResumeBasics | undefined,
): z.input<typeof contact>[] {
  if (!basics) return [];
  const contacts: z.input<typeof contact>[] = [];
  if (basics.email) contacts.push({ kind: "email", value: basics.email });
  if (basics.phone) contacts.push({ kind: "phone", value: basics.phone });
  if (basics.url) contacts.push({ kind: "website", value: basics.url });

  for (const profile of basics.profiles ?? []) {
    // No handle, nothing to show - skip rather than invent an empty contact.
    if (!profile.username) continue;
    const kind = profile.network
      ? (NETWORK_TO_KIND[profile.network.trim().toLowerCase()] ?? "other")
      : "other";
    const entry: z.input<typeof contact> = { kind, value: profile.username };
    if (profile.url) entry.url = profile.url;
    if (kind === "other" && profile.network) entry.label = profile.network;
    contacts.push(entry);
  }
  return contacts;
}

function toExperience(work: JsonResumeWork): z.input<typeof experienceItem> {
  return {
    id: newId("exp"),
    company: work.name ?? "",
    title: work.position ?? "",
    // JSON Resume's `description` is the company descriptor - our `context`.
    ...(work.description ? { context: work.description } : {}),
    ...(work.location ? { location: work.location } : {}),
    dateRange: {
      start: fromIsoDate(work.startDate),
      // No `endDate` is "Present" (export omits it for an ongoing role) - null.
      end: fromIsoDate(work.endDate) ?? null,
    },
    bullets: work.highlights ?? [],
  };
}

function toEducation(edu: JsonResumeEducation): z.input<typeof educationItem> {
  // We model one `degree` string; JSON Resume splits it into studyType + area.
  // Export only ever filled studyType, but a foreign document may carry both, so
  // rejoin them ("BSc" + "Computer Science"). Education has no location field in
  // the standard, so none is restored.
  const degree = [edu.studyType, edu.area].filter(Boolean).join(" ");
  return {
    id: newId("edu"),
    institution: edu.institution ?? "",
    degree,
    dateRange: {
      start: fromIsoDate(edu.startDate),
      end: fromIsoDate(edu.endDate) ?? null,
    },
    details: edu.courses ?? [],
  };
}

function toSkill(skill: JsonResumeSkill): z.input<typeof skillsItem> {
  return {
    id: newId("skill"),
    ...(skill.name ? { category: skill.name } : {}),
    skills: skill.keywords ?? [],
  };
}

function toProject(project: JsonResumeProject): z.input<typeof projectItem> {
  const start = fromIsoDate(project.startDate);
  // Our project dates are optional as a whole; only attach a range when the
  // document actually carries one (export emits dates only when present).
  const dateRange =
    start || project.endDate !== undefined
      ? { start, end: fromIsoDate(project.endDate) ?? null }
      : undefined;
  return {
    id: newId("proj"),
    name: project.name ?? "",
    ...(project.url ? { url: project.url } : {}),
    ...(project.description ? { description: project.description } : {}),
    bullets: project.highlights ?? [],
    ...(dateRange ? { dateRange } : {}),
  };
}

/** A single summary section holding `basics.summary` as one item, if present. */
function toSummarySection(
  summary: string | undefined,
): z.input<typeof section> | undefined {
  if (!summary) return undefined;
  const item: z.input<typeof summaryItem> = { id: newId("sum"), text: summary };
  return { id: newId("sec"), type: "summary", title: "Summary", items: [item] };
}

export function fromJsonResume(doc: JsonResume): ResumeContent {
  const sections: z.input<typeof section>[] = [];

  const summary = toSummarySection(doc.basics?.summary);
  if (summary) sections.push(summary);
  if (doc.work?.length)
    sections.push({
      id: newId("sec"),
      type: "experience",
      title: "Experience",
      items: doc.work.map(toExperience),
    });
  if (doc.education?.length)
    sections.push({
      id: newId("sec"),
      type: "education",
      title: "Education",
      items: doc.education.map(toEducation),
    });
  if (doc.skills?.length)
    sections.push({
      id: newId("sec"),
      type: "skills",
      title: "Skills",
      items: doc.skills.map(toSkill),
    });
  if (doc.projects?.length)
    sections.push({
      id: newId("sec"),
      type: "projects",
      title: "Projects",
      items: doc.projects.map(toProject),
    });

  const header: z.input<typeof resumeContent>["header"] = {
    name: doc.basics?.name ?? "",
    contacts: toContacts(doc.basics),
  };
  // Export folds availability into `basics.label` (the standard has no
  // availability field), so the inverse reads it back out.
  if (doc.basics?.label) header.availability = doc.basics.label;

  return resumeContent.parse({ schemaVersion: 1, header, sections });
}
