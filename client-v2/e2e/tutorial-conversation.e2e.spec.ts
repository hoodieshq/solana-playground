import type { Page } from "@playwright/test";

import { LONG, expect, test } from "./fixtures";

const chat = (page: Page) =>
  page.getByRole("complementary", { name: "Tutorial chat" });
const feed = (page: Page) => chat(page).getByRole("log");
const editor = (page: Page) => page.locator(".monaco-editor .view-lines");
/** Step 1's heading in the feed: its objective */
const stepOne = (page: Page) =>
  feed(page).getByRole("heading", {
    name: "Define the hello instruction and log a message",
  });

test.beforeEach(async ({ page }) => {
  // No default backend, whatever the dev server is configured with
  await page.route("**/api/agent", (route) =>
    route.fulfill({ json: { configured: false, model: null } })
  );
});

test("tutorial-conversation: Starting Hello Anchor", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tutorials/hello-anchor");

  // The intro card, with the finished program in the workspace
  const intro = feed(page).getByRole("region", { name: "Hello Anchor" });
  await expect(intro).toBeVisible(LONG);
  await expect(intro.getByText("What you'll build")).toBeVisible();
  await expect(editor(page)).toContainText("msg!", LONG);

  await intro.getByRole("button", { name: /Start step 1/ }).click();

  // The intro leaves the feed, step 1's heading arrives, and lib.rs opens on
  // step 1's start: empty, then the import and the id the step writes first
  await expect(stepOne(page)).toBeVisible(LONG);
  await expect(intro).toHaveCount(0);
  await expect(editor(page)).toContainText("declare_id!", LONG);
  await expect(editor(page)).not.toContainText("msg!");
  // The step's turns keep arriving on their own, up to its first question
  await expect(
    feed(page).getByRole("button", { name: "Hint", exact: true })
  ).toBeVisible(LONG);
  await expect(
    chat(page)
      .getByRole("navigation", { name: "Tutorial steps" })
      .getByRole("button", { name: /^Step 1 of 4, .*, current$/ })
  ).toHaveAttribute("aria-current", "step");
});

test("a reload opens on the step it left, with no intro", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tutorials/hello-anchor");
  await feed(page)
    .getByRole("button", { name: /Start step 1/ })
    .click(LONG);
  await expect(stepOne(page)).toBeVisible(LONG);

  await page.reload();
  await expect(stepOne(page)).toBeVisible(LONG);
  await expect(
    feed(page).getByRole("button", { name: /Start step 1/ })
  ).toHaveCount(0);
});
