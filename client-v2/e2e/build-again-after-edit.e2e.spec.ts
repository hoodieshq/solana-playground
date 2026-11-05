import type { Page } from "@playwright/test";

import { expect, LONG, test } from "./fixtures";

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
  page.locator("button:visible", { hasText: name });

const expectLeader = async (page: Page, lead: string, other: string) => {
  await expect(button(page, lead)).toHaveAttribute(
    "data-slot",
    "brand-button",
    LONG
  );
  await expect(button(page, other)).toHaveAttribute("data-variant", "outline");
};

test.describe("Build again after an edit", () => {
  test("leads Build succeeded once the code changed, until a rebuild", async ({
    seededPage: page,
  }) => {
    test.setTimeout(120_000);
    const builds = await answerBuilds(page);

    await page.locator("#flow-stage-tab-build").click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await expectLeader(page, "Continue to Deploy", "Build again");
    await expect(page.getByText(CHANGED)).toHaveCount(0);

    await page.locator(".monaco-editor .view-lines").first().click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type("\n// an edit after the build");
    await expectLeader(page, "Build again", "Continue to Deploy");
    await expect(page.getByText(CHANGED)).toBeVisible();

    await button(page, "Build again").click();
    await expect.poll(() => builds.length).toBe(2);
    await expectLeader(page, "Continue to Deploy", "Build again");
    await expect(page.getByText(CHANGED)).toHaveCount(0);
  });
});
