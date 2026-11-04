import type { Page } from "@playwright/test";

import { expect, LONG, test } from "./fixtures";

/** The stage tabs; on a narrow window they carry their key, so by prefix */
const stageTab = (page: Page, name: string) =>
  page.getByRole("tab", { name: new RegExp(`^${name}`) });

/** Ctrl+2 is Build's key wherever the stage bar is mounted */
const pressBuildKey = async (page: Page) => {
  // Off any field, where the key would be typed rather than bound
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Control+2");
};

const notFound = (page: Page) => page.getByText("Current workspace not found");
const chat = (page: Page) =>
  page.getByRole("complementary", { name: "Tutorial chat" });

/** No stage tab, and Build's key reaches none */
const noStage = async (page: Page) => {
  await expect(stageTab(page, "Build")).toHaveCount(0);
  await pressBuildKey(page);
  await expect(stageTab(page, "Build")).toHaveCount(0);
  await expect(notFound(page)).toHaveCount(0);
};

test.beforeEach(async ({ page }) => {
  // No default backend, whatever the dev server is configured with
  await page.route("**/api/agent", (route) =>
    route.fulfill({ json: { configured: false, model: null } })
  );
});

// HOO-2365: the intro's only action is Start (Almaz's prototype, SPEC 9.2).
// A stage reached before it built a project that did not exist yet

test("no stage before Hello Anchor's Start, in the frame", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tutorials/hello-anchor");
  const start = chat(page).getByRole("button", { name: /Start step 1/ });
  await expect(start).toBeVisible(LONG);

  await noStage(page);
  // The frame draws no stage tabs at all; its workspace is the stage
  await start.click();
  await expect(chat(page).getByText("Step 1 of 4")).toBeVisible(LONG);
  await expect(notFound(page)).toHaveCount(0);
});

test("no stage before Hello Anchor's Start, under the frame's width", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto("/tutorials/hello-anchor");
  await expect(page.locator(".monaco-editor .view-lines")).toContainText(
    "msg!",
    LONG
  );

  await noStage(page);

  // The conversation is in the chat column here; Start brings the stages
  await page.getByRole("button", { name: "Expand assistant" }).click();
  await chat(page)
    .getByRole("button", { name: /Start step 1/ })
    .click(LONG);
  await expect(stageTab(page, "Build")).toBeVisible(LONG);
  await page.keyboard.press("Escape");
  await pressBuildKey(page);
  await expect(stageTab(page, "Build")).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("no stage before an upstream tutorial's Start", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tutorials/hello-seahorse");
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeVisible(LONG);

  await noStage(page);

  // Its Start makes the project, and the stages come with it
  await start.click();
  await expect(stageTab(page, "Build")).toBeVisible(LONG);
});
