import type { Page } from "@playwright/test";

import { expect, LONG, seedWorkspace, test } from "./fixtures";
import { DESK, PHONE, TABLET, WIDE_DESK } from "./viewports";

/**
 * A load raises no ResizeObserver loop notice. The browser raises one when an
 * observer's callback resizes what it observes within the same frame;
 * `installGlobalHandlers` drops the notice before it reaches Sentry, so a loop
 * added later would show nowhere but here. Counted before the app's own
 * handler runs, so the filter cannot hide it.
 */

const NOTICE = "ResizeObserver loop";

const countNotices = (page: Page) =>
  page.addInitScript((notice) => {
    const w = window as unknown as { roNotices: number };
    w.roNotices = 0;
    window.addEventListener(
      "error",
      (event) => {
        if (event.message.includes(notice)) w.roNotices++;
      },
      true
    );
  }, NOTICE);

const noticesOf = (page: Page) =>
  page.evaluate(() => (window as unknown as { roNotices: number }).roNotices);

/** Long enough for late layout: fonts, the lazy editor, the panels settling */
const settle = (page: Page) => page.waitForTimeout(3_000);

for (const [name, viewport] of Object.entries({
  PHONE,
  TABLET,
  DESK,
  WIDE_DESK,
})) {
  test.describe(name, () => {
    test.use({ viewport });

    test("loading Home, then a project, raises no ResizeObserver loop notice", async ({
      page,
    }) => {
      await countNotices(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible(LONG);
      await settle(page);
      expect(await noticesOf(page)).toBe(0);

      // Home has no "New project" tile on a phone, so the project is made on
      // a desk and the width set before the load that counts
      await page.setViewportSize(DESK);
      await seedWorkspace(page);
      await page.setViewportSize(viewport);

      // A fresh load straight into the project, the case the notice was
      // first seen on
      await page.reload();
      await expect(page.locator("#flow-stage-tab-build")).toBeVisible(LONG);
      await settle(page);
      expect(await noticesOf(page)).toBe(0);
    });
  });
}
