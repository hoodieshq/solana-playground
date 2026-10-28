import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Page } from "@playwright/test";
import { expect, json, LONG, startProject, stubSession, test } from "./fixtures";

/**
 * Spike HOO-2293, never merged: does the thread stay on the agent's reply
 * while it streams and while a tool runs. A local server streams the turn
 * chunk by chunk, so the thread grows inside one item the way a real reply
 * does; `route.fulfill` would hand it over in one piece.
 */

const DEFAULT_MODEL = "z-ai/glm-5.3-flash:US";
const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const text = (t: string) => sse({ choices: [{ delta: { content: t } }] });
const toolCall = (id: string, name: string, args: unknown) =>
  sse({
    choices: [
      {
        delta: {
          tool_calls: [
            {
              index: 0,
              id,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  }) + sse({ choices: [{ delta: {}, finish_reason: "tool_calls" }] });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Turn = (res: http.ServerResponse) => Promise<void>;

const lines = (n: number, delay: number, tag: string): Turn => async (res) => {
  for (let i = 1; i <= n; i++) {
    res.write(text(`${tag} line ${i} of ${n}.\n\n`));
    if (delay) await sleep(delay);
  }
  res.write("data: [DONE]\n\n");
  res.end();
};

/** Serves queued turns in order, streamed */
const startServer = async (turns: Turn[]) => {
  const server = http.createServer(async (req, res) => {
    req.resume();
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "access-control-allow-origin": "*",
    });
    const turn = turns.shift() ?? lines(1, 0, "extra");
    await turn(res);
  });
  await new Promise<void>((r) => server.listen(0, r));
  return { server, port: (server.address() as AddressInfo).port };
};

const input = (page: Page) =>
  page.getByRole("textbox", { name: "Message the assistant" });
const VARIANT = process.env.SPIKE_SCROLLER ?? "now";
/** The scrolling element: the parent of the "Conversation" content in every variant */
const viewport = (page: Page) =>
  page.locator('[aria-label="Conversation"]').locator("xpath=..");

/** Pixels between the bottom of the viewport and the end of the thread */
const gap = (page: Page) =>
  viewport(page).evaluate((el) =>
    Math.round(el.scrollHeight - el.scrollTop - el.clientHeight)
  );

/** Samples the gap every 50 ms until `done` resolves */
const sampleWhile = async (page: Page, done: Promise<unknown>) => {
  const samples: number[] = [];
  let finished = false;
  done.then(() => (finished = true));
  while (!finished) {
    samples.push(await gap(page));
    await sleep(50);
  }
  await sleep(400);
  samples.push(await gap(page));
  return samples;
};

const setup = async (page: Page, turns: Turn[], name: string) => {
  const { server, port } = await startServer(turns);
  await stubSession(page);
  await page.route("**/api/agent", (route) => {
    if (route.request().method() === "GET")
      return json(route, { configured: true, model: DEFAULT_MODEL });
    return route.continue({ url: `http://localhost:${port}/` });
  });
  await page.addInitScript(
    (v) => localStorage.setItem("spikeScroller", v),
    VARIANT
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startProject(page, name, LONG);
  await expect(input(page)).toBeVisible(LONG);
  return server;
};

const send = async (page: Page, message: string) => {
  await input(page).fill(message);
  await input(page).press("Enter");
};

const idle = (page: Page) =>
  expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible(
    LONG
  );

const report = (label: string, samples: number[]) =>
  console.log(
    `[spike:${VARIANT}] ${label}: max gap ${Math.max(...samples)} px, final ${samples.at(
      -1
    )} px, samples ${samples.length}: ${samples.join(",")}`
  );

test.describe.configure({ mode: "serial" });
test.use({ video: process.env.SPIKE_VIDEO ? { mode: "on", size: { width: 1280, height: 720 } } : "off" });

test("spike: streaming reply while the reader is at the end", async ({
  page,
}) => {
  const server = await setup(
    page,
    [lines(30, 0, "history"), lines(60, 60, "stream")],
    "spike-stream"
  );
  await send(page, "Fill the thread");
  await idle(page);
  await send(page, "Stream a long reply");
  const samples = await sampleWhile(page, idle(page));
  report("at end, streaming", samples);
  await expect(page.getByText("stream line 60 of 60.")).toBeInViewport();
  server.close();
});

test("spike: tool call, then streamed reply", async ({ page }) => {
  const server = await setup(
    page,
    [
      lines(30, 0, "history"),
      async (res) => {
        res.write(text("Let me look at the files.\n\n"));
        await sleep(300);
        res.write(toolCall("call_1", "list_files", {}));
        res.write("data: [DONE]\n\n");
        res.end();
      },
      lines(40, 60, "after-tool"),
    ],
    "spike-tool"
  );
  await send(page, "Fill the thread");
  await idle(page);
  await send(page, "Use a tool");
  const samples = await sampleWhile(page, idle(page));
  report("tool then stream", samples);
  await expect(page.getByText("after-tool line 40 of 40.")).toBeInViewport();
  server.close();
});

test("spike: reader scrolled up, then sends", async ({ page }) => {
  const server = await setup(
    page,
    [lines(30, 0, "history"), lines(30, 60, "stream")],
    "spike-scrolled-up"
  );
  await send(page, "Fill the thread");
  await idle(page);
  await viewport(page).hover();
  // Wheel until the reader is really up: a wheel during a follow can be undone
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, -300);
      await sleep(200);
      return gap(page);
    })
    .toBeGreaterThan(200);
  console.log(`[spike:${VARIANT}] scrolled up by wheel, gap ${await gap(page)} px`);
  await send(page, "Stream after scrolling up");
  const samples = await sampleWhile(page, idle(page));
  report("scrolled up, then sent", samples);
  const visible = await page
    .getByText("stream line 30 of 30.")
    .isVisible()
    .then(async () =>
      page
        .getByText("stream line 30 of 30.")
        .evaluate((el) => {
          const v = document
            .querySelector('[aria-label="Conversation"]')!.parentElement!
            .getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return r.top < v.bottom && r.bottom > v.top;
        })
    );
  console.log(`[spike:${VARIANT}] last reply line in view: ${visible}`);
  server.close();
});
