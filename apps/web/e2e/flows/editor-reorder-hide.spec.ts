import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/resume";
import { isTrpcRequest } from "../helpers/trpc";

/**
 * Reorder and show/hide (#38) are content-document edits - array position and a
 * `hidden` flag - so the proof is the same as any other edit: a structural change
 * survives a save + reload. The seeded résumé is the fully-populated example, so
 * every section and a multi-entry Experience are already on the page to move and
 * hide. The render engine reads order off array position and drops hidden nodes
 * with no editor-specific branch, so persisting the document is the whole job.
 */

async function save(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Save" });
  await expect(button).toBeEnabled();
  // The button disables both while saving and once clean, so its disabled state
  // alone isn't proof the write landed - reloading on it could abort an in-flight
  // request. Wait for the update POST to actually fire first (as editor-save does).
  const updateFired = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      isTrpcRequest(request.url(), "resume.update"),
  );
  await button.click();
  await updateFired;
  await expect(button).toBeDisabled();
}

test("reordering and hiding sections survive a save + reload", async ({
  page,
  seededResume,
}) => {
  await page.goto(`/resume/${seededResume.id}`);

  const titles = page.getByRole("textbox", { name: /section title$/ });
  await expect(titles).toHaveCount(6);
  await expect(titles.nth(1)).toHaveValue("Experience");
  await expect(titles.nth(2)).toHaveValue("Education");

  // Move Education above Experience, and hide Skills (a different section, so the
  // two changes don't shift each other's controls).
  await page.getByRole("button", { name: "Move Education section up" }).click();
  await page.getByRole("button", { name: "Hide Skills section" }).click();

  await expect(titles.nth(1)).toHaveValue("Education");
  await expect(titles.nth(2)).toHaveValue("Experience");
  // The toggle's name flips to "Show …" once hidden, derived straight from the
  // section's `hidden` flag, so it is the reload-safe read of that state.
  await expect(
    page.getByRole("button", { name: "Show Skills section" }),
  ).toBeVisible();

  await save(page);
  await page.reload();

  const reloaded = page.getByRole("textbox", { name: /section title$/ });
  await expect(reloaded.nth(1)).toHaveValue("Education");
  await expect(reloaded.nth(2)).toHaveValue("Experience");
  await expect(
    page.getByRole("button", { name: "Show Skills section" }),
  ).toBeVisible();
});

test("reordering items within a section survives a save + reload", async ({
  page,
  seededResume,
}) => {
  await page.goto(`/resume/${seededResume.id}`);

  // Each Experience role carries a Company field, so the column of Company inputs
  // is the section's entry order made readable.
  const companies = page.getByRole("textbox", { name: "Company" });
  await expect(companies.nth(0)).toHaveValue("Acme Corp");
  await expect(companies.nth(1)).toHaveValue("Globex");

  await page
    .getByRole("button", { name: "Move Experience role 1 down" })
    .click();
  await expect(companies.nth(0)).toHaveValue("Globex");
  await expect(companies.nth(1)).toHaveValue("Acme Corp");

  await save(page);
  await page.reload();

  const reloaded = page.getByRole("textbox", { name: "Company" });
  await expect(reloaded.nth(0)).toHaveValue("Globex");
  await expect(reloaded.nth(1)).toHaveValue("Acme Corp");
});

test("hiding an item persists, and a seeded hidden item stays editable", async ({
  page,
  seededResume,
}) => {
  await page.goto(`/resume/${seededResume.id}`);

  // The example's third Experience role ships `hidden: true` (tailored out, not
  // deleted). It must arrive hidden in the editor and still be a real, editable
  // entry - its Company field is on the page.
  await expect(
    page.getByRole("button", { name: "Show Experience role 3" }),
  ).toBeVisible();
  const companies = page.getByRole("textbox", { name: "Company" });
  await expect(companies).toHaveCount(3);
  await expect(companies.nth(2)).toHaveValue("Initech");

  // Hide the first role too; its toggle flips to "Show Experience role 1".
  await page.getByRole("button", { name: "Hide Experience role 1" }).click();
  await expect(
    page.getByRole("button", { name: "Show Experience role 1" }),
  ).toBeVisible();

  await save(page);
  await page.reload();

  // Both stay hidden across the reload, and the document still holds all three
  // entries - hiding never drops a node.
  await expect(
    page.getByRole("button", { name: "Show Experience role 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show Experience role 3" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Company" })).toHaveCount(3);
});
