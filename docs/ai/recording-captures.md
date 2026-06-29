# Recording captures (GIFs / videos)

The `@thomasar-cv/capture` package (`tooling/capture/`) produces the project's
documentation and marketing media - the README hero GIF today, more later - as
**reproducible** artifacts: each clip is generated from a checked-in *scene*, so
refreshing one after a UI change is a re-run, not a manual screen recording.

Read this before recording a new clip, refreshing an existing one, or changing
the toolkit.

## Mental model

A **scene** (`tooling/capture/src/scenes/<name>.ts`) declares two things:

- `setup(ctx)` - prepare state (usually `ctx.seedShowcaseResume()`), returns data
  for `record`. Runs **before** the browser opens, so its time isn't in the clip.
- `record(stage, data)` - drive the scripted interaction through `stage`.

The runner does the rest: resolve a dev server, sign in with the dev shortcut,
run `setup`, record `record` to video, and encode to `docs/assets/<name>.<ext>`.

The recording **head is auto-trimmed**: `Stage` notes when the first action fires
and the encoder drops everything up to ~0.8s before it, so the clip opens on the
loaded, idle UI no matter how slow the cold start was. End scenes with a
`stage.pause(...)` so the last change has a beat to land.

## Running it

```bash
pnpm capture <scene>            # e.g. editor-live-preview -> docs/assets/editor-live-preview.gif
pnpm capture <scene> --mp4      # also an MP4 (sites/social)
pnpm capture --list             # list scenes
```

Prerequisites (one-time): `brew install ffmpeg` and
`pnpm --filter @thomasar-cv/capture exec playwright install chromium`. Have a dev
server up (`pnpm dev`) - the tool reuses it, or starts its own on a separate
build dir if none is reachable. See `tooling/capture/README.md` for all flags.

**To refresh the README GIF:** `pnpm capture editor-live-preview`, then open the
new `docs/assets/editor-live-preview.gif` and eyeball it before committing. The
palette/dither pass is non-deterministic, so a re-run always produces a different
binary even when nothing on screen changed - git marking it "modified" tells you
nothing; judge the GIF itself.

## Adding a scene

1. Create `tooling/capture/src/scenes/<name>.ts`:

   ```ts
   import { defineScene } from "../scene";

   export default defineScene<{ resumeId: string }>({
     name: "<name>", // the output filename: docs/assets/<name>.gif
     description: "one line shown by --list",
     viewport: { width: 1440, height: 900 }, // editor needs >=1280 wide
     output: { gif: true, width: 1000, fps: 15 },
     setup: async (ctx) => ({ resumeId: await ctx.seedShowcaseResume() }),
     record: async (stage, { resumeId }) => {
       await stage.goto(`/resume/${resumeId}`);
       await stage.waitFor("canvas"); // first preview render
       await stage.settle();
       await stage.moveClick(stage.raw.getByRole("button", { name: "Save" }));
       await stage.pause();
     },
   });
   ```

2. Register it in `tooling/capture/src/scenes/index.ts`.

### The `Stage` API

- `goto(path)` - navigate (re-injects the cursor after the load).
- `waitFor(selector)` - block until an element appears (e.g. `"canvas"` for the preview).
- `settle(ms?)` / `pause(ms?)` - hold on the idle UI; use `pause` between/after actions.
- `moveClick(locator, holdMs?)` - glide the cursor over and click; `holdMs` is the dwell after, where the effect plays out.
- `move(locator, holdMs?)` - glide over and hover *without* clicking; for sweeping a surface (e.g. a dashboard) without firing an action.
- `type(locator, text)` - glide over a field and type it (replacing the value).
- `raw` - the underlying Playwright `Page` for locators and anything uncovered.

Prefer role-based locators (`getByRole("radiogroup", { name }).getByRole("radio", { name })`)
so scenes don't break on styling changes.

## How it works / gotchas

- **Fake cursor.** Playwright's video doesn't capture the real pointer, so
  `Stage` injects a CSS dot it eases to each target. Without it the UI looks like
  it changes on its own. It's purely cosmetic (`pointer-events: none`).
- **Sign-in + data.** The tool clicks **Sign in as dev** (gated off in
  production, needs `DEV_LOGIN_*` in `apps/web/.env.local`), which also
  provisions the dev account on a fresh DB. `seedShowcaseResume` then writes a
  fully-populated synthetic résumé (the example fixture - no personal data) to
  that account via `DATABASE_URL` from `packages/db/.env`. **This touches the
  shared dev database** under the dev account; the seed is idempotent and scoped
  to one named résumé, so it never clobbers other rows.
- **Server.** Reuses a reachable server; else starts `next dev` on
  `CAPTURE_PORT`/`PORT`/3000 with a separate `NEXT_DIST_DIR` so it coexists with
  a normal `pnpm dev`. First navigation to a route triggers a cold compile - the
  `waitFor` covers it and the head trim hides it. Set `CAPTURE_BASE_URL` to
  record against an external dev/preview deployment (not prod - the dev button
  isn't there).
- **Encoding.** GIFs use a two-pass ffmpeg palette (per-clip palette + dithered
  map) - far smaller and cleaner than one pass. Keep clips short and aim to keep
  the GIF under a few MB (it's committed to the repo). For anything long or
  high-motion, prefer `--mp4`.
- **Geometry.** Record at a 1440x900 viewport (2x device scale for crisp text)
  and downscale at encode. The editor's two-column layout needs >=1280 wide.
- **Outputs are committed; scratch isn't.** Final media lands in `docs/assets/`
  and is committed. Raw video, palettes, and saved auth state live in
  `tooling/capture/.tmp/` (git-ignored); `--keep-video` leaves the `.webm` there.
