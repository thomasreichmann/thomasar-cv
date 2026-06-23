# 0006 - Résumé theme: a bounded presentation model, stored beside content

Status: accepted (issue #52)

(The issue text predates ADR 0005 landing as guest conversion, so it asks for
"ADR 0005"; this is the next free number.)

## Context

The requirements call for adjusting a résumé's look through "a small, bounded
set of theme controls (e.g. density, spacing, scale, accent) - not freeform".
Two things have to be settled to make that real without painting v0.5 into a
corner:

1. **What the model is.** Which controls exist, what each does, and how a choice
   is bounded so a user can never produce a layout that breaks the one-page A4 or
   the ATS text layer the whole tool is built on.
2. **Where the theme lives.** It is presentation, not career data, and v0.5 will
   snapshot and vary résumés. The theme has to travel with a snapshot or variant
   without being tangled into the content document, whose diffs and history
   should stay about *what the résumé says*.

The render side already has the seam: `flattenResume` settles reading order and
visibility, a template settles look, and one `renderResumeToBuffer` path feeds
both the preview and the export (ADR 0002). A theme is just the missing input to
that look.

## Decision

**A bounded `resumeTheme` schema, threaded through the one render definition, and
stored in its own `theme` column on the `resume` row - separate from the content
document.**

### The model

Four controls, each a closed enum (never a freeform number or color):

- **density** - leading *within* a run of text: `compact | normal | relaxed`.
- **spacing** - whitespace *between* blocks and sections, the page's vertical
  rhythm: `compact | normal | relaxed`.
- **scale** - overall type size, every font size shifts one proportional step:
  `small | normal | large`.
- **accent** - a single named token coloring the name and section headings:
  `graphite | rust | navy | forest | plum`.

density and spacing read alike but are distinct axes: density is how tightly
lines stack inside a paragraph, spacing is how much air sits between paragraphs.
Keeping them apart is what lets a user pull one without the other.

The schema (`@thomasar-cv/db/schema`'s `resume-theme.ts`) owns only the
*vocabulary* - the legal choices. The render package
(`packages/render/src/theme.ts`) owns the *mapping* from each choice to a
concrete point size or hex color, exactly as it already owns layout. So the
schema never carries typography and the template never re-derives what "compact"
means. Every field defaults, so `resumeTheme.parse({})` is the neutral baseline
and `defaultResumeTheme` exposes it.

### Bounded, single accent, light paper

`accent` is one token, not a palette and not a hex field, and it lands in exactly
two places (the name and the section headings), never the page background. The
paper stays light and the body text stays near-black, so the output is ATS-safe
by construction: color is metadata on a real, selectable text layer, never a
substitute for it. `graphite` resolves to the original near-black, so the default
theme reproduces today's ink-only look byte-compatibly enough that the existing
ATS text-layer test passes unchanged.

### Honored once, in the shared definition

`ResumeDocument` takes an optional `theme` (defaulting to the baseline) and hands
it to `template.renderPage(blocks, theme)`; the ATS template builds its
StyleSheet from the resolved theme. Because the preview and the export both go
through this single `renderResumeToBuffer`, they cannot show different themes -
the same no-drift guarantee ADR 0002 gives content now covers presentation too.

## Where the theme is stored

The theme belongs in a **separate `theme` jsonb column on the `resume` table**,
a sibling of `content` - not nested inside the content document.

- It is presentation, not content. Folding it into `content` would make a layout
  tweak show up as a content edit in history and diffs, which is the distinction
  v0.5's compare/restore leans on.
- It is a sibling *column*, not a separate *row*, so a snapshot or variant - which
  ADR 0001 defines as "another row pointing at a copy of `content`" - copies the
  theme in the same copy, with no join and no second lifecycle to keep in step.

**The column is not added in this issue.** Nothing reads a saved theme yet: the
live preview renders the request body, the export renders the fixture, and the
editor's theme controls are a separate issue. Adding a column now would be
storage with no reader. What is decided here is the *seam* - the schema exists,
the render path honors it, and the storage location is fixed - so the column is a
single additive migration the moment a reader lands (the editor theme controls,
or a saved-résumé export). Until then, callers pass a theme explicitly or get the
default.

## Why bounded, not freeform

A freeform editor (arbitrary margins, font sizes, a color picker) was the
alternative and loses on the tool's own terms. The premise is a clean one-page
A4 that parses in an ATS; freeform controls are precisely how a user defeats
that - a nudged margin overflows the page, a light accent on a tint fails
contrast, a hex picker invites a dark background that wrecks the text layer.
Bounded enums make every reachable theme a good one: the constraint is the
feature, not a limitation to apologize for. It also keeps the render mapping a
small, testable table instead of an open-ended styling surface.

## v0.5 implication

Because the theme is a column on the résumé row, v0.5 gets per-version and
per-variant themes for free. A labeled snapshot copies the row, so it captures
the theme as it was at that moment; a tailored variant is another row and can
carry its own theme without any per-variant plumbing. "Vary the theme alongside
the content" is then just "the variant row has a different `theme` value" - no new
storage shape, which is the whole reason the seam is decided now rather than
discovered later. (Per-variant theme itself stays out of scope here; only the
seam that makes it cheap is settled.)

## Consequences

- A new validated `resumeTheme` schema and `defaultResumeTheme` live in the db
  package beside `resumeContent`; the render package gains a `theme.ts` mapping
  and threads `theme` through `ResumeDocument` and the template interface.
- The default theme reproduces the original look, so every existing résumé and
  render is unaffected until a theme is deliberately set.
- The `resume.theme` column is a known, additive migration deferred until a
  reader exists; the schema and render path are ready for it today.
- The editor's theme-control UI and wiring a user-selected theme through the
  preview/export routes are separate issues; this issue stops at the model, the
  render definition, and the storage decision.
