import { expect } from "@playwright/test";
import { test } from "./fixtures";

test("client-v2-elements: An unknown page is an alert", async ({
  seededPage: page,
}) => {
  // With no workspace the "What do you want to build?" dialog opens over the
  // page and hides the alert from the accessibility tree
  await page.goto("/no-such-page");
  await expect(page.getByRole("alert")).toContainText("URL path not found");
});

test("client-v2-elements: A skill is switched by its name", async ({
  seededPage: page,
}) => {
  await page.getByRole("tab", { name: "Sources" }).click();

  // The first skill row; its visible name is the checkbox's accessible name
  const row = page
    .locator("label", { has: page.getByRole("checkbox") })
    .first();
  await expect(row).toBeVisible();
  const name = ((await row.textContent()) ?? "").trim();
  expect(name).not.toBe("");
  const box = page.getByRole("checkbox", { name, exact: true });
  await expect(box).toBeVisible();

  const color = () => row.evaluate((el) => getComputedStyle(el).color);

  await expect(box).toBeChecked();
  const checkedColor = await color();
  await page.getByText(name, { exact: true }).click();
  await expect(box).not.toBeChecked();
  // The label brightens when its box is checked
  await expect.poll(color).not.toBe(checkedColor);
  await page.getByText(name, { exact: true }).click();
  await expect(box).toBeChecked();
  await expect.poll(color).toBe(checkedColor);
});
