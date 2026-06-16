# CLAUDE.md

## Project Overview

thomasar-cv is a personal tool for maintaining a résumé as **structured data** (not a hand-formatted document), producing a clean single-page A4 output that reads well to recruiters and parses correctly in ATS. Multiple tailored variants are kept under version control. See `idea-and-requirements.md` for the full scope, guiding principles, and non-goals.

**Stack:** Next.js 16 / Supabase (Postgres) / Vercel
**Auth:** BetterAuth (email + password) | **ORM:** Drizzle | **API:** tRPC v11
**Monorepo:** pnpm workspaces + Turborepo
**Styling:** Tailwind | **Testing:** Vitest + Playwright

## Decisions

- **Auth:** email + password only (no OAuth / magic-link in v1).
- **PDF generation:** to be decided during implementation — constraint: faithful to preview + real text layer.
- **Output target:** single-page A4 by default.

## Required Reading

- **Before creating GitHub issues:** `docs/ai/github-workflow.md` — issue format, labels, and relationships (sub-issues / blocking) via the `gh` CLI.

## Git & Workflow

- Conventional commit messages: `feat: add login form (#42)`.
- All non-trivial work should have a GitHub Issue before starting.
- PRs reference issues: `Closes #42`, or `No-Issue: <reason>` for trivial changes.
- Every issue carries exactly one status label (`needs-details` / `ready`) and a `priority:` label.
