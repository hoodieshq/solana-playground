import { expect, test } from "./fixtures";

/**
 * Collapsing the Flow left panel to a rail and back.
 *
 * The rail's "+" is the one worth a browser: it expands the panel and then
 * waits for the explorer tree to mount before creating, and that hand-off has
 * no unit-testable seam.
 */

const OPEN_PX = 232; // 14.5rem
const RAIL_PX = 24; // 1.5rem

const panel = (page: import("@playwright/test").Page) =>
  page.locator("aside").first();

test("cmd+b toggles the left panel", async ({ seededPage: page }) => {
  await expect(panel(page)).toHaveJSProperty("offsetWidth", OPEN_PX);

  await page.keyboard.press("Meta+b");
  await expect(panel(page)).toHaveJSProperty("offsetWidth", RAIL_PX);

  await page.keyboard.press("Meta+b");
  await expect(panel(page)).toHaveJSProperty("offsetWidth", OPEN_PX);
});

test("the chevron toggles the panel and the hint survives collapse", async ({
  seededPage: page,
}) => {
  const collapse = page.getByRole("button", { name: "Collapse project panel" });
  const expand = page.getByRole("button", { name: "Expand project panel" });

  await collapse.click();
  await expect(panel(page)).toHaveJSProperty("offsetWidth", RAIL_PX);
  // Collapsed, this hint is the only affordance saying how to get the panel
  // back, so losing it is a real regression rather than a cosmetic one.
  await expect(expand).toContainText("⌘B");

  await expand.click();
  await expect(panel(page)).toHaveJSProperty("offsetWidth", OPEN_PX);
  await expect(collapse).toContainText("⌘B");
});

test("the rail's + expands the panel and opens the new-file input", async ({
  seededPage: page,
}) => {
  await page.keyboard.press("Meta+b");
  await expect(panel(page)).toHaveJSProperty("offsetWidth", RAIL_PX);

  // Only the rail's "+" exists while collapsed; the footer button is unmounted.
  await page.getByRole("button", { name: "New file" }).click();

  await expect(panel(page)).toHaveJSProperty("offsetWidth", OPEN_PX);
  const input = page.locator("#root-dir input");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
});
