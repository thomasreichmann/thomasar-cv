import { expect, test } from "../fixtures/authenticated";
import { isTrpcRequest } from "../helpers/trpc";

/**
 * The end-to-end proof for JSON Resume import (#55): picking a file on the
 * dashboard creates a résumé from it and drops the user straight into the editor
 * with the mapped content. Covers the whole client path the router tests can't -
 * file read, client-side JSON parse, the `importJsonResume` mutation, and the
 * redirect - against the real app and database.
 */
const JSON_RESUME = JSON.stringify({
  basics: { name: "Ada Lovelace", summary: "First programmer." },
  work: [{ name: "Analytical Engine", position: "Mathematician" }],
  // A section we don't model: it must be dropped, not reject the import.
  volunteer: [{ organization: "Royal Society" }],
});

test("importing a JSON Resume file creates a résumé and opens it", async ({
  page,
}) => {
  await page.goto("/dashboard");

  const created = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      isTrpcRequest(request.url(), "resume.importJsonResume"),
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "ada.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON_RESUME),
    });
  await created;

  // Lands in the editor, named from the document's person name.
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  await expect(page.getByRole("textbox", { name: "Résumé name" })).toHaveValue(
    "Ada Lovelace",
  );
});

test("a file that isn't valid JSON is rejected without leaving the dashboard", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ not json"),
    });

  await expect(page.getByText("That file isn't valid JSON.")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});
