import { expect, test } from "./fixtures";

/**
 * The scenarios of `client-v2-controls`: the stepper, a radio group and a
 * select, by pointer and by keyboard.
 */

/** What rustc prints for one type error, as the build server returns it */
const FAILED_BUILD_STDERR = [
  "error[E0308]: mismatched types",
  " --> src/lib.rs:5:9",
  "  |",
  '5 |     let x: u32 = "no";',
  "  |            ---   ^^^^ expected `u32`, found `&str`",
  "",
  "error: could not compile `e2e-project` (lib) due to 1 previous error",
].join("\n");

test.describe("client-v2-controls", () => {
  test("client-v2-controls: The stepper drives the stages", async ({
    seededPage: page,
  }) => {
    await page.locator("#flow-stage-tab-build").click();
    await expect(page.locator("#flow-stage-tab-build")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator("#flow-stage-panel-build")).toBeVisible();

    await page.locator("#flow-stage-tab-build").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#flow-stage-tab-deploy")).toBeFocused();
  });

  test("client-v2-controls: A failed build says so", async ({
    seededPage: page,
  }) => {
    // CI has no build server: the request is answered here, so the test
    // never leaves the browser
    await page.route("**/build", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          stderr: FAILED_BUILD_STDERR,
          uuid: null,
          idl: null,
        }),
      })
    );

    await page.locator("#flow-stage-tab-build").click();
    await page
      .locator("#flow-stage-panel-build")
      .getByRole("button", { name: /^Build$/ })
      .click();

    await expect(page.locator("#flow-stage-tab-build")).toHaveAttribute(
      "aria-label",
      /^Build: failed, \d+ errors?/
    );
  });

  test("client-v2-controls: Network by keyboard", async ({
    seededPage: page,
  }) => {
    await page.locator("[data-settings-trigger]").first().click();
    const group = page.getByRole("radiogroup", { name: "Network" });
    await group.getByRole("radio", { checked: true }).focus();
    const before = await group
      .getByRole("radio", { checked: true })
      .textContent();

    await page.keyboard.press("ArrowRight");

    const after = group.getByRole("radio", { checked: true });
    await expect(after).not.toHaveText(before!);
    await expect(after).toBeFocused();
  });

  test("client-v2-controls: A setting select", async ({ seededPage: page }) => {
    await page.locator("[data-settings-trigger]").first().click();
    const row = page
      .locator('[aria-label="Settings"]')
      .locator("span", { hasText: /^Theme$/ })
      .locator("xpath=../..");
    await row.getByRole("combobox").focus();
    await page.keyboard.press("ArrowDown");

    const light = page.getByRole("option", { name: "Light", exact: true });
    await expect(light).toBeVisible();
    // The options sit above the settings panel, not under it
    const onTop = await light.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2
      );
      return hit !== null && el.contains(hit);
    });
    expect(onTop).toBe(true);

    await light.click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(false);
  });
});
