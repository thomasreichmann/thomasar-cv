import { expect, test } from "../fixtures/resume";
import { makeEditorDirty } from "../scenarios/editor";

/**
 * The editor guards its own exits: leaving with unsaved edits confirms first.
 * App Router has no global navigation guard, so the back control owns this (see
 * editor-toolbar.tsx).
 */
test("leaving the editor with unsaved edits asks to confirm", async ({
  page,
  seededResume,
}) => {
  await makeEditorDirty(page, seededResume.id, "Unsaved edit");

  await page.getByRole("button", { name: "Back to dashboard" }).click();

  await expect(page.getByText("Discard unsaved changes?")).toBeVisible();

  // Keeping editing dismisses the prompt and leaves you in the editor.
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    page.getByRole("textbox", { name: "Résumé name" }),
  ).toBeVisible();
});
