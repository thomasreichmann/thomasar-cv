# 0004 - Visual identity: Oxide (warm graphite, burnt-rust accent)

Status: accepted (issue #34)

## Context

The frontend foundation (ADR 0003, issue #31) shipped the default shadcn dark
theme on purpose, so the look would be a deliberate decision made on its own
rather than one inherited by accident from #28's gallery-wall styling. It left a
real visual identity (palette, type, accent, signature treatments) as a separate
deferred decision, and because the foundation routes every component through the
shadcn semantic token layer, applying that identity is a swap of the token
values and the fonts, not a component rewrite. This ADR is that decision.

The identity was chosen against a real field rather than picked in the abstract.
A throwaway gallery route rendered candidate identities on the actual dark
chrome (the same buttons, cards, inputs, and type ramp the app already uses),
each one nothing but a scoped token + font swap, so the choice was made by
looking at the thing itself. The first round (a cool technical "blueprint", a
warm serif "proof", a monospace "ledger") did not land. A bolder second round
(rust-on-graphite "oxide", monochrome "pressroom", ultramarine "cobalt",
green-base "conifer") surfaced Oxide as the direction. A third round held the
Oxide recipe fixed and moved only the accent and base temperature across a small
spread (ember, clay, amber, oxblood) to settle the exact accent, and the
original burnt-rust read best.

## Decision

Adopt **Oxide**: a warm-graphite dark chrome with a single burnt-rust accent.

- **Palette.** Warm graphite base (hue ~50, very low chroma so the warmth reads
  as a tint, not a colour cast) with a burnt-rust `--primary` (hue 45). The
  destructive red stays brighter and more saturated than the rust so danger
  reads as distinct from the accent rather than a shade of it. Radius is
  `0.5rem`. The exact `:root` token values:

  | token | value |
  | --- | --- |
  | `--background` | `oklch(0.16 0.008 50)` |
  | `--foreground` | `oklch(0.94 0.012 70)` |
  | `--card` / `--popover` | `oklch(0.205 0.011 48)` |
  | `--card-foreground` / `--popover-foreground` | `oklch(0.94 0.012 70)` |
  | `--primary` | `oklch(0.6 0.15 45)` |
  | `--primary-foreground` | `oklch(0.98 0.01 70)` |
  | `--secondary` / `--muted` | `oklch(0.27 0.014 50)` |
  | `--secondary-foreground` | `oklch(0.94 0.012 70)` |
  | `--muted-foreground` | `oklch(0.73 0.022 58)` |
  | `--accent` | `oklch(0.32 0.045 45)` |
  | `--accent-foreground` | `oklch(0.94 0.012 70)` |
  | `--destructive` | `oklch(0.64 0.2 18)` |
  | `--border` | `oklch(0.8 0.04 50 / 14%)` |
  | `--input` | `oklch(0.8 0.04 50 / 18%)` |
  | `--ring` | `oklch(0.6 0.15 45)` |

- **Type.** Bricolage Grotesque is the sans, carrying both display and body, and
  Geist Mono stays for the uppercase eyebrow labels that the chrome already
  leans on. Bricolage has enough character to give the headings a point of view
  while staying a working body face; if long-form legibility ever bites once the
  editor fills with text, it is a one-line font swap behind `--font-sans`.

- **Accent.** The rust `--primary` is the whole accent. There is no secondary
  brand colour.

- **No background signature treatments.** Deliberately no grain and no glow. A
  soft glow or a grain overlay is a shortcut to looking "designed" that tends to
  read as cheap, and the felt quality of the system should come from motion,
  presentation, loading states, and how navigation transitions actually look,
  which is where the polish budget goes instead. This also keeps the identity an
  honest token + font swap, with nothing added to the chrome markup.

## How it is applied

- `apps/web/app/globals.css`: the `:root` token values above, `--radius: 0.5rem`,
  and `--font-sans` repointed from Geist to `var(--font-bricolage)`. The
  `@theme inline` mapping and the dark-only reconciliation from ADR 0003 are
  unchanged.
- `apps/web/app/layout.tsx`: Bricolage Grotesque wired as `--font-bricolage`,
  Geist Mono kept as `--font-geist-mono`.
- No component files change. Each component already resolves `bg-primary`,
  `text-muted-foreground`, `border-input`, and so on against these tokens, so it
  picks up Oxide with no edit.

## Why this and not the others

- The rejected candidates each had a clear reason to exist, but Oxide was the one
  that read right for this product on the actual chrome: warm and crafted without
  the editorial directions' delicacy, with a confident accent that is not the
  default developer-tool blue. The point of the live gallery was to make that a
  judgement about the thing rather than a description, and it is recorded here so
  the choice is traceable rather than mysterious.
- The "quiet luxury" monochrome direction was tempting but loses too much once
  the app fills with interactive states that want a real accent colour.
- Grain and glow are rejected on principle, not just for Oxide (see above), so
  the same reasoning should hold the line against reintroducing them later under
  a different name.

## Consequences

- The chrome (landing, auth, dashboard, preview surround) is Oxide with no
  per-page work, since it all routes through the tokens. New components inherit
  it the same way.
- `@thomasar-cv/render` and the exported PDF are untouched. The résumé paper is a
  light, ATS-parsed document themed separately (ADR 0002), and chrome tokens
  never reach it, so the preview surround is warm-dark while the paper on it
  stays white.
- Resume-output theme controls (density, spacing, scale, accent) remain a v0.4
  concern and are out of scope here. Those are the paper's controls, not the
  chrome's.
- The "no decorative texture, invest in motion and loading and navigation"
  stance is now a recorded principle, so later polish work has a direction and
  reintroducing grain or glow needs a deliberate reversal of this ADR.
