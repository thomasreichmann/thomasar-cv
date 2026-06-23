# thomasar-cv

A small, personal tool for maintaining a résumé as structured data instead of a hand-formatted document, and rendering it to a single-page A4 that parses correctly in applicant tracking systems (ATS). It keeps multiple tailored variants of one résumé under version control.

The problem is deliberately small; the point is to build it the way something that has to last gets built - risk-first sequencing, decisions recorded as [ADRs](./docs/decisions/), ownership enforced structurally, real tests against a real database.

**Live at [cv.thomasar.dev](https://cv.thomasar.dev).**

> Status: v0.3 in progress - a deployed app with email + password auth, per-user résumé storage, a structured editor with live preview, and PDF export carrying a real, ATS-parseable text layer. Version history and tailored variants are next. See the [roadmap](./docs/planning/roadmap.md) for direction and [idea-and-requirements.md](./idea-and-requirements.md) for scope and non-goals.

## Stack (as built)

- Next.js 16 (App Router, React 19) on Vercel
- tRPC v11 for the API (server + client, superjson transformer)
- Drizzle ORM on Supabase Postgres, over the postgres-js driver
- BetterAuth for email + password auth, via its Drizzle adapter
- Zod for validation (the résumé content document and server env)
- Tailwind v4 for styling
- pnpm workspaces + Turborepo, TypeScript throughout
- Vitest for unit tests (real in-process Postgres via pglite) and Playwright for e2e

## Project layout

```
apps/
  web/                 Next.js app: tRPC server + client, BetterAuth, auth pages, dashboard, e2e
packages/
  db/                  Drizzle schema (auth + resume), the résumé content Zod schema,
                       connection factory, migrations, seed fixture, pglite test harness
  eslint-config/       shared ESLint config
  tsconfig/            shared TypeScript config
docs/
  planning/roadmap.md  milestone arc
  decisions/           architecture decision records (ADRs)
  ai/                  conventions for AI agents (e.g. the GitHub issue workflow)
```

The résumé is one validated JSONB document on a thin `resume` table, not a tree of normalized rows, so a history snapshot or tailored variant is just a copy of one document. See [docs/decisions/0001-resume-persistence.md](./docs/decisions/0001-resume-persistence.md). The content shape lives in `packages/db/src/schema/resume-content.ts` (Zod); every write goes through it since Postgres treats the column as opaque.

Ownership is enforced in app code: a single `ownedResumes` boundary scopes every read and write by `user_id`, so no caller can reach another user's data. We connect through the Supabase pooler as a service role (no Postgres RLS yet; deferred to v1.0), which is why that helper is the only access path routers may use.

## Design principles

Treating a résumé as data, not layout, drives the design:

- Content is separate from presentation: what it says is data, how it looks is rendering config.
- Structure is data: section and item order are explicit array positions, so reordering is reversible.
- One rendering definition, two outputs: the preview and the exported PDF derive from the same logic.
- ATS-safe by construction: exports carry a real, parseable text layer in single-column reading order.
- Deliberately small: it leaves out the feature pile-up common to résumé builders.

## Running locally

Prerequisites: Node 24 (see `.nvmrc`) and pnpm 10 (`corepack enable` sets it up).

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Set up env vars (a Supabase Postgres connection and an auth secret).

   The web app's server env already lives on Vercel, so fetch it instead of writing it by hand. The db singleton reads `DATABASE_URL` at import and `next build` evaluates the app graph, so both dev and build need `apps/web/.env.local` present:

   ```bash
   vercel login        # once
   vercel link         # once, link this checkout to the Vercel project
   pnpm env:pull       # writes apps/web/.env.local (Next auto-loads it)
   ```

   Without Vercel access, copy the example and fill it in by hand instead; `apps/web/.env.example` documents each value:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   The db package reads its own env for migrations (Next only loads env from the app dir), so copy that one regardless:

   ```bash
   cp packages/db/.env.example packages/db/.env
   ```

   Both files need the same `DATABASE_URL` (the Supabase transaction pooler URL, port 6543). `apps/web/.env.local` also needs `BETTER_AUTH_SECRET` (any 32+ char random string, e.g. `openssl rand -base64 32`).

3. Apply migrations:
   ```bash
   pnpm --filter @thomasar-cv/db db:migrate
   ```
4. Start the dev server (Next.js on http://localhost:3000):
   ```bash
   pnpm dev
   ```

## Testing

- Unit: `pnpm test`. The DB package runs SQL-correctness and ownership tests against real in-process Postgres (pglite) via `@thomasar-cv/db/testing`, so queries are exercised for real, not mocked.
- E2e: `pnpm --filter web test:e2e` (Playwright: editor flows, cross-tenant authorization, and auth/dashboard smoke).
- CI runs typecheck, lint, and unit tests on every PR, plus a Playwright job against a throwaway Postgres container.

## Scripts

Run from the repo root; Turborepo fans them out across the workspaces.

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `pnpm check`     | typecheck + lint + test, condensed to a summary line |
| `pnpm dev`       | start all dev servers                                |
| `pnpm build`     | build every package                                  |
| `pnpm lint`      | run ESLint                                           |
| `pnpm typecheck` | run `tsc --noEmit`                                   |
| `pnpm test`      | run unit tests                                       |
| `pnpm format`    | format with Prettier                                 |
| `pnpm env:pull`  | pull `apps/web/.env.local` from Vercel               |

`pnpm check` is the pre-commit gate. It runs the same `typecheck lint test` that CI runs, but collapses a passing run to one summary line and, on failure, strips turbo and runner noise down to the actionable errors, so a green check means a green PR and the output stays short enough to scan in a terminal or an LLM context window. Pass `--verbose` (or run `pnpm check:verbose`) for the raw turbo output.

## Conventions

Commits follow Conventional Commits (`feat: add login form (#42)`). Non-trivial work gets a GitHub issue first; issues and milestones follow [docs/ai/github-workflow.md](./docs/ai/github-workflow.md), and project decisions are recorded as ADRs under `docs/decisions/`.
