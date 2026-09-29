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

type WriteBody = {
  files?: Record<string, string>;
  changed?: Record<string, string>;
  removed?: string[];
};

/**
 * What `/api/projects` stores for a write: the whole file set, or a patch on
 * what it already holds. Route stubs use it so a patch does not quietly
 * become a project holding only the files that changed.
 */
export const applyWrite = (
  held: { files: Record<string, string> } | undefined,
  body: WriteBody
) => {
  const files = body.files
    ? { ...body.files }
    : { ...(held?.files ?? {}), ...(body.changed ?? {}) };
  for (const path of body.removed ?? []) delete files[path];
  return { files };
};

export { expect };
