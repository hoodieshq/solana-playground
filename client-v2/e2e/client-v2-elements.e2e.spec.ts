import { expect } from "@playwright/test";
import { test } from "./fixtures";

test("client-v2-elements: An unknown page is an alert", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("alert")).toContainText("URL path not found");
});

test("client-v2-elements: A skill is switched by its name", async ({
  seededPage: page,
}) => {
  await page.getByRole("tab", { name: "Sources" }).click();

  // The first skill in `SKILLS`; its visible name is the accessible name
  const name = "Playground build environment";
  const box = page.getByRole("checkbox", { name, exact: true });
  await expect(box).toBeVisible();
  await expect(box).toBeChecked();
  await page.getByText(name, { exact: true }).click();
  await expect(box).not.toBeChecked();
  await page.getByText(name, { exact: true }).click();
  await expect(box).toBeChecked();
});
