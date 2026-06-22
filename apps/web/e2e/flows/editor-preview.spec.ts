import { expect, test } from "../fixtures/resume";

/**
 * The live preview (#39) renders the in-memory document through the shared engine
 * and paints it with pdf.js. The acceptance bar: a frame appears for the loaded
 * résumé, and an edit drives a fresh render through the same `/api/preview` path -
 * proof the preview tracks unsaved edits and goes through one render definition,
 * not a separate client layout.
 */
const previewRendered = (page: import("@playwright/test").Page) =>
  page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/api/preview"),
  );

test("renders the résumé and re-renders on an edit", async ({
  page,
  seededResume,
}) => {
  const firstRender = previewRendered(page);
  await page.goto(`/resume/${seededResume.id}`);
  await firstRender;

  // The canvas is hidden until a frame paints, so its visibility is the signal
  // that the render landed and was rasterized on screen.
  await expect(page.locator("aside canvas")).toBeVisible();

  // An edit must reach the engine again - the preview reflects unsaved content.
  const reRender = previewRendered(page);
  await page.getByRole("textbox", { name: "Full name" }).fill("Ada Lovelace");
  await reRender;
});
