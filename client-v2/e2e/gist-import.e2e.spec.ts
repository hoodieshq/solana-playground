import type { Page } from "@playwright/test";

import { LONG, currentProject, expect, json, test } from "./fixtures";

const ID = "0123abcd";

const PROGRAM = [
  "use solana_program::entrypoint;",
  "entrypoint!(process_instruction);",
].join("\n");

/** Answers the gist API with a gist made by hand: one native program file */
const stubGist = (page: Page) =>
  page.route(`https://api.github.com/gists/${ID}`, (r) =>
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

const editorText = (page: Page) => page.locator(".monaco-editor .view-lines");

test("client-v2-gist-import: Importing a gist from the dialog", async ({
  seededPage: page,
}) => {
  await stubGist(page);
  await page.locator("[data-settings-trigger]").first().click();
  await page
    .getByRole("region", { name: "Settings" })
    .getByRole("button", { name: "From GitHub" })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByPlaceholder("https://github.com/... or https://gist.github.com/...")
    .fill(`https://gist.github.com/alice/${ID}`);
  await dialog.locator('button[type="submit"]').click();

  await expect(currentProject(page)).toHaveText(`gist-alice/${ID}`, LONG);
  await expect(editorText(page)).toContainText(
    "entrypoint!(process_instruction)",
    LONG
  );
});

test("client-v2-gist-import: Opening a gist link signed out", async ({
  page,
}) => {
  await stubGist(page);

  await page.goto(`/gist/${ID}`);

  await expect(editorText(page)).toContainText(
    "entrypoint!(process_instruction)",
    LONG
  );
});
