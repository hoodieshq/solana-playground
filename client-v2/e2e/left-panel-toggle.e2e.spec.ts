import { expect, test } from "@playwright/test";

/**
 * Cmd/Ctrl+B collapses the Flow left panel to a rail and back.
 *
 * Keyboard only: on a cold profile the empty-workspace gallery is open and
 * intercepts pointer events, so covering the chevron and the rail's "+"
 * would need a seeded workspace fixture that does not exist yet. The keybind
 * is unaffected by the overlay.
 */

const OPEN_PX = 232; // 14.5rem
const RAIL_PX = 24; // 1.5rem

test("cmd+b toggles the left panel", async ({ page }) => {
  await page.goto("/");

  const panel = page.locator("aside").first();
  await expect(panel).toHaveJSProperty("offsetWidth", OPEN_PX);

  await page.keyboard.press("Meta+b");
  await expect(panel).toHaveJSProperty("offsetWidth", RAIL_PX);

  await page.keyboard.press("Meta+b");
  await expect(panel).toHaveJSProperty("offsetWidth", OPEN_PX);
});
