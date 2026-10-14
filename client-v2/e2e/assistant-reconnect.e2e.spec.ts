import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  hasDefaultBackend,
  NO_DEFAULT_BACKEND,
  seedWorkspace,
} from "./fixtures";

/**
 * The panel comes back usable after a reload, without being asked twice.
 *
 * A key-based backend comes back from this tab's `sessionStorage` (the
 * `assistant-own-key` tests below); the default backend needs no key at all --
 * and making the user click the same button on every single reload, before the
 * assistant could be used at all, was the whole of the difference.
 *
 * Only reachable on a deployment that actually serves a default backend, which
 * is what the probe in `Connect` decides; the test asserts nothing when it is
 * not configured, rather than failing on an environment it was never about.
 */

const LONG = { timeout: 60_000 };

type AssistantWindow = Window & {
  __pgAssistant?: { isConnected: boolean; items: unknown[] };
};

const isConnected = (page: Page) =>
  page.evaluate(() => !!(window as AssistantWindow).__pgAssistant?.isConnected);

/** The picker's connect button reads "Start" for the keyless default */
const start = (page: Page) =>
  page.getByRole("button", { name: "Start", exact: true });

test("the default backend reconnects itself after a reload", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto("/");
  test.skip(!(await hasDefaultBackend(page)), NO_DEFAULT_BACKEND);

  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible(LONG);
  await gallery.getByLabel("Project name").fill("alpha");
  await gallery.getByRole("button", { name: /^Start/ }).click();
  await expect(gallery).toBeHidden(LONG);

  // A first visit still asks: choosing a backend is how the panel introduces
  // what it can reach, and nothing has been chosen yet
  await expect(start(page)).toBeVisible(LONG);
  await start(page).click();
  await expect.poll(() => isConnected(page), LONG).toBe(true);

  await page.reload();

  await expect.poll(() => isConnected(page), LONG).toBe(true);
  await expect(start(page)).toBeHidden(LONG);
});

test("disconnecting is not undone by the next reload", async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto("/");
  test.skip(!(await hasDefaultBackend(page)), NO_DEFAULT_BACKEND);

  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible(LONG);
  await gallery.getByLabel("Project name").fill("beta");
  await gallery.getByRole("button", { name: /^Start/ }).click();
  await expect(gallery).toBeHidden(LONG);

  await expect(start(page)).toBeVisible(LONG);
  await start(page).click();
  await expect.poll(() => isConnected(page), LONG).toBe(true);

  // Disconnecting says "stop using this backend", and a reload that quietly
  // reconnected would be the app overruling that
  await page.evaluate(() =>
    (
      window as Window & { __pgAssistant?: { disconnect: () => void } }
    ).__pgAssistant!.disconnect()
  );
  await page.reload();

  await expect(start(page)).toBeVisible(LONG);
  expect(await isConnected(page)).toBe(false);
});

const KEY = "sk-e2e-own-key-0123456789";
const OWN = {
  id: "openai",
  apiKey: KEY,
  endpoint: { baseUrl: "https://api.example.test/v1", model: "gpt-x" },
};
/** Where the openai provider posts a turn, as `model/openai.ts` builds it */
const COMPLETIONS_URL = `${OWN.endpoint.baseUrl}/chat/completions`;
const REPLY = "stubbed provider reply";

type OwnWindow = Window & {
  __pgAssistant?: {
    isConnected: boolean;
    connection: {
      id: string;
      apiKey: string;
      endpoint?: { baseUrl: string; model: string };
    } | null;
    isPickingBackend: boolean;
    connect: (c: unknown) => void;
    disconnect: () => void;
    pickBackend: () => void;
  };
};

const connectOwn = (page: Page, connection: unknown = OWN) =>
  page.evaluate(
    (c) => (window as OwnWindow).__pgAssistant!.connect(c),
    connection
  );

const connected = (page: Page) =>
  page.evaluate(() => (window as OwnWindow).__pgAssistant?.connection ?? null);

/** The picker's heading when nothing is connected */
const picker = (page: Page) =>
  page.getByText("An assistant that can see your project");

