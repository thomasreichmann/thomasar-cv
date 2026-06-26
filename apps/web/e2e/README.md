# e2e tests

Playwright tests that drive the real app against a real database. Unit and
integration tests (Vitest) cover logic and SQL; these cover the things only a
browser against a running server can: auth, navigation, and the editor save loop.

## Running

Run from the repo root. Everything after `pnpm test:e2e` is forwarded verbatim to
Playwright, so its native selection is the whole interface - nothing to learn
twice. (From inside `apps/web`, use `pnpm -w test:e2e`: a bare `pnpm test:e2e`
there resolves to this package's raw `playwright test`, which skips the managed
database.)

```sh
pnpm test:e2e                                 # whole suite
pnpm test:e2e editor-save                      # one spec   (path substring)
pnpm test:e2e e2e/flows/editor-save.spec.ts    # one spec   (exact file, optional :line)
pnpm test:e2e --project=flows                  # one group  (flows | smoke)
pnpm test:e2e -g "persists the change"         # one test   (by title)
pnpm test:e2e --list                           # list matching tests (no Docker, instant)
pnpm test:e2e --ui                             # Playwright's interactive runner
```

Any other Playwright flag works through the same passthrough - `--headed`,
`--debug`, `--last-failed` (re-run only the previous failures), `--repeat-each=N`.

Two flags are handled by the wrapper instead of Playwright:

- `--keep` leaves the throwaway database up after the run (also `E2E_KEEP_DB=1`).
  The next run reuses it and skips the cold container start - the fast path when
  iterating on one spec. `docker compose -f docker-compose.e2e.yml down` stops it.
- `--list` skips the database and server entirely, so test discovery is instant.

`pnpm test:e2e` (scripts/e2e.mjs) brings up a throwaway Postgres
(docker-compose.e2e.yml), migrates it, runs Playwright, and tears it down, so the
run is self-contained and never touches the shared Supabase project. Docker has
to be running (the script says so plainly if it isn't). CI does the same steps
against a service container.

## The one rule

Only the behavior under test goes through the UI. Every precondition is
established the fastest correct way - through the database or an API - never by
clicking through earlier screens to arrive at the state you want. This is
back-door setup (Cypress calls it App Actions); it keeps the suite fast and stops
an unrelated UI change from breaking tests that only needed the state, not the
clicks.

## Console errors fail tests

Every spec built on these fixtures inherits a guard (`fixtures/console.ts`) that
fails the test if the page logged a console error or threw an uncaught one. It
catches the regressions that don't break an assertion but still mean something is
wrong - React / Base UI dev-time errors, hydration mismatches, a failed request
surfaced to the console. If a test legitimately provokes one - asserting a 404,
which the browser logs as a failed resource load - declare it with
`test.use({ expectedConsoleErrors: [/.../] })`; the guard drops the matches and
still fails on anything else. `resume-authz.spec.ts` is the example. Reach for it
only for an error intrinsic to the behavior under test, not to silence a real one.

## The three layers

Setup is built in three layers, each one allowed to lean on the one below.

1. Factories (`@thomasar-cv/db/testing/factories`) build valid domain objects
   from overrides, so a test asks for "a résumé named X" instead of authoring the
   whole document. Shared with the unit tests rather than kept as a second set.
2. Fixtures (`fixtures/`) provision a precondition through the back door and yield
   it to the test, with teardown. `seededResume` is the example: it seeds a résumé
   owned by the signed-in worker user and hands back its id.
3. Scenario helpers (`scenarios/`) reach states a single seed can't express,
   because they need more than one step or have to drive the UI. `makeEditorDirty`
   opens a résumé and edits it without saving.

Add a scenario helper only when a precondition needs more than one step or UI
driving AND it is shared by at least two tests. A single-step precondition is a
fixture; a one-off lives inline. This keeps layer 3 pulled by real demand instead
of filled with helpers nobody reuses. The next likely home for it is résumé
variants and versioning, where "a résumé with N versions" becomes a genuine
multi-step precondition.

## Layout

```
e2e/
  global.setup.ts      reset the db to a clean slate before the suites run
  helpers/             db (back-door connection + seeding), trpc, auth
  fixtures/            console (fail on console errors), authenticated (per-worker user), resume (seededResume)
  scenarios/           multi-step / UI-driven preconditions
  smoke/               pages render and the auth gate holds
  flows/               interactive flows (editor save, nav guard, cross-tenant authz)
```

Auth: one user per parallel worker. The `workerAccount` fixture (worker-scoped)
provisions its user once through BetterAuth's sign-up endpoint and saves the
session cookie under `.auth/`, which `storageState` then loads, so authenticated
specs start signed in without driving the form. Per-worker ownership is what keeps
parallel specs isolated: a résumé seeded on one worker belongs to a user no other
worker shares, so two tests can't see each other's rows even when both run flat
out. CI runs parallel too (not `workers: 1`), so it exercises this same path.
