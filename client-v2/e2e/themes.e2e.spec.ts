import { expect, type Page } from "@playwright/test";

import { test } from "./fixtures";

/** The computed style property of the first element matching `selector` */
const computed = (
  page: Page,
  selector: string,
  prop: "color" | "backgroundColor"
) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el)[p], prop);

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

/** The theme select in the Settings panel, opened */
const openThemeSelect = async (page: Page) => {
  await page.locator("[data-settings-trigger]").first().click();
  const row = page
    .locator('[aria-label="Settings"]')
    .locator("span", { hasText: /^Theme$/ })
    .locator("xpath=../..");
  await row.getByRole("combobox").focus();
  await page.keyboard.press("ArrowDown");
};

const pickTheme = async (page: Page, name: "Dark" | "Light") => {
  await openThemeSelect(page);
  await page.getByRole("option", { name, exact: true }).click();
};

/** Open the console drawer and run `help`, so the terminal holds output */
const runHelp = async (page: Page) => {
  const drawer = page.getByRole("button", { name: "Console", exact: true });
  if ((await drawer.getAttribute("aria-expanded")) !== "true") {
    await drawer.click();
  }
  await page.getByLabel("Terminal input").first().click();
  await page.keyboard.type("help");
  await page.keyboard.press("Enter");
  const terminal = page.locator(".xterm-rows").first();
  await expect(terminal).toContainText("rustfmt");
  return terminal;
};

const EDITOR_TEXT = ".monaco-editor .view-lines";
const TERMINAL_TEXT = ".xterm-rows";

/** Effects run a second after mount; wait past that before asserting none */
const EFFECTS_SETTLE_MS = 2500;

test.describe("client-v2-themes", () => {
  // The product does not follow the OS: a light OS still starts on Dark
  test.use({ colorScheme: "light" });

  test("client-v2-themes: First visit", async ({ seededPage: page }) => {
    await expect.poll(() => isDark(page)).toBe(true);

    await openThemeSelect(page);
    await expect(page.getByRole("option")).toHaveText(["Dark", "Light"]);
  });

  test("client-v2-themes: Switching to light", async ({ seededPage: page }) => {
    await runHelp(page);
    const darkEditor = await computed(page, EDITOR_TEXT, "color");
    const darkTerminal = await computed(page, TERMINAL_TEXT, "color");

    await pickTheme(page, "Light");

    await expect.poll(() => isDark(page)).toBe(false);
    await expect
      .poll(() => computed(page, EDITOR_TEXT, "color"))
      .not.toBe(darkEditor);
    await expect
      .poll(() => computed(page, TERMINAL_TEXT, "color"))
      .not.toBe(darkTerminal);

    await page.reload();
    await expect.poll(() => isDark(page)).toBe(false);
  });

  test("client-v2-themes: A saved Dracula theme", async ({ page }) => {
    // Seed once: a reload must read what the app saved, not the seed again
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("theme", "Dracula");
        sessionStorage.setItem("seeded", "1");
      }
    });
    await page.goto("/");

    await expect.poll(() => isDark(page)).toBe(true);
    const notice = page.getByText(
      "The Dracula theme was removed. Playground now uses Dark; Light is in Settings."
    );
    await expect(notice).toBeVisible();

    await page.reload();
    await expect.poll(() => isDark(page)).toBe(true);
    await page.waitForTimeout(EFFECTS_SETTLE_MS);
    await expect(notice).toHaveCount(0);
  });

  test("client-v2-themes: A saved Light theme stays light, unannounced", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "Light"));
    await page.goto("/");

    await expect.poll(() => isDark(page)).toBe(false);
    await page.waitForTimeout(EFFECTS_SETTLE_MS);
    await expect(page.getByText(/theme was removed/)).toHaveCount(0);
  });

  test("client-v2-themes: Theme change with a file open", async ({
    seededPage: page,
  }) => {
    const terminal = await runHelp(page);
    const editorBefore = await computed(page, EDITOR_TEXT, "color");

    await pickTheme(page, "Light");

    await expect
      .poll(() => computed(page, EDITOR_TEXT, "color"))
      .not.toBe(editorBefore);
    // The terminal re-coloured in place: what `help` printed is still there,
    // where a rebuilt terminal would show only its welcome text
    await expect(terminal).toContainText("rustfmt");
  });
});