/** Every value the origin's IndexedDB holds, as one string */
const indexedDbDump = (page: Page) =>
  page.evaluate(async () => {
    const out: unknown[] = [];
    let records = 0;
    for (const { name } of await indexedDB.databases()) {
      if (!name) continue;
      const db = await new Promise<IDBDatabase>((ok, fail) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => ok(req.result);
        req.onerror = () => fail(req.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const all = await new Promise<unknown[]>((ok, fail) => {
          const req = db.transaction(store).objectStore(store).getAll();
          req.onsuccess = () => ok(req.result);
          req.onerror = () => fail(req.error);
        });
        out.push(all);
        records += all.length;
      }
      db.close();
    }
    // Binary values (lightning-fs chunks) stringify as {} and hide nothing
    // text-shaped; decode them so the key cannot hide in a file's bytes
    const text = JSON.stringify(out, (_, v) =>
      v instanceof Uint8Array || v instanceof ArrayBuffer
        ? new TextDecoder().decode(v)
        : v
    );
    return { text, records };
  });

test.describe("assistant-own-key", () => {
  test.setTimeout(240_000);

  test("assistant-own-key: Reloading the tab keeps the connection", async ({
    page,
  }) => {
    await seedWorkspace(page, "own-key-reload");
    await connectOwn(page);
    await page.reload();

    await expect
      .poll(() => connected(page), LONG)
      .toMatchObject({ id: "openai", apiKey: KEY, endpoint: OWN.endpoint });
    await expect(page.locator("#assistant-api-key")).toBeHidden();
  });

  test("assistant-own-key: Storage that refuses access", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await seedWorkspace(page, "own-key-blocked");
    await connectOwn(page);
    await expect
      .poll(() => connected(page), LONG)
      .toMatchObject({ id: "openai" });

    await page.reload();
    await expect(picker(page)).toBeVisible(LONG);
    expect(await connected(page)).toBeNull();
  });

  test("assistant-own-key: Changing the backend is not undone", async ({
    page,
  }) => {
    await seedWorkspace(page, "own-key-change");
    await connectOwn(page);
    await page.evaluate(() =>
      (window as OwnWindow).__pgAssistant!.pickBackend()
    );
    await expect(page.locator("#assistant-api-key")).toBeVisible(LONG);

    // A reconnect would be asynchronous, so give one a window to show itself
    await page.waitForTimeout(2_000);

    expect(await connected(page)).toMatchObject({ id: "openai", apiKey: KEY });
    expect(
      await page.evaluate(
        () => (window as OwnWindow).__pgAssistant!.isPickingBackend
      )
    ).toBe(true);
    await expect(page.locator("#assistant-api-key")).toBeVisible();
  });

  test("assistant-own-key: A new tab asks again", async ({ page, context }) => {
    await seedWorkspace(page, "own-key-tab");
    await connectOwn(page);

    const second = await context.newPage();
    await second.goto("/");
    await expect(picker(second)).toBeVisible(LONG);
    // Polled, so a reconnect that has not run yet cannot make this pass
    await expect.poll(() => connected(second), LONG).toBeNull();
    expect(
      await second.evaluate(() => JSON.stringify({ ...sessionStorage }))
    ).not.toContain(KEY);
  });

  test("assistant-own-key: Disconnect, then reload", async ({ page }) => {
    await seedWorkspace(page, "own-key-disconnect");
    await connectOwn(page);
    expect(
      await page.evaluate(() => JSON.stringify({ ...sessionStorage }))
    ).toContain(KEY);
    await page.evaluate(() =>
      (window as OwnWindow).__pgAssistant!.disconnect()
    );
    await page.reload();

    await expect(picker(page)).toBeVisible(LONG);
    expect(
      await page.evaluate(() => JSON.stringify({ ...sessionStorage }))
    ).not.toContain(KEY);
  });

  test("assistant-own-key: Switching to the default backend", async ({
    page,
  }) => {
    await seedWorkspace(page, "own-key-switch");
    await connectOwn(page);
    expect(
      await page.evaluate(() => JSON.stringify({ ...sessionStorage }))
    ).toContain(KEY);
    await connectOwn(page, { id: "default", apiKey: "" });

    expect(
      await page.evaluate(() => JSON.stringify({ ...sessionStorage }))
    ).not.toContain(KEY);
  });

  test("assistant-own-key: Nothing durable holds the key", async ({ page }) => {
    await seedWorkspace(page, "own-key-durable");
    await connectOwn(page);
    await page.reload();
    await expect
      .poll(() => connected(page), LONG)
      .toMatchObject({ apiKey: KEY });

    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage }))
    ).not.toContain(KEY);
    // The seeded workspace's files live here, so zero records means the
    // read found nothing and the check below would pass for no reason
    const dump = await indexedDbDump(page);
    expect(dump.records).toBeGreaterThan(0);
    expect(dump.text).not.toContain(KEY);
  });

  test("assistant-own-key: Requests to our origin carry no key", async ({
    page,
    baseURL,
  }) => {
    // Connecting and reloading send no provider request, so this guards a
    // regression that would send the key to our own origin on load or
    // reconnect, not a request that exists today
    const leaks: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).origin !== new URL(baseURL!).origin) return;
      const carried = JSON.stringify(req.headers()) + (req.postData() ?? "");
      if (carried.includes(KEY)) leaks.push(req.url());
    });

    await seedWorkspace(page, "own-key-requests");
    await connectOwn(page);
    await page.reload();
    await expect
      .poll(() => connected(page), LONG)
      .toMatchObject({ apiKey: KEY });
    // `networkidle` never arrives under the dev server (HMR socket, polling),
    // so give the post-connect requests a fixed window to show up instead
    await page.waitForTimeout(3_000);

    expect(leaks).toEqual([]);
  });

  test("assistant-own-key: Sending a message sends the key to the provider only", async ({
    page,
    baseURL,
  }) => {
    const providerAuth: (string | undefined)[] = [];
    await page.route(COMPLETIONS_URL, (route) => {
      providerAuth.push(route.request().headers()["authorization"]);
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          `data: ${JSON.stringify({
            choices: [{ delta: { content: REPLY } }],
          })}\n\n` + "data: [DONE]\n\n",
      });
    });
    const leaks: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).origin !== new URL(baseURL!).origin) return;
      const carried = JSON.stringify(req.headers()) + (req.postData() ?? "");
      if (carried.includes(KEY)) leaks.push(req.url());
    });

    await seedWorkspace(page, "own-key-send");
    await connectOwn(page);
    const composer = page.getByRole("textbox", {
      name: "Message the assistant",
    });
    await composer.fill("hello");
    await composer.press("Enter");

    await expect(page.getByText(REPLY)).toBeVisible(LONG);
    expect(providerAuth).toEqual([`Bearer ${KEY}`]);
    expect(leaks).toEqual([]);

    // The thread is written shortly after the reply lands; wait for it, so a
    // dump taken before the write cannot pass for a clean one
    await expect
      .poll(async () => (await indexedDbDump(page)).text, LONG)
      .toContain(REPLY);
    expect((await indexedDbDump(page)).text).not.toContain(KEY);
  });
});
