import { expect } from "@playwright/test";
import type { Route } from "@playwright/test";

import { LONG, seedWorkspace, test } from "./fixtures";

/**
 * The lazy `Monaco` component's chunk. The `monaco-editor` vendor chunk is
 * shared with the app shell and loads with the explorer, so holding it would
 * hold the whole page; this chunk is the editor's own mount.
 */
const MONACO_CHUNK = /\/static\/js\/[^/]*Editor_Monaco_index[^/]*\.js(\?|$)/;

test("client-v2-layout: A late editor mount leaves the new-file field focused", async ({
  page,
}) => {
  await seedWorkspace(page);

  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(MONACO_CHUNK, async (route: Route) => {
    requested = true;
    await held;
    await route.continue();
  });

  await page.reload();
  await expect(page.locator("#root-dir")).toBeVisible(LONG);
  await expect.poll(() => requested, LONG).toBe(true);
  await expect(page.locator(".monaco-editor")).toHaveCount(0);

  await page.getByRole("button", { name: "New file" }).click();
  const name = page.locator("#root-dir input");
  await expect(name).toBeFocused();
  await page.keyboard.type("late.rs");

  // The editor mounts only now, with the name already typed
  release();

  // The editor sets its model and then focuses in one handler, so once a
  // line of the current file is drawn the focus it would take is taken.
  await expect(page.locator(".monaco-editor .view-line").first()).toBeVisible(
    LONG
  );
  await expect(
    page.locator(".monaco-editor textarea.inputarea")
  ).not.toBeFocused();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("late.rs");
});

test("client-v2-layout: Opening a file with no tabs focuses the editor", async ({
  seededPage: page,
}) => {
  await expect(page.locator(".monaco-editor").first()).toBeVisible(LONG);

  const tabs = page.locator('#tabs [data-slot="editor-tab"][id^="/"]');
  for (let left = await tabs.count(); left > 0; left--) {
    const tab = tabs.first();
    await tab.hover({ force: true });
    await tab.locator("svg").last().click({ force: true });
    await expect(tabs).toHaveCount(left - 1);
  }
  await expect(page.locator(".monaco-editor")).toHaveCount(0);

  await page
    .locator("#root-dir")
    .getByText("lib.rs", { exact: true })
    .first()
    .click();
  await expect(page.locator(".monaco-editor textarea.inputarea")).toBeFocused(
    LONG
  );
});

test("client-v2-layout: Creating a file with a tab open focuses the editor", async ({
  seededPage: page,
}) => {
  await expect(page.locator(".monaco-editor").first()).toBeVisible(LONG);

  await page.getByRole("button", { name: "New file" }).click();
  const name = page.locator("#root-dir input");
  await expect(name).toBeFocused();
  await page.keyboard.type("x.rs");
  await page.keyboard.press("Enter");

  await expect(name).toHaveCount(0);
  await expect(page.locator(".monaco-editor textarea.inputarea")).toBeFocused(
    LONG
  );
});

test("client-v2-layout: Creating a file with no tabs focuses the editor", async ({
  seededPage: page,
}) => {
  await expect(page.locator(".monaco-editor").first()).toBeVisible(LONG);

  const tabs = page.locator('#tabs [data-slot="editor-tab"][id^="/"]');
  for (let left = await tabs.count(); left > 0; left--) {
    const tab = tabs.first();
    await tab.hover({ force: true });
    await tab.getByRole("button", { name: /^Close / }).click({ force: true });
    await expect(tabs).toHaveCount(left - 1);
  }
  await expect(page.locator(".monaco-editor")).toHaveCount(0);

  await page.getByRole("button", { name: "New file" }).click();
  const name = page.locator("#root-dir input");
  await expect(name).toBeFocused();
  await page.keyboard.type("y.rs");
  await page.keyboard.press("Enter");

  await expect(name).toHaveCount(0);
  await expect(page.locator(".monaco-editor textarea.inputarea")).toBeFocused(
    LONG
  );
});
