import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * A browser with one project already created.
 *
 * On a fresh profile the Flow canvas has no workspace, so it opens the
 * "What do you want to build?" gallery over everything and that modal
 * intercepts pointer events -- any test that clicks the canvas needs a
 * project first.
 *
 * Seeds through the gallery's own "Start from scratch" row rather than
 * writing to `indexedDB`: the explorer's on-disk layout is an internal
 * detail, and the default framework files are bundled, so this needs no
 * network.
 */
export const seedWorkspace = async (page: Page, name = "e2e-project") => {
  await page.goto("/");

  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible();

  await gallery.getByLabel("Project name").fill(name);
  await gallery.getByRole("button", { name: /^Start/ }).click();

  // `PgExplorer.createWorkspace` closes the modal, then the explorer
  // re-initializes -- wait for the tree, not just the modal.
  await expect(gallery).toBeHidden();
  await expect(page.locator("#root-dir")).toBeVisible();
};

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, use) => {
    await seedWorkspace(page);
    await use(page);
  },
});

type WriteBody = {
  files?: Record<string, string>;
  changed?: Record<string, string>;
  removed?: string[];
};

/**
 * What `/api/projects` stores for a write: the whole file set, or a patch on
 * what it already holds. Route stubs use it so a patch does not quietly
 * become a project holding only the files that changed.
 */
export const applyWrite = (
  held: { files: Record<string, string> } | undefined,
  body: WriteBody
) => {
  const files = body.files
    ? { ...body.files }
    : { ...(held?.files ?? {}), ...(body.changed ?? {}) };
  for (const path of body.removed ?? []) delete files[path];
  return { files };
};

export { expect };

/**
 * Whether the dev server offers a keyless default backend.
 *
 * `/api/agent` is served by the dev server itself (`craco.config.js`) and
 * answers `configured: false` unless the default backend is configured
 * (`AGENT_BASE_URL` and `AGENT_MODEL`, read by `api/agent.mjs`). CI sets
 * neither, so the specs that must *connect* to the default backend skip
 * themselves there with this as the reason, and the `e2e` job counts the
 * skips against that reason; a spec that only needs the picker on screen
 * asserts on either label instead.
 *
 * Only the answer described above may skip. A 500 (the handler threw), a
 * 404 (the route moved), a dead server or a renamed field would otherwise
 * all read as "not configured" -- and `GET /api/agent` has no other test, so
 * that is the one place a break in it would show.
 */
export const hasDefaultBackend = (page: Page) =>
  page.evaluate(async () => {
    const r = await fetch("/api/agent");
    if (!r.ok) {
      const body = (await r.text()).slice(0, 300);
      throw new Error(`GET /api/agent answered ${r.status}: ${body}`);
    }
    const body: unknown = await r.json();
    const configured =
      body && typeof body === "object"
        ? (body as { configured?: unknown }).configured
        : undefined;
    if (typeof configured !== "boolean") {
      throw new Error(
        `GET /api/agent has no boolean "configured": ${JSON.stringify(body)}`
      );
    }
    return configured;
  });

export const NO_DEFAULT_BACKEND = "no default backend configured";
