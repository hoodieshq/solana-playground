import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { json } from "./fixtures";
import { REMEMBERED_BACKEND_KEY } from "../src/views/sidebar/assistant/model/remembered-backend";

/**
 * The default backend is offered only to a signed-in user, because
 * `/api/agent` refuses anyone else.
 *
 * The probe is stubbed as configured, so this runs where no key exists, CI
 * included. Neither case sends a turn: what is under test is whether the
 * panel connects, not what the backend answers.
 */

const LONG = { timeout: 60_000 };

type AssistantWindow = Window & {
  __pgAssistant?: { isConnected: boolean };
};

const isConnected = (page: Page) =>
  page.evaluate(() => !!(window as AssistantWindow).__pgAssistant?.isConnected);

/** A deployment that serves a default backend, and a browser that picked it before */
const defaultBackendRemembered = async (page: Page) => {
  await page.route("**/api/agent", (r) =>
    r.request().method() === "GET"
      ? json(r, { configured: true, model: "test-model" })
      : r.abort()
  );
  // `addInitScript` runs in the page, so the key travels as its argument
  await page.addInitScript(
    (key) => localStorage.setItem(key, "default"),
    REMEMBERED_BACKEND_KEY
  );
};

const session = (page: Page, user: unknown) =>
  page.route("**/api/auth/get-session", (r) => json(r, { user }));

const openProject = async (page: Page, name: string) => {
  await page.goto("/");
  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible(LONG);
  await gallery.getByLabel("Project name").fill(name);
  await gallery.getByRole("button", { name: /^Start/ }).click();
  await expect(gallery).toBeHidden(LONG);
};

test("a signed-out user is offered sign-in, not the default backend", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await defaultBackendRemembered(page);
  await session(page, null);

  await openProject(page, "signed-out");

  await expect(
    page.getByText(
      "Sign in with GitHub to use it, or bring your own key below."
    )
  ).toBeVisible(LONG);
  await expect(
    page.getByRole("button", { name: "Start", exact: true })
  ).toBeHidden();
  expect(await isConnected(page)).toBe(false);
});

test("a signed-in user is reconnected to the remembered default backend", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await defaultBackendRemembered(page);
  await session(page, { id: "u1", name: "Tester", image: null, login: "t" });

  await openProject(page, "signed-in");

  await expect.poll(() => isConnected(page), LONG).toBe(true);
});
