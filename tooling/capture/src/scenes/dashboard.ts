import { defineScene } from "../scene";

/**
 * The dashboard (issue #36): the résumé management surface, with the showcase
 * résumé seeded so the list isn't empty. The cursor sweeps the row and the
 * "New résumé" control to show the surface - it only hovers, never clicks,
 * because a real create writes a row to the dev DB and opening a row would put a
 * cold editor compile mid-clip. Opening a résumé is the editor-live-preview clip.
 */
export default defineScene<{ resumeId: string }>({
  name: "dashboard",
  description:
    "Dashboard: the résumé list (management surface), with the showcase résumé.",
  viewport: { width: 1280, height: 900 },
  output: { gif: true, width: 900, fps: 15 },
  setup: async (ctx) => ({ resumeId: await ctx.seedShowcaseResume() }),
  record: async (stage) => {
    await stage.goto("/dashboard");
    await stage.waitFor("text=Your résumés");
    await stage.settle();

    const showcaseRow = stage.raw.getByRole("link", {
      name: "Jane Doe — Product Engineer",
    });
    await stage.move(showcaseRow);
    await stage.move(stage.raw.getByRole("button", { name: "New résumé" }));
    await stage.move(showcaseRow);
    await stage.pause(1200);
  },
});
