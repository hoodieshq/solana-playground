import type { Page } from "@playwright/test";

import { LONG, expect, test } from "./fixtures";

/** The stage tabs; on a narrow window they carry their key, so by prefix */
const stageTab = (page: Page, name: string) =>
  page.getByRole("tab", { name: new RegExp(`^${name}`) });

/** Ctrl+2 is Build's key wherever the stage bar is mounted */
const pressBuildKey = async (page: Page) => {
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+2");
};

const notFound = (page: Page) => page.getByText("Current workspace not found");

test.beforeEach(async ({ page }) => {
  // No default backend, whatever the dev server is configured with
  await page.route("**/api/agent", (route) =>
    route.fulfill({ json: { configured: false, model: null } })
  );
});

// HOO-2365: the intro's only action is Start (prototype SPEC 9.2). A stage
// reached before it built a project that did not exist yet

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

  await expect(stageTab(page, "Build")).toHaveCount(0);
  await pressBuildKey(page);
  await expect(stageTab(page, "Build")).toHaveCount(0);
  await expect(notFound(page)).toHaveCount(0);

  // The conversation is in the chat column here; Start brings the stages
  await page.getByRole("button", { name: "Expand assistant" }).click();
  const chat = page.getByRole("complementary", { name: "Tutorial chat" });
  await chat.getByRole("button", { name: /Start step 1/ }).click(LONG);
  await expect(stageTab(page, "Build")).toBeVisible(LONG);
});

test("no stage before an upstream tutorial's Start", async ({ page }) => {
  await page.goto("/tutorials/hello-seahorse");
  await expect(
    page.getByRole("button", { name: "Start", exact: true })
  ).toBeVisible(LONG);

  await expect(stageTab(page, "Build")).toHaveCount(0);
  await pressBuildKey(page);
  await expect(stageTab(page, "Build")).toHaveCount(0);
  await expect(notFound(page)).toHaveCount(0);
});
