import { expect, test } from "@playwright/test";

/**
 * D16: opening a tutorial that has never been started, while a real
 * project is the active workspace, used to throw
 * `Current tutorial has not been set` or bounce back to `/`. An
 * already-started tutorial always worked, so the regression only shows
 * on a first open.
 */
test("opens an unstarted tutorial from an active project", async ({ page }) => {
  // Booting the dev server, creating a project and importing a tutorial
  // is well past the 30s default.
  test.setTimeout(120_000);

  await page.goto("/");

  // The gallery opens by itself when there are no workspaces. It has no
  // `role="dialog"` -- `components/Modal` renders plain divs -- so anchor
  // on its title text instead.
  const gallery = page.getByText("What do you want to build?");
  await expect(gallery).toBeVisible();

  // Make a real project the active workspace first -- D16 only shows up
  // when a project is already active, not on the very first, empty-state
  // open (`views/flow/gallery/StartFromScratch.tsx`: default framework,
  // default name, "Start").
  await page.getByRole("button", { name: "Start →" }).click();
  await expect(gallery).toHaveCount(0);

  // Reopen the gallery from the header's project switcher
  // (`views/flow/header/ProjectSwitcher.tsx`) now that a project is active.
  await page.locator('button[aria-haspopup="dialog"]').click();
  await expect(gallery).toBeVisible();

  await page.getByRole("tab", { name: /tutorials/i }).click();

  // The tutorial card's title has no click handler of its own; only the
  // "Open" button inside the same card does
  // (`views/flow/gallery/TutorialsTab.tsx`). Scope to that card by walking
  // up from the title text: `Title` -> `Body` -> `Card`.
  const card = page
    .getByText("Hello Anchor", { exact: true })
    .locator("xpath=../..");
  await card.getByRole("button", { name: "Open" }).click();

  // The tutorial's own editor must appear, and the app must not have
  // fallen back to the home route.
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor/);
  await expect(page.getByText("Current tutorial has not been set")).toHaveCount(
    0
  );
});
