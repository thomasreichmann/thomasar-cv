import { expect, type Page } from "@playwright/test";

/**
 * Scenario helpers (layer 3: factories -> fixtures -> scenarios, see README.md).
 *
 * Add one here only when a precondition needs more than one step or has to drive
 * the UI, AND it is shared by at least two tests. A single-step precondition
 * belongs in a fixture; a one-off belongs inline in its test.
 *
 * `makeEditorDirty` opens a résumé and edits its name without saving, leaving the
 * editor with unsaved changes. Both the save flow and the navigation-guard flow
 * start from that state, which is what earns it a helper.
 */
export async function makeEditorDirty(
  page: Page,
  resumeId: string,
  nextName: string,
): Promise<void> {
  await page.goto(`/resume/${resumeId}`);
  const nameInput = page.getByRole("textbox", { name: "Résumé name" });
  await expect(nameInput).toBeVisible();
  await nameInput.fill(nextName);
  // The Save control enables only when there are unsaved edits, so its enabled
  // state is the signal that we're dirty (and unlike the "Unsaved changes" text,
  // it isn't hidden on narrow viewports).
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
}
