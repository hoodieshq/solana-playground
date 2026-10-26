import type { Page } from "@playwright/test";

import { LONG, currentProject, expect, json, test } from "./fixtures";

const ID = "0123abcd";

const PROGRAM = [
  "use solana_program::entrypoint;",
  "entrypoint!(process_instruction);",
].join("\n");

/**
 * Answers the gist API with a gist made by hand: one native program file.
 * Raw downloads are refused, so nothing reaches the network.
 */
const stubGist = async (page: Page) => {
  await page.route("https://gist.githubusercontent.com/**", (r) => r.abort());
  await page.route(`https://api.github.com/gists/${ID}`, (r) =>
    json(r, {
      truncated: false,
      owner: { login: "alice" },
      files: {
        "lib.rs": {
          content: PROGRAM,
          truncated: false,
          raw_url: `https://gist.githubusercontent.com/alice/${ID}/raw/lib.rs`,
        },
      },
    })
  );
};

const editorText = (page: Page) => page.locator(".monaco-editor .view-lines");

/** Opens Settings, then its "From GitHub" import, and imports the URL */
const importFromDialog = async (page: Page, url: string) => {
  await page.locator("[data-settings-trigger]").first().click();
  await page
    .getByRole("region", { name: "Settings" })
    .getByRole("button", { name: "From GitHub" })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByPlaceholder("https://github.com/... or https://gist.github.com/...")
    .fill(url);
  await dialog.locator('button[type="submit"]').click();
};

test("gist-sharing: Importing a gist from the dialog", async ({
  seededPage: page,
}) => {
  await stubGist(page);
  await importFromDialog(page, `https://gist.github.com/alice/${ID}`);

  await expect(currentProject(page)).toHaveText(`gist-alice/${ID}`, LONG);
  await expect(editorText(page)).toContainText(
    "entrypoint!(process_instruction)",
    LONG
  );
});

test("gist-sharing: Opening a gist link signed out", async ({ page }) => {
  await stubGist(page);

  await page.goto(`/gist/${ID}`);

  await expect(editorText(page)).toContainText(
    "entrypoint!(process_instruction)",
    LONG
  );
  await expect(page.locator("#tabs").getByText("lib.rs")).toBeVisible();
  // A view, not a project: the navigation lists none
  await expect(currentProject(page)).toHaveCount(0);
});

test("gist-sharing: Saving a gist opened from a link", async ({ page }) => {
  await stubGist(page);
  await page.goto(`/gist/${ID}`);
  await expect(editorText(page)).toContainText("entrypoint!", LONG);

  await importFromDialog(page, `https://gist.github.com/alice/${ID}`);

  await expect(currentProject(page)).toHaveText(`gist-alice/${ID}`, LONG);
});

test("gist-sharing: A missing gist", async ({ page }) => {
  await page.route(`https://api.github.com/gists/${ID}`, (r) =>
    r.fulfill({ status: 404, json: { message: "Not Found" } })
  );

  await page.goto(`/gist/${ID}`);

  await expect(
    page.getByText(`Gist "${ID}" was not found on GitHub`)
  ).toBeVisible(LONG);
});
