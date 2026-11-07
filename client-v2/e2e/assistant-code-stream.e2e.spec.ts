import type { Page } from "@playwright/test";

import {
  expect,
  LONG,
  startProject,
  stubAiStatus,
  stubSession,
  test,
} from "./fixtures";
import { DESK } from "./viewports";

/**
 * HOO-2694: a reply jumped while it streamed. A line that outgrows its code
 * block brings in the block's horizontal scrollbar, and the reply below it
 * moved down by the scrollbar's height.
 *
 * Headless Chromium hides scrollbars by default, which hid this jump from
 * every other spec; this one draws them, as a desktop browser does.
 */
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

/** The store the development build puts on `window` */
type ThreadWindow = Window & {
  __pgAssistant?: {
    threadId?: string | null;
    addUserMessage: (text: string) => void;
    startAssistantMessage: () => string;
    appendToAssistantMessage: (id: string, delta: string) => void;
    setStatus: (status: string) => void;
  };
};

const thread = (page: Page) => page.getByRole("log", { name: "Conversation" });

/** Streams `delta` into the reply `message` */
const append = (page: Page, chunk: { message: string; delta: string }) =>
  page.evaluate(
    ({ message, delta }) =>
      (window as ThreadWindow).__pgAssistant?.appendToAssistantMessage(
        message,
        delta
      ),
    chunk
  );

test("assistant-code-stream: A code block keeps its height while a line streams past its width", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await stubSession(page);
  await stubAiStatus(page, "z-ai/glm-5.3-flash:US");
  await page.setViewportSize(DESK);
  await page.goto("/");
  await startProject(page, "thread-code-stream", LONG);

  await expect
    .poll(
      () =>
        page.evaluate(() => !!(window as ThreadWindow).__pgAssistant?.threadId),
      LONG
    )
    .toBe(true);
  const message = await page.evaluate(() => {
    const store = (window as ThreadWindow).__pgAssistant;
    if (!store) throw new Error("Expected the assistant store on window");
    store.addUserMessage("Show me");
    store.setStatus("running");
    const id = store.startAssistantMessage();
    store.appendToAssistantMessage(id, 'Here:\n\n```rust\nlet x = "');
    return id;
  });

  const block = thread(page).locator("pre").first();
  await expect(block).toContainText("let x", LONG);
  // The block's own box, found and measured in one step: each token redraws
  // the highlighted `pre` inside it, so a `pre` found first may be gone by
  // the time it is measured
  const boxHeight = () =>
    page.evaluate(
      () =>
        document
          .querySelector('[role="log"] pre')
          ?.closest(".group")
          ?.getBoundingClientRect().height
    );
  const heights: number[] = [];
  // Short of the block's width, then well past it
  for (let chunk = 1; chunk <= 12; chunk++) {
    await append(page, { message, delta: "a".repeat(20) });
    await expect(block).toContainText("a".repeat(chunk * 20));
    heights.push((await boxHeight()) ?? 0);
  }

  expect(await block.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true
  );
  // The scrollbar is drawn, so the heights below can see the jump it caused
  expect(
    await block.evaluate((el) => el.offsetHeight - el.clientHeight)
  ).toBeGreaterThan(0);
  expect(heights).toEqual(heights.map(() => heights[0]));
});
