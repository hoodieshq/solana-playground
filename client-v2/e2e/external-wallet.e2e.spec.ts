import type { Page } from "@playwright/test";

import { installFakeWallet } from "./fake-wallet";
import { expect, LONG, runInTerminal, test } from "./fixtures";

// Wallets are found through ConnectorKit (`entities/external-wallet`); these
// drive a Wallet Standard wallet injected into the page, as an extension is.

const nav = (page: Page) => page.locator('[data-slot="sidebar"]');
/** The footer's account row, or the rail's "Account", whatever the session */
const account = (page: Page) =>
  nav(page)
    .locator('[data-slot="sidebar-footer"]')
    .getByRole("button", { name: /^Account/ });
const terminal = (page: Page) => page.locator(".xterm-rows").first();

/**
 * Runs `command` in the console's terminal, opening the drawer first. After a
 * reload the editor focuses itself when it opens its file, so the click waits
 * for that, or the editor would take the typed command away.
 */
const run = async (page: Page, command: string) => {
  await expect(page.locator(".monaco-editor textarea.inputarea")).toBeFocused(
    LONG
  );
  const drawer = page.getByRole("button", { name: "Terminal", exact: true });
  if ((await drawer.getAttribute("aria-expanded")) !== "true") {
    await drawer.click();
  }
  await runInTerminal(page, command);
};

/** The Playground wallet first, from the account menu, as a new user does */
const setUpPlaygroundWallet = async (page: Page) => {
  await account(page).click();
  await page.getByRole("menuitem", { name: "Connect wallet" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(account(page)).toContainText("SOL", LONG);
};

test("client-v2-external-wallet: An installed wallet is offered", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  await installFakeWallet(page, { name: "Phantom" });
  await page.reload();
  await setUpPlaygroundWallet(page);

  await openWalletMenu(page);

  await expect(
    page.getByRole("menuitem", { name: "Connect to Phantom" })
  ).toBeVisible();
});

/** The wallet window's More menu, which lists every wallet it can connect */
const openWalletMenu = async (page: Page) => {
  await page
    .locator("#tabs")
    .getByRole("button")
    .filter({ hasText: /^Wallet$/ })
    .click();
  await page
    .locator(".react-draggable")
    .getByRole("button", { name: "More" })
    .click();
};

test("client-v2-external-wallet: A wallet that registers late", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  await setUpPlaygroundWallet(page);

  await installFakeWallet(page, { name: "Backpack", late: true });

  await openWalletMenu(page);
  await expect(
    page.getByRole("menuitem", { name: "Connect to Backpack" })
  ).toBeVisible();
});

test("client-v2-external-wallet: A wallet without Solana support", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  await installFakeWallet(page, { name: "EvmOnly", chains: ["eip155:1"] });
  await installFakeWallet(page, { name: "Phantom" });
  await page.reload();
  await setUpPlaygroundWallet(page);

  await openWalletMenu(page);

  await expect(
    page.getByRole("menuitem", { name: "Connect to Phantom" })
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Connect to EvmOnly" })
  ).toHaveCount(0);
});

test("client-v2-external-wallet: Connect from the terminal", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  const phantom = await installFakeWallet(page, { name: "Phantom" });
  await page.reload();
  await setUpPlaygroundWallet(page);

  await run(page, "connect phantom");

  await expect(terminal(page)).toContainText("Connected to Phantom.", LONG);
  await expect(account(page)).toContainText(phantom.short);
});

test("client-v2-external-wallet: Reload after connecting", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  const phantom = await installFakeWallet(page, { name: "Phantom" });
  await page.reload();
  await setUpPlaygroundWallet(page);
  await run(page, "connect phantom");
  await expect(account(page)).toContainText(phantom.short, LONG);

  await page.reload();

  await expect(account(page)).toContainText(phantom.short, LONG);
  await account(page).click();
  await expect(
    page.getByRole("menuitem", { name: "Disconnect Phantom" })
  ).toBeVisible();
});

test("client-v2-external-wallet: Reload after disconnecting", async ({
  page,
  seededPage,
}) => {
  void seededPage;
  const phantom = await installFakeWallet(page, { name: "Phantom" });
  await page.reload();
  await setUpPlaygroundWallet(page);
  await run(page, "connect phantom");
  await expect(account(page)).toContainText(phantom.short, LONG);
  await account(page).click();
  await page.getByRole("menuitem", { name: "Disconnect Phantom" }).click();
  await expect(account(page)).not.toContainText(phantom.short, LONG);

  await page.reload();

  await expect(account(page)).toContainText("SOL", LONG);
  await expect(account(page)).not.toContainText(phantom.short);
});
