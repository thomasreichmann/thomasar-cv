# Reference CV

The author's real résumé, used as the grounding example while designing the
data model (issue #6) and later as a seed/fixture for development.

`thomas-reichmann-cv.pdf` is **git-ignored for now** (see `.gitignore`). The
plan is to make it public eventually; when that happens, drop the
`/reference/*.pdf` line from `.gitignore`.

## Seeding the dev account

`thomas-reichmann-cv.json` is the same CV as a `ResumeContent` document, used to
seed the dev-login account with a realistic résumé to exercise the editor and
live preview. It is **git-ignored too** (`/reference/*.json`) because it is the
same personal data; this directory's `.json` is author-only until the CV is made
public.

With that file present and `apps/web/.env.local` configured (DATABASE_URL +
DEV_LOGIN_EMAIL), and after signing in as dev once so the account exists:

```
pnpm --filter @thomasar-cv/db db:seed-dev
```

It validates the JSON through `resumeContent` and upserts a résumé named
"Thomas Reichmann (reference CV)" onto the dev account (idempotent - re-running
refreshes the content). See `packages/db/scripts/seed-dev-resume.ts`.

## What this CV currently uses

- Header: name + contact links (LinkedIn, GitHub, email)
- Summary
- Education
- Experience (company, title, date range incl. "Present", bullet items)

## Section types it does *not* use (but the model must still support)

- Skills
- Projects
- Custom / generic sections
- Languages, certifications, etc. (candidates for custom sections)
