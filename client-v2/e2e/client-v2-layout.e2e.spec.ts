import type { Page } from "@playwright/test";

import { expect, seedWorkspace, test } from "./fixtures";

/**
 * Names of the telemetry events the page has logged so far.
 *
 * The dev server logs each event at `debug` from the `telemetry:event`
 * namespace, as `[telemetry:event] <name> {<params>}`.
 */
const eventsOn = (page: Page) => {
  const names: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.startsWith("[telemetry:event]")) names.push(text.split(" ")[1]);
  });
  return names;
};

/** The first event line with this name, params included */
const lineOf = (lines: string[], name: string) =>
  lines.find((line) => line.startsWith(`[telemetry:event] ${name} `));

const linesOn = (page: Page) => {
  const lines: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.startsWith("[telemetry:event]")) lines.push(text);
  });
  return lines;
};

const assistantPanel = (page: Page) => page.locator("#assistant[data-panel]");
const consoleHandle = (page: Page) =>
  page.getByRole("button", { name: "Console" });
// The separator that resizes the assistant is the one controlling the centre
const assistantHandle = (page: Page) =>
  page.locator('[data-slot="resizable-handle"][aria-controls="center"]');

const widthOf = (page: Page) =>
  assistantPanel(page).evaluate((el) => el.getBoundingClientRect().width);

test("client-v2-layout: A resized assistant and an open console", async ({
  seededPage: page,
}) => {
  const before = await widthOf(page);
  const box = (await assistantHandle(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const widened = await widthOf(page);
  expect(widened).toBeGreaterThan(before + 80);

  await consoleHandle(page).click();
  await expect(consoleHandle(page)).toHaveAttribute("aria-expanded", "true");

  await page.reload();
  await expect(consoleHandle(page)).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(async () => Math.abs((await widthOf(page)) - widened))
    .toBeLessThan(4);
});

test("client-v2-layout: An unreadable saved layout", async ({
  seededPage: page,
}) => {
  await page.evaluate(() => localStorage.setItem("layout", "{"));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Collapse project panel" })
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();
});

test("client-v2-layout: Folding the console", async ({ seededPage: page }) => {
  await consoleHandle(page).click();
  await page.locator(".xterm").click();
  await page.keyboard.type("echo-marker");
  await page.keyboard.press("Enter");
  await expect(page.locator(".xterm-rows")).toContainText("echo-marker");

  await consoleHandle(page).click();
  await expect(consoleHandle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".xterm")).toHaveCount(1);

  await consoleHandle(page).click();
  await expect(page.locator(".xterm-rows")).toContainText("echo-marker");
});

test("client-v2-layout: Folding the project panel", async ({
  seededPage: page,
}) => {
  const left = page.locator('[data-slot="sidebar-container"]');
  await expect(left).toHaveJSProperty("offsetWidth", 232);
  await page.keyboard.press("ControlOrMeta+b");
  await expect(left).toHaveJSProperty("offsetWidth", 52);
  await page.keyboard.press("ControlOrMeta+b");
  await expect(left).toHaveJSProperty("offsetWidth", 232);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("client-v2-layout: A phone", async ({ page }) => {
    // The project tree lives in a closed Sheet on a phone, which the fixture
    // waits on, so seed on a desktop-sized page and narrow it afterwards.
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedWorkspace(page);
    await page.setViewportSize({ width: 375, height: 812 });
    const events = eventsOn(page);
    const lines = page.locator(".monaco-editor .view-lines");
    await expect(lines).toContainText("use anchor_lang");
    const before = await lines.innerText();
    await page.locator(".monaco-editor textarea.inputarea").focus();
    await page.keyboard.type("zzz");
    await expect(
      page
        .locator(".monaco-editor .message")
        .getByText("Editing works on screens 600 px and wider")
    ).toBeVisible();
    expect(await lines.innerText()).toBe(before);
    expect(events).toContain("layout_readonly_edit_blocked");

    await page.getByRole("button", { name: "Expand assistant" }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    // A fresh profile has no backend, so the assistant opens on its picker; a
    // key of any value connects, as nothing is sent until a message is.
    await sheet.getByRole("textbox", { name: "API KEY" }).fill("e2e-key");
    await sheet.getByRole("button", { name: "Connect", exact: true }).click();
    const composer = sheet.getByRole("textbox", {
      name: "Message the assistant",
    });
    await composer.fill("hello");
    await expect(composer).toHaveValue("hello");
  });
});

test.describe("on a portrait iPad", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("client-v2-layout: A portrait iPad", async ({ seededPage: page }) => {
    const lines = page.locator(".monaco-editor .view-lines");
    await page.locator(".monaco-editor textarea.inputarea").focus();
    await page.keyboard.type("zzz");
    await expect(lines).toContainText("zzz");
  });
});

test("client-v2-layout: The classic parameter", async ({
  seededPage: page,
}) => {
  await page.goto("/?classic");
  await expect(consoleHandle(page)).toBeVisible();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(1);
});

test("client-v2-layout: Toggling the assistant by key", async ({
  seededPage: page,
}) => {
  const lines = linesOn(page);
  await page.keyboard.press("ControlOrMeta+r");
  await expect(
    page.getByRole("button", { name: "Expand assistant" })
  ).toBeVisible();
  const line = lineOf(lines, "layout_panel_toggled");
  expect(line).toContain("panel: assistant");
  expect(line).toContain("open: false");
  expect(line).toContain("via: key");
});

test("client-v2-layout: A corrupt saved layout is reported", async ({
  seededPage: page,
}) => {
  await page.evaluate(() => localStorage.setItem("layout", "{"));
  const lines = linesOn(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Collapse project panel" })
  ).toBeVisible();
  await expect.poll(() => lineOf(lines, "layout_restore_failed")).toBeTruthy();
  expect(lineOf(lines, "layout_restore_failed")).toContain("reason: corrupt");
});
