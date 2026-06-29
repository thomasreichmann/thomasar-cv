import { defineScene } from "../scene";

/**
 * The README hero clip: open the editor on a populated résumé, then cycle the
 * theme accent and bump scale/spacing so the live preview reflows through the
 * same render definition the PDF export uses. To refresh the README GIF, run
 * `pnpm capture editor-live-preview`.
 */
export default defineScene<{ resumeId: string }>({
  name: "editor-live-preview",
  description:
    "Editor + live preview; theme controls reflow the page through the render engine the PDF export uses.",
  viewport: { width: 1440, height: 900 },
  output: { gif: true, width: 1000, fps: 15 },
  setup: async (ctx) => ({ resumeId: await ctx.seedShowcaseResume() }),
  record: async (stage, { resumeId }) => {
    await stage.goto(`/resume/${resumeId}`);
    await stage.waitFor("canvas"); // the first live-preview render
    await stage.settle();

    const inGroup = (group: string, option: string) =>
      stage.raw
        .getByRole("radiogroup", { name: group, exact: true })
        .getByRole("radio", { name: option, exact: true });

    // Accent recolors the name and section headings in the preview...
    await stage.moveClick(inGroup("Accent", "Rust"));
    await stage.moveClick(inGroup("Accent", "Navy"));
    await stage.moveClick(inGroup("Accent", "Forest"));
    // ...and scale + spacing reflow the whole page.
    await stage.moveClick(inGroup("Scale", "Large"));
    await stage.moveClick(inGroup("Spacing", "Relaxed"));
    // Settle back on the brand accent for a clean closing frame.
    await stage.moveClick(inGroup("Accent", "Rust"));
    await stage.pause(1200);
  },
});
