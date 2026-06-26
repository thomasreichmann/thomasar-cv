import { expect, test } from "../fixtures/resume";
import { isTrpcRequest } from "../helpers/trpc";

/**
 * The theme controls (#53): a bounded change must re-render the preview through
 * the same `/api/preview` path the content edits use (one render definition, ADR
 * 0002), and survive a reload - the "saved with the résumé and reloaded on open"
 * acceptance bar. Exercises the full slice: the radiogroup control, the in-memory
 * theme, the preview render, the `resume.update` write, and the reload hydrate.
 */
const previewRendered = (page: import("@playwright/test").Page) =>
  page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/api/preview"),
  );

test("a theme control re-renders the preview and persists on save", async ({
  page,
  seededResume,
}) => {
  const firstRender = previewRendered(page);
  await page.goto(`/resume/${seededResume.id}`);
  await firstRender;

  // Changing the accent drives a fresh render through the shared engine - the
  // preview reflects the theme, not just content, and through one render path.
  const reRender = previewRendered(page);
  const navy = page.getByRole("radio", { name: "Navy" });
  await navy.click();
  await reRender;
  await expect(navy).toBeChecked();

  // Save the theme change, then prove it is durable, not just held in memory.
  const updateFired = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      isTrpcRequest(request.url(), "resume.update"),
  );
  await page.getByRole("button", { name: "Save" }).click();
  await updateFired;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Navy" })).toBeChecked();
});

test("a segmented control is keyboard-operable and the choice persists", async ({
  page,
  seededResume,
}) => {
  const firstRender = previewRendered(page);
  await page.goto(`/resume/${seededResume.id}`);
  await firstRender;

  // Scope to Density: its options (Compact/Normal/Relaxed) share labels with the
  // Spacing group, so the group name is what disambiguates them.
  const density = page.getByRole("radiogroup", { name: "Density" });
  const normal = density.getByRole("radio", { name: "Normal" });
  const relaxed = density.getByRole("radio", { name: "Relaxed" });

  // The group is one tab stop: only the checked option is tabbable (roving
  // tabindex), so a keyboard user lands on the current choice, not every option.
  await expect(normal).toBeChecked();
  await expect(normal).toHaveAttribute("tabindex", "0");
  await expect(relaxed).toHaveAttribute("tabindex", "-1");

  // Arrow keys move *and* select (radio semantics) and drive a fresh render
  // through the same shared path - the hand-rolled keyboard core, not just clicks.
  const reRender = previewRendered(page);
  await normal.focus();
  await page.keyboard.press("ArrowRight");
  await reRender;
  await expect(relaxed).toBeChecked();
  await expect(relaxed).toHaveAttribute("tabindex", "0");

  const updateFired = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      isTrpcRequest(request.url(), "resume.update"),
  );
  await page.getByRole("button", { name: "Save" }).click();
  await updateFired;

  await page.reload();
  await expect(
    page.getByRole("radiogroup", { name: "Density" }).getByRole("radio", {
      name: "Relaxed",
    }),
  ).toBeChecked();
});
