# CLAUDE.md

## Project Overview

thomasar-cv is a personal tool for maintaining a résumé as **structured data** (not a hand-formatted document), producing a clean single-page A4 output that reads well to recruiters and parses correctly in ATS. Multiple tailored variants are kept under version control. See `idea-and-requirements.md` for the full scope, guiding principles, and non-goals.

**Stack:** Next.js 16 / Supabase (Postgres) / Vercel
**Auth:** BetterAuth (email + password) | **ORM:** Drizzle | **API:** tRPC v11
**Monorepo:** pnpm workspaces + Turborepo
**Styling:** Tailwind | **Testing:** Vitest + Playwright

## Decisions

- **Auth:** email + password only (no OAuth / magic-link in v1).
- **PDF generation:** to be decided during implementation - constraint: faithful to preview + real text layer.
- **Output target:** single-page A4 by default.
- **Persistence:** résumé content is one validated JSONB document on a thin `resume` table (keeps git-like versioning cheap). See `docs/decisions/0001-resume-persistence.md`.

## Commands

**REQUIRED before committing:** `pnpm check` (runs typecheck + lint + test via Turborepo, condensed to a scannable summary; `pnpm check:verbose` for full output). It mirrors CI, so a green check means a green PR.

## Required Reading

- **Before creating GitHub issues:** `docs/ai/github-workflow.md` - issue format, labels, and relationships (sub-issues / blocking) via the `gh` CLI.
- **Before adding or restyling UI components:** `docs/ai/ui-components.md` - the shadcn-on-Base-UI workflow, the `base-vega` style, and the dark-only rules.
- **Before writing or editing code:** `docs/ai/conventions.md` - code conventions (comments explain WHY, not WHAT).

## Git & Workflow

- Conventional commit messages: `feat: add login form (#42)`.
- Commits are authored by the repo owner only: do **not** add `Co-Authored-By` or `Claude-Session` trailers to commit messages or PR bodies.
- All non-trivial work should have a GitHub Issue before starting.
- PRs reference issues: `Closes #42`, or `No-Issue: <reason>` for trivial changes.
- Every issue carries exactly one status label (`needs-details` / `ready`) and a `priority:` label.
- Create / edit issues via `scripts/gh-issue.sh` (wrapper over `gh issue` that strips em dashes), not raw `gh issue`.

## Database migrations

The shared Supabase DB is **not** migrated by CI or by Vercel deploys - CI only ever migrates a throwaway container, so a green PR proves nothing about the live schema. The preview and prod environments point at that same shared DB, so deploying schema-dependent code without applying its migration ships a broken feature (e.g. #67's `is_anonymous` insert failing on a column that was never added).

- A PR that adds a migration must have that migration **applied to the shared DB before the PR is opened** - run `pnpm --filter @thomasar-cv/db db:migrate` (loads the real `DATABASE_URL` from `packages/db/.env`) and confirm the deployed feature works against it.
- This applies only to **non-destructive, backward-compatible** migrations (additive columns/tables with safe defaults) - ones that can't break the currently-deployed code while the new code rolls out. A migration that drops/renames/retypes a column or otherwise breaks an existing code path is **not** safe to apply ahead of its deploy; flag it and coordinate the rollout instead of running it early.
