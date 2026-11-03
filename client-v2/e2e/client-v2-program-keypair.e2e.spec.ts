import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { expect, LONG, test } from "./fixtures";

/**
 * The browser scenarios of `client-v2-program-keypair`: the Deploy stage's
 * folded Program id block. The deploy refusal needs a cluster and is walked
 * by hand (`(manual)` in the spec).
 */

const OTHER_ID = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

const block = (page: Page) =>
  page
    .locator("#flow-stage-panel-deploy")
    .getByRole("region", { name: "Program id", exact: true });

const field = (page: Page) =>
  block(page).getByRole("textbox", { name: "Program id", exact: true });

const button = (page: Page, name: string) =>
  block(page).getByRole("button", { name, exact: true });

const openDeploy = async (page: Page) => {
  await page.locator("#flow-stage-tab-deploy").click();
  await expect(block(page)).toBeVisible(LONG);
};

const openFold = async (page: Page) => {
  if (!(await field(page).isVisible())) await button(page, "Program id").click();
  await expect(field(page)).toBeVisible();
};

/** Leaves the project with a keypair, asking through the dialog if one exists */
const newKeypair = async (page: Page) => {
  await button(page, "New keypair").click();
  const dialog = page.getByRole("dialog", {
    name: "Are you sure you want to create a new program keypair?",
  });
  if (await dialog.isVisible()) {
    await dialog.getByRole("button", { name: "Generate" }).click();
  }
  await expect(field(page)).not.toHaveValue("");
};

const importFile = (page: Page, text: string) =>
  block(page)
    .locator('[data-slot="drop-zone"] input[type="file"]')
    .setInputFiles({
      name: "program-keypair.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });

test("client-v2-program-keypair: Closed until asked", async ({
  seededPage: page,
}) => {
  await openDeploy(page);
  await expect(button(page, "Program id")).toBeVisible();
  await expect(field(page)).toBeHidden();
});

test("client-v2-program-keypair: Replace a keypair", async ({
  seededPage: page,
}) => {
  await openDeploy(page);
  await openFold(page);
  await newKeypair(page);
  const before = await field(page).inputValue();

  await button(page, "New keypair").click();
  const dialog = page.getByRole("dialog", {
    name: "Are you sure you want to create a new program keypair?",
  });
  await dialog.getByRole("button", { name: "Generate" }).click();

  await expect(dialog).toBeHidden();
  await expect(field(page)).not.toHaveValue(before);
  await expect(button(page, "Remove custom id")).toBeHidden();
});

test("client-v2-program-keypair: Cancel", async ({ seededPage: page }) => {
  await openDeploy(page);
  await openFold(page);
  await newKeypair(page);
  const before = await field(page).inputValue();

  await button(page, "New keypair").click();
  const dialog = page.getByRole("dialog", {
    name: "Are you sure you want to create a new program keypair?",
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(field(page)).toHaveValue(before);
});

test("client-v2-program-keypair: Round trip", async ({ seededPage: page }) => {
  await openDeploy(page);
  await openFold(page);
  await newKeypair(page);
  const exported = await field(page).inputValue();

  const saving = page.waitForEvent("download");
  await button(page, "Export keypair").click();
  const download = await saving;
  expect(download.suggestedFilename()).toBe("program-keypair.json");
  const text = await readFile((await download.path())!, "utf8");
  const bytes = JSON.parse(text);
  expect(Array.isArray(bytes) && bytes.length).toBe(64);

  await newKeypair(page);
  await expect(field(page)).not.toHaveValue(exported);

  await importFile(page, text);
  await expect(field(page)).toHaveValue(exported);
});

test("client-v2-program-keypair: Refused file", async ({
  seededPage: page,
}) => {
  await openDeploy(page);
  await openFold(page);
  const before = await field(page).inputValue();

  await importFile(page, JSON.stringify(Array.from({ length: 32 }, () => 1)));

  await expect(
    block(page).getByText(
      "That file is not a program keypair: expected the 64-number JSON the Solana CLI writes."
    )
  ).toBeVisible();
  await expect(field(page)).toHaveValue(before);
});

test("client-v2-program-keypair: Invalid text", async ({
  seededPage: page,
}) => {
  await openDeploy(page);
  await openFold(page);
  const before = await field(page).inputValue();

  await field(page).fill("abc");
  await button(page, "Change program id").click();

  await expect(block(page).getByText("Not a valid public key")).toBeVisible();
  await expect(button(page, "Remove custom id")).toBeHidden();
  expect(before).not.toBe("abc");
});

test("client-v2-program-keypair: Open on a mismatch", async ({
  seededPage: page,
}) => {
  await openDeploy(page);
  await openFold(page);
  await newKeypair(page);
  await field(page).fill(OTHER_ID);
  await button(page, "Change program id").click();
  await expect(block(page).getByText("Program id changed")).toBeVisible();

  // A fresh load opens the fold by itself: the mismatch blocks a first deploy
  await page.reload();
  await openDeploy(page);
  await expect(field(page)).toHaveValue(OTHER_ID, LONG);
  await expect(
    block(page).getByText(/This program id does not match the program keypair/)
  ).toBeVisible();
});
