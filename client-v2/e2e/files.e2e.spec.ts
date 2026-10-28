import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { LONG, test } from "./fixtures";

/** Closes every editor tab by its own close button */
const closeEveryTab = async (page: Page) => {
  const close = page.locator("#tabs").getByRole("button", { name: /^Close / });
  await expect(close.first()).toBeVisible(LONG);
  for (let open = await close.count(); open > 0; open--) {
    await close.first().click();
    await expect(close).toHaveCount(open - 1);
  }
};

test("client-v2-files: Closing the last tab", async ({ seededPage: page }) => {
  await closeEveryTab(page);

  await expect(
    page.getByRole("heading", { name: "No file open" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Show files" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resources" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tutorials" })).toHaveCount(0);
});

test("client-v2-files: Show files with the column folded", async ({
  seededPage: page,
}) => {
  await closeEveryTab(page);
  await page.getByRole("button", { name: "Hide files" }).click();
  await expect(page.locator("#root-dir")).toBeHidden();

  await page.getByRole("button", { name: "Show files" }).click();

  await expect(page.locator("#root-dir")).toBeVisible();
});
