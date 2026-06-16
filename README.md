# thomasar-cv

A small, personal tool for maintaining a résumé as **structured data** rather than a hand-formatted document — producing a clean, single-page output that reads well to recruiters and parses correctly in applicant tracking systems (ATS).

It replaces a brittle word-processor workflow and keeps multiple tailored versions of one résumé under version control.

> Status: early planning. See **[idea-and-requirements.md](./idea-and-requirements.md)** for the full scope, guiding principles, and non-goals.

## Guiding principles

- **Content is separate from presentation** — what the résumé says is data; how it looks is an independent concern.
- **Structure is data, not a side-effect** — section and item order are explicit, manipulable properties.
- **One rendering definition, two outputs** — the on-screen preview and the exported PDF derive from the same rendering logic.
- **ATS-clean by construction** — exports have a real, parseable text layer in single-column reading order.
- **Minimalism is the feature** — deliberately omits the bloat common to résumé builders.

## Planned stack

Next.js 16 · tRPC v11 · Drizzle ORM on Supabase (Postgres) · BetterAuth · Tailwind · Vercel — in a pnpm + Turborepo monorepo, tested with Vitest + Playwright.

## Decisions so far

- **Auth:** email + password (via BetterAuth).
- **PDF generation:** to be decided during implementation — any approach satisfying "faithful to preview + real text layer" is acceptable.
- **Output target:** single-page A4 by default.
