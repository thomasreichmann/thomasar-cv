# 0002 - PDF engine: @react-pdf/renderer, with the PDF as the preview

Status: accepted (issue #17)

## Context

v0.2 rests the whole milestone on one deferred decision: how to turn a résumé
into a PDF that stays faithful to the on-screen preview and carries a real,
selectable text layer in single-column reading order (the ATS requirement). The
requirements set one hard rule here, "one rendering definition, two outputs", so
the preview and the export cannot be two layouts that drift apart. #18 (the
render definition) and #19 (the export) both sit on top of this choice, so it
gets settled and proven before any of that is built.

There are two honest ways to satisfy "faithful preview + real text layer", and
they disagree about what the render definition even is:

- HTML/CSS is the definition. The preview is live DOM, and a headless Chromium
  prints that same HTML to PDF. Full CSS, maximum layout freedom.
- PDF primitives are the definition. A component tree maps the résumé straight
  to PDF, and the preview shows those same PDF bytes. The preview is the export.

## Decision

Use @react-pdf/renderer. The render definition is a React component tree that
maps a `ResumeContent` document to a PDF, the export is the bytes it produces,
and the preview is those same bytes shown in the browser through pdf.js. There
is one definition and the preview is the export itself, not a parallel HTML
layout that has to be kept in sync.

## The proof

`spikes/pdf-engine/` (throwaway, deletable once this is accepted) exports the
real `exampleResume` fixture to PDF both ways, extracts each text layer with
pdfjs, and checks single-page A4, single-column reading order, verbatim text,
and that the hidden Initech role never renders. To give the reading-order check
teeth, the item header is a flex row with the date pushed to the right, which is
the layout that usually scrambles a text layer.

| metric             | react-pdf            | chromium                       |
| ------------------ | -------------------- | ------------------------------ |
| ship size (Vercel) | 292 KB, pure JS      | 69.7 MB + 5.7 MB (binary)      |
| generate time      | ~40 ms               | ~700 ms (incl. browser launch) |
| output PDF size    | 3.5 KB               | 45.7 KB                        |
| reading order      | single column        | single column                  |
| text fidelity      | every token verbatim | split a ligature               |

Both keep correct single-column reading order and both drop the hidden role.
The one difference in behavior is the text layer itself: Chromium rendered
"fluent" with the fl ligature and the extracted text came out as "fl uent", a
broken word an ATS would index wrong, while react-pdf used the standard
Helvetica metrics and every token came out verbatim. The ligature split is
font-dependent and can be worked around (embed a font, turn ligatures off), but
it is the default behavior, and it is exactly the kind of text-layer policing
react-pdf does not ask of us since with it the clean layer is structural rather
than something to defend.

## Tradeoffs

The decision turns on the three axes the issue named, plus the ATS property that
is the real requirement.

- Fidelity to the preview. react-pdf wins on the strongest reading of
  "faithful": the preview is the export, the same bytes, so they cannot diverge.
  Chromium's preview is the live HTML and its export is print CSS, so the two
  share a render engine but not an output, and the usual screen-versus-print
  gaps (page breaks, margins, font substitution) come back as preview drift.
- Vercel runtime cost. react-pdf is ~290 KB of pure JS that runs in any Node
  function with nothing to boot, so a cold invocation just loads JS. Chromium
  ships as @sparticuz/chromium, ~70 MB unpacked plus puppeteer-core, which eats
  most of a serverless function's size budget and adds the cost of launching a
  browser to every cold start. For a personal tool on a hobby budget that gap
  matters.
- Operational complexity. react-pdf is a library call with nothing to provision.
  Chromium means either carrying the binary in the function (size, cold starts,
  version pinning against Vercel's runtime) or paying for an external browser
  service, which is a recurring cost and a network dependency on the export path.
- ATS-cleanliness. With react-pdf the single-column text layer is a property of
  the component tree, so it holds by construction. With Chromium it depends on
  disciplined CSS and on the renderer not doing something like the ligature
  split, so it becomes something to verify and defend rather than something you
  get for free.

What we give up by not using Chromium is CSS power. react-pdf supports a flexbox
subset, no grid, no arbitrary selectors, and custom or non-Latin fonts have to
be registered and embedded. For a deliberately minimal single-page résumé that
constraint is fine, and it lines up with the project's own "structured editing,
not a freeform canvas" stance. If the design ever needed rich web-platform
layout this would be worth revisiting, but a one-page résumé does not.

## Consequences

- #18 builds the render definition in react-pdf primitives (Document / Page /
  View / Text), reading translatable values through `resolveText`, the way the
  spike's `content.ts` does in miniature.
- The preview in #18 renders that same component to a PDF and shows it via
  pdf.js, so there is no second HTML layout to keep in sync. Live editing in
  v0.3 re-renders the PDF on change; the spike renders in well under 50 ms, so
  that is cheap enough to do on every edit.
- #19's export returns the bytes from the same definition, so the export cannot
  drift from the preview.
- #20's ATS check is the spike's extraction step promoted into a real test:
  generate the PDF, pull the text layer, assert the content and the
  single-column order.
- We default to the built-in Helvetica. If we later want a nicer typeface we
  register and embed a subset, which also keeps the text layer clean; the only
  cost is a modest bump in file size.
- The spike package can be deleted once this lands. Its content model and
  extraction check are worth lifting into #18 and #20 rather than keeping the
  spike around.
