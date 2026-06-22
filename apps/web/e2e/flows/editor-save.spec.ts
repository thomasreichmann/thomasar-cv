import { expect, test } from "../fixtures/resume";
import { isTrpcRequest } from "../helpers/trpc";
import { makeEditorDirty } from "../scenarios/editor";

/**
 * The acceptance bar for the harness: a real edit, saved, survives a reload.
 * Exercises every layer at once - back-door seeding (the `seededResume`
 * fixture), storageState auth (the authenticated fixture it extends), the tRPC
 * request helper, and the editor seam from #40.
 */
test("editing and saving a résumé persists the change", async ({
  page,
  seededResume,
}) => {
  const newName = "Renamed résumé";
  await makeEditorDirty(page, seededResume.id, newName);

  const save = page.getByRole("button", { name: "Save" });
  const updateFired = page.waitForRequest(
    (request) =>
      request.method() === "POST" && isTrpcRequest(request.url(), "resume.update"),
  );
  await save.click();
  await updateFired;

  // Saving clears the dirty state: the control disables again.
  await expect(save).toBeDisabled();

  // The change is durable, not just held in memory.
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Résumé name" })).toHaveValue(
    newName,
  );
});
