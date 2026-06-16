import { z } from "zod";

import { type ResumeContent, resumeContent } from "../schema/resume-content";

/**
 * A synthetic, fully-populated résumé used as a starter template and as the
 * fixture that proves the content schema covers every section type - including
 * the ones the author's real reference CV does not use (skills, projects,
 * custom). The real CV stays a private reference (`reference/`, git-ignored);
 * this stand-in carries no personal data so it is safe to commit.
 *
 * Authored against `z.input` (defaults like `hidden`/`bullets` may be omitted)
 * and parsed at load, so the export is always a valid `ResumeContent`.
 */
const raw = {
  schemaVersion: 1,
  header: {
    name: "Jane Doe",
    contacts: [
      { kind: "email", value: "jane@example.dev" },
      { kind: "linkedin", value: "linkedin.com/in/janedoe" },
      { kind: "github", value: "github.com/janedoe" },
    ],
    availability: "Open to remote (US / EU)",
  },
  sections: [
    {
      id: "sec-summary",
      type: "summary",
      title: "Summary",
      items: [
        {
          id: "sum-1",
          text: "Full-stack engineer focused on building reliable, ATS-clean tools with a small, sharp feature set.",
        },
      ],
    },
    {
      id: "sec-experience",
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "exp-acme",
          company: "Acme Corp",
          context: "Series B logistics platform",
          title: "Senior Engineer",
          location: "Remote",
          // Ongoing role -> renders "... - Present".
          dateRange: { start: { year: 2024, month: 2 }, end: null },
          bullets: [
            "Led the rewrite of the routing service, cutting p95 latency by 40%.",
            "Owned the migration to typed end-to-end APIs.",
          ],
        },
        {
          id: "exp-globex",
          company: "Globex",
          title: "Engineer",
          location: "Berlin, DE",
          dateRange: {
            start: { year: 2021, month: 6 },
            end: { year: 2024, month: 1 },
          },
          bullets: ["Built the internal data pipeline serving 12 teams."],
        },
        {
          // Demonstrates tailoring: hidden without being deleted.
          id: "exp-intern",
          hidden: true,
          company: "Initech",
          title: "Engineering Intern",
          dateRange: {
            start: { year: 2020, month: 6 },
            end: { year: 2020, month: 12 },
          },
          bullets: ["Wrote the first batch of integration tests."],
        },
      ],
    },
    {
      id: "sec-education",
      type: "education",
      title: "Education",
      items: [
        {
          id: "edu-1",
          institution: "State University",
          degree: "BSc Computer Science",
          location: "Remote",
          // Single graduation year -> start omitted, end set.
          dateRange: { end: { year: 2021 } },
        },
      ],
    },
    {
      id: "sec-skills",
      type: "skills",
      title: "Skills",
      items: [
        {
          id: "skill-lang",
          category: "Languages",
          skills: ["TypeScript", "Go", "SQL"],
        },
        {
          id: "skill-infra",
          category: "Infrastructure",
          skills: ["Postgres", "Docker", "AWS"],
        },
      ],
    },
    {
      id: "sec-projects",
      type: "projects",
      title: "Projects",
      items: [
        {
          id: "proj-1",
          name: "résumé-as-data",
          url: "https://github.com/janedoe/resume-as-data",
          description:
            "A structured-data résumé builder with faithful PDF export.",
          bullets: [
            "Single-page A4, real text layer, ATS-clean by construction.",
          ],
        },
      ],
    },
    {
      id: "sec-languages",
      type: "custom",
      title: "Languages",
      items: [
        {
          id: "lang-1",
          body: "English (native), German (fluent), Portuguese (conversational).",
        },
      ],
    },
  ],
} satisfies z.input<typeof resumeContent>;

export const exampleResume: ResumeContent = resumeContent.parse(raw);
