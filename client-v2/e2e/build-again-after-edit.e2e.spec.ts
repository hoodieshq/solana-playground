import type { Page } from "@playwright/test";

import { expect, LONG, openFiles, test } from "./fixtures";

const CHANGED =
  "Your code changed after the last build. Build again before you deploy.";

/** Every build answered with success, counted */
const answerBuilds = async (page: Page) => {
  const builds: string[] = [];
  await page.route("**/build", (route) => {
    builds.push(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      // eslint-disable-next-line unicorn/no-null -- the stubbed build response is wire JSON, where `null` means no IDL
      body: JSON.stringify({ stderr: "", uuid: "e2e-build", idl: null }),
    });
  });
  return builds;
};

const button = (page: Page, name: string) =>
  page.locator("#flow-stage-panel-build").getByRole("button", { name });

const expectLeader = async (page: Page, lead: string, other: string) => {
  await expect(button(page, lead)).toHaveAttribute(
    "data-slot",
    "brand-button",
    LONG
  );
  await expect(button(page, other)).toHaveAttribute("data-variant", "outline");
};

const builtPage = async (page: Page) => {
  const builds = await answerBuilds(page);
  await page.locator("#flow-stage-tab-build").click();
  await page
    .locator("#flow-stage-panel-build")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expectLeader(page, "Continue to Deploy", "Build again");
  await expect(page.getByText(CHANGED)).toHaveCount(0);
  return builds;
};

const edit = async (page: Page, keys: () => Promise<void>) => {
  await page.locator(".monaco-editor .view-lines").first().click();
  await page.keyboard.press("ControlOrMeta+End");
  await keys();
};

const typeEdit = (page: Page) =>
  edit(page, () => page.keyboard.type("\n// an edit after the build"));

test.describe("Build succeeded after an edit", () => {
  test.setTimeout(120_000);

  test("client-v2-program-build: The code changed after the build", async ({
    seededPage: page,
  }) => {
    await builtPage(page);

    await typeEdit(page);
    await expectLeader(page, "Build again", "Continue to Deploy");
    await expect(page.getByText(CHANGED)).toBeVisible();

    await button(page, "Continue to Deploy").click();
    await expect(page.locator("#flow-stage-panel-deploy")).toBeVisible();
  });

  test("client-v2-program-build: A rename is not a change", async ({
    seededPage: page,
  }) => {
    await builtPage(page);

    await openFiles(page);
    await page
      .locator('#root-dir [data-path$="/src/lib.rs"]')
      .click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Rename/ }).click();
    const rename = page.getByRole("dialog", { name: "Rename 'lib.rs'" });
    await rename.getByRole("textbox").fill("renamed.rs");
    await rename.getByRole("button", { name: "Rename" }).click();
    await expect(
      page.locator('#root-dir [data-path$="/src/renamed.rs"]')
    ).toBeVisible();

    await expectLeader(page, "Continue to Deploy", "Build again");
    await expect(page.getByText(CHANGED)).toHaveCount(0);
  });

  test("client-v2-program-build: An undone edit is not a change", async ({
    seededPage: page,
  }) => {
    await builtPage(page);

    await edit(page, () => page.keyboard.type("x"));
    await expectLeader(page, "Build again", "Continue to Deploy");

    await page.keyboard.press("Backspace");
    await expectLeader(page, "Continue to Deploy", "Build again");
  });

  test("client-v2-program-build: A rebuild settles it", async ({
    seededPage: page,
  }) => {
    const builds = await builtPage(page);

    await typeEdit(page);
    await expectLeader(page, "Build again", "Continue to Deploy");

    await button(page, "Build again").click();
    await expect.poll(() => builds.length).toBe(2);
    await expectLeader(page, "Continue to Deploy", "Build again");
    await expect(page.getByText(CHANGED)).toHaveCount(0);
  });
});
