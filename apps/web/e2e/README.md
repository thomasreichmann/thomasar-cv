# e2e tests

Playwright tests that drive the real app against a real database. Unit and
integration tests (Vitest) cover logic and SQL; these cover the things only a
browser against a running server can: auth, navigation, and the editor save loop.

## Running

```sh
pnpm test:e2e                      # full suite
pnpm test:e2e --project=flows      # one project
pnpm test:e2e -g "save"            # one test by name
```

`pnpm test:e2e` (scripts/e2e.mjs) brings up a throwaway Postgres
(docker-compose.e2e.yml), migrates it, runs Playwright, and tears it down, so the
run is self-contained and never touches the shared Supabase project. Docker has
to be running. CI does the same steps against a service container.

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
surfaced to the console. If a test legitimately expects an error, narrow the page
interaction rather than loosening the guard.

## The three layers

Setup is built in three layers, each one allowed to lean on the one below.

1. Factories (`@thomasar-cv/db/testing/factories`) build valid domain objects
   from overrides, so a test asks for "a résumé named X" instead of authoring the
   whole document. Shared with the unit tests rather than kept as a second set.
2. Fixtures (`fixtures/`) provision a precondition through the back door and yield
   it to the test, with teardown. `seededResume` is the example: it seeds a résumé
   owned by the signed-in user and hands back its id.
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
  global.setup.ts      reset the db + create and sign in the shared user
  helpers/             db (back-door connection + seeding), trpc, auth
  fixtures/            console (fail on console errors), authenticated (storageState), resume (seededResume)
  scenarios/           multi-step / UI-driven preconditions
  smoke/               pages render and the auth gate holds
  flows/               interactive flows (the editor save loop, nav guard)
```

Auth: the setup project creates the user through BetterAuth's sign-up endpoint
and saves its session cookie to `.auth/`, so authenticated specs load it instead
of signing in through the form every time.
