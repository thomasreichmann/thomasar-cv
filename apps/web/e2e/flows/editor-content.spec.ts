import { expect, test } from "../fixtures/resume";

/**
 * The content editors (#37) write into the same in-memory document the save loop
 * persists, so a field edit and a structural change both have to survive a save +
 * reload. The seeded résumé starts from the fully-populated example document, so
 * every section type is already on the page to edit.
 */
test("editing a header field saves and survives a reload", async ({
  page,
  seededResume,
}) => {
  await page.goto(`/resume/${seededResume.id}`);

  const fullName = page.getByRole("textbox", { name: "Full name" });
  await expect(fullName).toBeVisible();
  await fullName.fill("Ada Lovelace");

  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(
    "Ada Lovelace",
  );
});

test("adding a section saves and survives a reload", async ({
  page,
  seededResume,
}) => {
  await page.goto(`/resume/${seededResume.id}`);
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeVisible();

  // Each Projects section carries one "Add project" control, so its count tracks
  // how many exist - a stable signal that the new section landed and persisted.
  const addProject = page.getByRole("button", { name: "Add project" });
  const before = await addProject.count();

  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByRole("menuitem", { name: "Projects" }).click();
  await expect(addProject).toHaveCount(before + 1);

  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add project" })).toHaveCount(
    before + 1,
  );
});
