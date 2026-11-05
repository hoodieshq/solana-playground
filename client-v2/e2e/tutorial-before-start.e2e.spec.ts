/* eslint-disable unicorn/no-null -- tutorial flow v2 predates this rule; cleanup tracked from SF#94 */
import type { Page } from "@playwright/test";

import { expect, LONG, stubAiStatus, stubSession, test } from "./fixtures";

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

// HOO-2571: a start word does what the Start step 1 button does
test("tutorial-conversation: A start word before Start", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tutorials/hello-anchor");
  await expect(
    chat(page).getByRole("button", { name: /Start step 1/ })
  ).toBeVisible(LONG);

  const box = chat(page).getByPlaceholder("Ask anything about this tutorial");
  await box.fill("Begin");
  await box.press("Enter");
  await expect(chat(page).getByText("Step 1 of 4")).toBeVisible(LONG);
});

// A model that only opens the menu and then writes nothing: the context still
// asks for the invitation, and the composer leaves the learner a next move
test("tutorial-conversation: The menu before Start", async ({ page }) => {
  test.setTimeout(120_000);
  const sse = (chunks: unknown[]) =>
    chunks
      .map((c) => `data: ${JSON.stringify(c)}`)
      .concat("data: [DONE]")
      .join("\n\n") + "\n\n";
  const sent: string[] = [];
  await stubSession(page);
  await stubAiStatus(page, "stub");
  await page.route("**/api/agent", (route) => {
    sent.push(route.request().postData() ?? "");
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body:
        sent.length === 1
          ? sse([
              {
                choices: [
                  {
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          id: "call_menu",
                          type: "function",
                          function: { name: "open_menu", arguments: "{}" },
                        },
                      ],
                    },
                  },
                ],
              },
              { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
            ])
          : sse([{ choices: [{ delta: {}, finish_reason: "stop" }] }]),
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tutorials/hello-anchor");
  const box = chat(page).getByPlaceholder("Ask anything about this tutorial");
  await expect(box).toBeVisible(LONG);
  await box.fill("show me the menu");
  await box.press("Enter");
  await expect(chat(page).getByText("Ready to start the lesson?")).toBeVisible(
    LONG
  );
  expect(sent[0]).toContain("press Start step 1 or type start");
  // The tool's own result asks for it too, on the request that follows it
  expect(sent[1]).toContain("The menu is open. They have not started");
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

// HOO-2649: below the frame's width the chat column sat in a vertical box,
// where its `shrink-0` kept it as tall as the feed, so after Start the
// composer fell under the fold. Phone (700): the pager's Chat; compact
// (900): the assistant's sheet
const openChat: Record<number, (page: Page) => Promise<void>> = {
  700: (page) =>
    page
      .getByRole("radiogroup", { name: "Show" })
      .getByRole("radio", {
        name: "Chat",
      })
      .click(LONG),
  900: (page) =>
    page.getByRole("button", { name: "Expand assistant" }).click(LONG),
};
for (const width of [700, 900]) {
  test(`the composer stays in the window at ${width}x800, before and after Start`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/tutorials/hello-anchor");
    await openChat[width](page);
    const start = chat(page).getByRole("button", { name: /Start step 1/ });
    await expect(start).toBeVisible(LONG);

    // Its placeholder changes after Start, its send key does not
    const box = chat(page).locator('textarea[enterkeyhint="send"]');
    const inWindow = async () => {
      const rect = await box.boundingBox();
      // No box (not rendered) reads as off the window
      const { y, height } = rect ?? { y: -1, height: 0 };
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + height).toBeLessThanOrEqual(800);
    };

    await inWindow();
    await start.click();
    await expect(chat(page).getByText("Step 1 of 4")).toBeVisible(LONG);
    await expect(async () => inWindow()).toPass(LONG);
    // The page itself does not scroll: the feed scrolls above the composer
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= window.innerHeight
      )
    ).toBe(true);
  });
}
