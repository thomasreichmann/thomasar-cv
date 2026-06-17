# @thomasar-cv/render

The résumé **render definition**: the one place a `ResumeContent` document is
turned into a PDF. The on-screen preview and the download export both render
this same component tree, so they cannot drift apart - the preview is literally
the export's bytes shown through pdf.js. See
[ADR 0002](../../docs/decisions/0002-pdf-engine.md).

## Layers

- `model.ts` - `flattenResume(content, locale)` turns a document into ordered,
  locale-resolved blocks in single-column reading order. Drops hidden sections
  and items; reads every translatable value through `resolveText`. This is the
  template-agnostic layer, so reading order and the ATS-clean text layer are
  decided once and shared by every template and by the export.
- `templates/ats.tsx` - the default ATS template: single-page A4, single column,
  built-in Helvetica (real, verbatim text layer, no font registration).
- `document.tsx` - `ResumeDocument`, the entry point that flattens content and
  hands the blocks to a template (ATS by default).
- `render.tsx` - `renderResumeToBuffer(content)`, the server path to PDF bytes
  used by both the preview and the export.

## Adding a template

Implement `ResumeTemplate` (`template.ts`) and pass it as `ResumeDocument`'s
`template` prop. A template only styles the blocks; it never decides what
content shows or in what order, so the ATS-clean single-column layer holds for
free.
