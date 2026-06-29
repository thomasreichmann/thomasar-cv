# @thomasar-cv/capture

Scripted screen recordings of the app, for documentation and marketing. A
**scene** describes one demo - what state to set up and what to do on screen -
and the runner turns it into a GIF (and optionally an MP4) under `docs/assets/`.

It exists so the README hero clip and any future marketing media are
**reproducible**: regenerated from code on demand, not hand-recorded once and
left to rot. To refresh the README GIF after a UI change, re-run its scene.

For the full how-and-why (adding scenes, the `Stage` API, encoding, gotchas),
see [`docs/ai/recording-captures.md`](../../docs/ai/recording-captures.md).

## Quick start

```bash
# one-time prerequisites
brew install ffmpeg                                       # encodes the GIF/MP4
pnpm --filter @thomasar-cv/capture exec playwright install chromium

pnpm dev                       # have a dev server running (the tool reuses it)
pnpm capture editor-live-preview          # writes docs/assets/editor-live-preview.gif
pnpm capture --list                       # list available scenes
```

The tool reuses a dev server if one is reachable; otherwise it starts one (pass
`--no-server` to forbid that). It signs in via the **Sign in as dev** shortcut,
so `DEV_LOGIN_*` must be set in `apps/web/.env.local`; seeding reads
`DATABASE_URL` from `packages/db/.env` and writes the showcase résumé to the dev
account (the same shared dev database the app uses).

## Flags

| Flag           | Effect                                                    |
| -------------- | -------------------------------------------------------- |
| `--mp4`        | also write an MP4 (smaller/crisper for sites and social) |
| `--no-gif`     | skip the GIF (e.g. with `--mp4` for MP4-only)            |
| `--width=N`    | output width in px (default 1000)                        |
| `--fps=N`      | frame rate (default 15)                                  |
| `--speed=N`    | playback speed multiplier (e.g. `1.25`)                  |
| `--keep-video` | keep the raw `.webm` in `.tmp/` for inspection           |
| `--no-server`  | fail instead of starting a dev server                    |
| `--list`       | list scenes and exit                                      |

Env: `CAPTURE_BASE_URL` to record against an external (dev/preview) server,
`CAPTURE_PORT` to pick the port to probe/start.
