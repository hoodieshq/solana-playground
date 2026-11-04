import type { Page } from "@playwright/test";

import { LONG, expect, home, test } from "./fixtures";

const chat = (page: Page) =>
  page.getByRole("complementary", { name: "Tutorial chat" });

test.beforeEach(async ({ page }) => {
  // No default backend, whatever the dev server is configured with
  await page.route("**/api/agent", (route) =>
    route.fulfill({ json: { configured: false, model: null } })
  );
  await page.route("**/build", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ stderr: "", uuid: "e2e-build", idl: null }),
    })
  );
});

// HOO-2593: a new user's first path. Every test runs in a fresh browser
// context, so no workspace was ever selected before the gallery opens the
// tutorial
test("Build in Hello Anchor opened from the gallery in a fresh profile", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await expect(home(page)).toBeVisible(LONG);
  // The navigation's item, which opens the gallery
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Open Hello Anchor" }).click();
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor/, LONG);

  await chat(page)
    .getByRole("button", { name: /Start step 1/ })
    .click(LONG);
  await chat(page)
    .getByText('msg!("Hello, World!");', { exact: true })
    .first()
    .click(LONG);
  await chat(page)
    .getByRole("button", { name: /^Build/ })
    .last()
    .click(LONG);

  // The build reached the server and came back: the explorer had a workspace
  await expect(
    chat(page).getByRole("status").filter({ hasText: "Build successful" })
  ).toBeVisible(LONG);
  await expect(page.getByText("Current workspace not found")).toHaveCount(0);
  expect(errors).toEqual([]);
});
