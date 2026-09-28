import { expect, test } from "@playwright/test";
import type { BrowserContext, Page, Route } from "@playwright/test";

/**
 * Two tabs of one browser on one project.
 *
 * Tabs share IndexedDB -- the files and the sync marks -- but each holds the
 * open workspace in memory and in its editor models. Every case here is a way
 * for the tab that fell behind to write its old copy over the other's work.
 *
 * The account is a stateful fake with the server's compare-and-swap, routed
 * on the *context*, so both pages talk to the same one. Playwright pages
 * always report `visible`, which is exactly the side-by-side case; the
 * tab-switch cases fake `visibilityState` per page.
 */

const LONG = { timeout: 60_000 };
const ID = "5b0c6a4e-2222-4222-8222-222222222222";
const LIB = "src/lib.rs";

interface Row {
  id: string;
  name: string;
  kind: "project";
  updatedAt: string;
  snapshot: { files: Record<string, string> };
}

const fakeAccount = async (
  context: BrowserContext,
  opts: { putDelayMs?: number } = {}
) => {
  let tick = 0;
  const stamp = () =>
    new Date(Date.UTC(2026, 2, 1, 0, 0, ++tick)).toISOString();

  const row: Row = {
    id: ID,
    name: "Shared",
    kind: "project",
    updatedAt: stamp(),
    snapshot: { files: { [LIB]: "// v0\n" } },
  };
  const state = { conflicts: 0, rejectPuts: false };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await context.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "Tester", image: null, login: "t" } })
  );
  await context.route("**/api/sync", (r) =>
    json(r, { enabled: true, db: "ok" })
  );
  await context.route("**/api/conversations*", (r) =>
    json(r, { items: [], threads: [] })
  );
  await context.route("**/api/projects*", async (r) => {
    const req = r.request();
    if (req.method() === "PUT") {
      const body = req.postDataJSON();
      // Anything else this browser owns is accepted and forgotten
      if (body.id !== ID) return json(r, { updatedAt: stamp() });
      if (opts.putDelayMs) {
        await new Promise((done) => setTimeout(done, opts.putDelayMs));
      }
      if (
        state.rejectPuts ||
        (!body.force && body.baseUpdatedAt !== row.updatedAt)
      ) {
        state.conflicts++;
        return json(r, { conflict: true, updatedAt: row.updatedAt }, 409);
      }
      row.snapshot = body.snapshot;
      row.name = body.name;
      row.updatedAt = stamp();
      return json(r, { updatedAt: row.updatedAt });
    }
    if (req.method() === "DELETE") return json(r, {});

    const id = new URL(req.url()).searchParams.get("id");
    const listed = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      updatedAt: row.updatedAt,
    };
    if (!id) return json(r, { projects: [listed] });
    return id === ID
      ? json(r, { project: { ...listed, snapshot: row.snapshot } })
      : json(r, {}, 404);
  });

  return { row, state, stamp };
};

const editor = (page: Page) => page.locator(".monaco-editor .view-lines");

const openShared = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator('[aria-haspopup="true"]').first()).toContainText(
    "Shared",
    LONG
  );
  await expect(editor(page)).toContainText("// v0", LONG);
};

/** Type at the end of the open file, the way a person would */
const typeAtEnd = async (page: Page, text: string) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(`\n${text}`);
};

/**
 * Playwright never changes visibility; fake it the way the browser reports
 * it
 */
const setVisible = (page: Page, visible: boolean) =>
  page.evaluate((v) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (v ? "visible" : "hidden"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visible);

const serverLib = (row: Row) => () => row.snapshot.files[LIB] ?? "";

// A named function rather than an inline arrow: the test name alone is
// close to the line limit, and prettier hugs an inline arrow's params
// against the call instead of breaking before it.
const tabBroughtBackShowsEdit = async ({
  context,
}: {
  context: BrowserContext;
}) => {
  test.setTimeout(180_000);
  const { row } = await fakeAccount(context);
  const a = await context.newPage();
  await openShared(a);
  const b = await context.newPage();
  await openShared(b);

  await setVisible(b, false);
  await typeAtEnd(a, "// from A");
  await expect.poll(serverLib(row), LONG).toContain("// from A");

  await setVisible(b, true);
  // Before anyone types: this is the whole point
  await expect(editor(b)).toContainText("// from A", LONG);

  await typeAtEnd(b, "// from B");
  await expect.poll(serverLib(row), LONG).toContain("// from B");
  expect(serverLib(row)()).toContain("// from A");
};

test(
  "a tab brought back shows the other tab's edit before it can type",
  tabBroughtBackShowsEdit
);

test("two visible tabs follow each other", async ({ context }) => {
  test.setTimeout(180_000);
  const { row } = await fakeAccount(context);
  const a = await context.newPage();
  await openShared(a);
  const b = await context.newPage();
  await openShared(b);

  // No visibility change at all -- two windows side by side
  await typeAtEnd(a, "// from A");
  await expect(editor(b)).toContainText("// from A", LONG);

  await typeAtEnd(b, "// from B");
  await expect.poll(serverLib(row), LONG).toContain("// from B");
  expect(serverLib(row)()).toContain("// from A");
});

test("switching tabs mid-debounce raises no conflict", async ({ context }) => {
  test.setTimeout(180_000);
  // Holds A's upload open across B's reconcile, which is the race
  const { row, state } = await fakeAccount(context, { putDelayMs: 1500 });
  const a = await context.newPage();
  await openShared(a);
  const b = await context.newPage();
  await openShared(b);
  await setVisible(b, false);

  await typeAtEnd(a, "// from A");
  // The editor's own 500 ms autosave has to land first, or there is no
  // pending network debounce yet for hiding the tab to flush. Nothing the
  // page exposes says "the autosave has run" without adding a product-code
  // hook, so this is a fixed wait rather than a poll -- widened to 1500 ms
  // (not 800: that left only a 300 ms margin, which a slow run could miss
  // and regress to the harness hang this replaced) while staying well
  // inside the 3 s push debounce, so the scenario is still "mid-debounce"
  await a.waitForTimeout(1500);
  // Inside the 3 s debounce: A flushes on hide, B reconciles on show
  await setVisible(a, false);
  await setVisible(b, true);

  await expect.poll(serverLib(row), LONG).toContain("// from A");
  await b.waitForTimeout(8000);
  await expect(b.getByText("changed on another device")).toHaveCount(0);
  expect(state.conflicts).toBe(0);
  await expect(editor(b)).toContainText("// from A");
});

test("taking the other version replaces a file that is already open", async ({
  context,
}) => {
  test.setTimeout(180_000);
  const { row, state, stamp } = await fakeAccount(context);
  const page = await context.newPage();
  await openShared(page);

  // Another device moves the row on, and this one's next upload is refused
  row.snapshot = { files: { [LIB]: "// theirs\n" } };
  row.updatedAt = stamp();
  state.rejectPuts = true;

  await typeAtEnd(page, "// mine");
  const banner = page.getByText("changed on another device");
  await expect(banner).toBeVisible(LONG);
  state.rejectPuts = false;

  await page.getByRole("button", { name: "Take the other version" }).click();
  await expect(banner).toHaveCount(0, LONG);
  // `lib.rs` had a model before the adopt, so this is the case where
  // Monaco's per-path model cache kept the replaced text on screen
  await expect(editor(page)).toContainText("// theirs", LONG);
  await expect(editor(page)).not.toContainText("// mine");
});
