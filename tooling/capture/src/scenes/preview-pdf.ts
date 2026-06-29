import { defineScene } from "../scene";

/**
 * The public /preview page: the example résumé rendered to a real single-page A4
 * PDF and painted with pdf.js - literally the bytes the export ships, not a
 * second HTML layout (ADR 0002). Shows the headline "faithful PDF, real text
 * layer" bet on its own surface, separate from the editor. The page renders the
 * fixture itself, so this scene needs no seeding.
 */
export default defineScene<void>({
  name: "preview-pdf",
  description:
    "Public preview page: the example résumé rendered to a single-page A4 PDF (the bytes the export ships).",
  viewport: { width: 1200, height: 1340 },
  output: { gif: true, width: 900, fps: 15 },
  record: async (stage) => {
    await stage.goto("/preview");
    // The canvas is in the DOM from the start but only flips to `block` once
    // pdf.js paints the first page; wait for that so the clip opens on the paper.
    await stage.waitFor("canvas.block");
    await stage.settle();
    await stage.move(stage.raw.getByRole("link", { name: "Download PDF" }));
    await stage.pause(1200);
  },
});
