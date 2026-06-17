# pdf-engine spike (issue #17)

Throwaway proof behind [ADR 0002](../../docs/decisions/0002-pdf-engine.md). It
exports the real `exampleResume` fixture to PDF two ways and checks each text
layer, so the engine decision rests on evidence rather than assumption. Safe to
delete once #18 and #20 lift the content model and the extraction check out of
here.

```bash
pnpm --filter pdf-engine-spike proof
```

That renders the fixture with both engines, writes the PDFs and their extracted
text to `out/`, and prints a comparison plus a per-engine PASS/FAIL on
single-page A4, single-column reading order, verbatim text fidelity, and hidden
items staying out of the layer.

- `content.ts` flattens the fixture into ordered blocks both engines render, and
  doubles as the oracle for expected reading order. The item header is a flex
  row with the date pushed right on purpose, since that is the layout most
  likely to scramble a text layer.
- `react-pdf.tsx` renders via @react-pdf/renderer (the chosen engine).
- `html-template.ts` + `chromium.ts` render the same blocks as HTML and print
  them with headless Chromium (Playwright locally; @sparticuz/chromium on Vercel
  is the same engine, only heavier to ship).
- `extract.ts` pulls the text layer with pdfjs and checks reading order by
  content-stream sequence and by position.
