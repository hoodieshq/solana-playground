import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * A browser with one project already created.
 *
 * On a fresh profile the Flow canvas has no workspace, so it opens the
 * "What do you want to build?" gallery over everything and that modal
 * intercepts pointer events -- any test that clicks the canvas needs a
 * project first.
 *
 * Seeds through the gallery's own "Start from scratch" row rather than
 * writing to `indexedDB`: the explorer's on-disk layout is an internal
 * detail, and the default framework files are bundled, so this needs no
 * network.
 */
export const seedWorkspace = async (page: Page, name = "e2e-project") => {
  await page.goto("/");

  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible();

  await gallery.getByLabel("Project name").fill(name);
  await gallery.getByRole("button", { name: /^Start/ }).click();

  // `PgExplorer.createWorkspace` closes the modal, then the explorer
  // re-initializes -- wait for the tree, not just the modal.
  await expect(gallery).toBeHidden();
  await expect(page.locator("#root-dir")).toBeVisible();
};

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, use) => {
    await seedWorkspace(page);
    await use(page);
  },
});

export { expect };
