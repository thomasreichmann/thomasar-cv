/**
 * Engine B input: the same blocks rendered as an HTML/CSS document. A headless
 * Chromium prints this to PDF, so this string is the "preview" and the print is
 * the export. Single column; the item header is a flex row with the date
 * pushed right (`justify-content: space-between`) - the realistic layout whose
 * text-layer order we want to verify survives the print.
 */
import { buildBlocks, type Block } from "./content";

const esc = (str: string) =>
  str.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function blockHtml(b: Block): string {
  switch (b.t) {
    case "name":
      return `<h1 class="name">${esc(b.text)}</h1>`;
    case "contacts":
      return `<div class="contacts">${esc(b.text)}</div>`;
    case "availability":
      return `<div class="availability">${esc(b.text)}</div>`;
    case "sectionTitle":
      return `<h2 class="section-title">${esc(b.text)}</h2>`;
    case "row":
      return `<div class="row"><span class="row-left">${esc(b.left)}</span>${
        b.right ? `<span class="row-right">${esc(b.right)}</span>` : ""
      }</div>`;
    case "sub":
      return `<div class="sub">${esc(b.text)}</div>`;
    case "bullet":
      return `<div class="bullet"><span class="glyph">&bull;</span><span>${esc(b.text)}</span></div>`;
    case "text":
      return `<div class="text">${esc(b.text)}</div>`;
  }
}

const CSS = `
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.35; padding: 40px 44px; }
  .name { font-size: 22pt; font-weight: 700; }
  .contacts, .availability { font-size: 9pt; color: #555; margin-top: 2px; }
  .section-title { font-size: 11pt; font-weight: 700; margin-top: 14px; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 0.75px solid #bbb; }
  .row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px; }
  .row-left { font-weight: 700; font-size: 10.5pt; }
  .row-right { font-size: 9pt; color: #555; }
  .sub { font-size: 9pt; color: #555; }
  .bullet { display: flex; margin-top: 1px; }
  .glyph { width: 10px; flex: none; }
  .text { margin-top: 2px; }
`;

export function buildHtml(): string {
  const body = buildBlocks().map(blockHtml).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;
}
