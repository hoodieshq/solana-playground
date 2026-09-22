import { expect, test } from "@playwright/test";
import { validate as isUuid } from "uuid";
import type { Page, Route } from "@playwright/test";

/**
 * What a signed-in browser does with an account it has never seen.
 *
 * The session is an HttpOnly cookie from a live GitHub round trip, so signing
 * in for real is not something a test can do. The endpoints behind it are
 * stubbed instead: this is about what the *client* does with the answers --
 * whether the projects arrive, whether one is opened, whether the conversation
 * is on screen -- and every one of those was wrong at some point while the
 * modules underneath were individually passing their own tests.
 *
 * The server's side of the same contract is covered against a real database in
 * `src/features/persistence/model/projects.test.mjs`.
 */

const LONG = { timeout: 60_000 };

const TUTORIAL = {
  id: "tut:hello-anchor",
  name: "Hello Anchor",
  kind: "tutorial",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

/** Older, so it must not be the one opened */
const PROJECT = {
  id: "9f1d0e5c-1111-4111-8111-111111111111",
  name: "From The Laptop",
  kind: "project",
  updatedAt: "2026-02-01T00:00:00.000Z",
};

const SNAPSHOTS: Record<string, unknown> = {
  [TUTORIAL.id]: { files: { "src/lib.rs": "// written on the other device" } },
  [PROJECT.id]: { files: { "src/lib.rs": "// written on the laptop" } },
};

const SAID = "a message from the other device";

/** An account whose work lives entirely on some other browser */
const stubAccount = async (page: Page) => {
  const json = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "Tester", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));

  await page.route("**/api/conversations*", (r) =>
    json(r, {
      items: [
        {
          kind: "user",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          createdAt: "2026-03-01T00:00:00.000Z",
          text: SAID,
        },
      ],
    })
  );

  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      return json(r, { updatedAt: new Date().toISOString() });
    }
    const id = new URL(r.request().url()).searchParams.get("id");
    if (!id) return json(r, { projects: [TUTORIAL, PROJECT] });

    const found = [TUTORIAL, PROJECT].find((p) => p.id === id);
    return found
      ? json(r, { project: { ...found, snapshot: SNAPSHOTS[found.id] } })
      : r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
};

const threadId = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __pgAssistant?: { threadId?: string } })
        .__pgAssistant?.threadId ?? null
  );

/** `expect.poll` needs a value to compare, and `validate` is the check */
const threadIdIsUuid = async (page: Page) =>
  isUuid((await threadId(page)) ?? "");

test("a signed-in browser takes on the whole account", async ({ page }) => {
  test.setTimeout(240_000);
  await stubAccount(page);
  await page.goto("/");

  // The newest project is opened, so a device that has just pulled the whole
  // account down does not sit there saying "No project"
  await expect(page.locator('[aria-haspopup="true"]').first()).toContainText(
    "Hello Anchor",
    LONG
  );
  // The thread id is the conversation's own, not the workspace's: a project
  // may hold several. What matters here is that opening the lesson opened a
  // conversation at all.
  await expect.poll(() => threadIdIsUuid(page), LONG).toBe(true);

  // The gallery greets an empty browser, and this one only looked empty while
  // the account was still answering
  await expect(page.locator("[data-gallery-modal]")).toHaveCount(0, LONG);

  // Every project the account has, not just the one that happens to be open
  await page.locator('[aria-haspopup="true"]').first().click();
  const menu = page.getByLabel("Projects and lessons");
  await expect(menu).toBeVisible(LONG);
  await expect(menu.getByText("From The Laptop", { exact: true })).toBeVisible(
    LONG
  );
});

test("the conversation is on screen before a backend is picked", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await stubAccount(page);
  await page.goto("/");

  // Picking a backend is per-browser, so a second device always starts at the
  // picker. The thread is in memory well before that, and used to be invisible
  // until the user clicked through -- which reads as "it did not sync".
  await expect(page.getByText(SAID)).toBeVisible(LONG);
  await expect(
    page.getByRole("button", { name: "Start", exact: true })
  ).toBeVisible(LONG);
});

const json = (r: Route, body: unknown) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

/**
 * Wait until the browser has stopped uploading.
 *
 * A first sign-in is not one write. `program-info.json` is written after the
 * workspace opens, asynchronously and by something other than the editor, so
 * it lands after the first push and schedules its own -- and until that one
 * has been accepted the sync mark describes a snapshot without it. Reloading
 * inside that window is a race, and the losing side looks exactly like a real
 * divergence.
 */
const settled = async (page: Page, writes: unknown[]) => {
  let last = -1;
  while (last !== writes.length) {
    last = writes.length;
    await page.waitForTimeout(4000);
  }
};

/** A project of this browser's own, to hand over and then reload against */
const makeLocalProject = async (page: Page, name: string) => {
  await page.goto("/");
  const gallery = page.locator("[data-gallery-modal]");
  await expect(gallery).toBeVisible(LONG);
  await gallery.getByLabel("Project name").fill(name);
  await gallery.getByRole("button", { name: /^Start/ }).click();
  await expect(gallery).toBeHidden(LONG);

  return await page.evaluate(
    () =>
      (window as unknown as { __pgAssistant?: { threadId?: string } })
        .__pgAssistant?.threadId as string
  );
};

/**
 * A reload is not an edit.
 *
 * Every write bumps the row, and a bumped row is what the *other* browser sees
 * as "this project changed on another device". So a reload that quietly
 * re-uploaded anything -- the stale in-memory copy it was about to replace, or
 * the copy it had just pulled -- turned two idle browsers into a conflict
 * between them. The only honest number of writes here is none.
 *
 * The account's copy here is one this browser actually handed over, rather
 * than a fixture invented alongside it. That is the round trip that matters:
 * the snapshot has to survive being built, uploaded, stored and read back and
 * still hash identically, and the sync mark written by the push has to survive
 * the reload. Either failing shows up as a write.
 */
test("reloading a project the account already has writes nothing", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const localId = await makeLocalProject(page, "Shared");

  const writes: Array<{ snapshot?: unknown }> = [];
  let stored: { snapshot?: unknown; updatedAt: string } | null = null;

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      const body = JSON.parse(r.request().postData() ?? "{}");
      writes.push(body);
      stored = {
        snapshot: body.snapshot,
        updatedAt: "2026-02-01T00:00:00.000Z",
      };
      return json(r, { updatedAt: stored.updatedAt });
    }
    const shared = {
      id: localId,
      name: "Shared",
      kind: "project",
      updatedAt: stored?.updatedAt ?? "2026-02-01T00:00:00.000Z",
    };
    const id = new URL(r.request().url()).searchParams.get("id");
    if (id) {
      return json(r, { project: { ...shared, snapshot: stored?.snapshot } });
    }
    return json(r, { projects: stored ? [shared] : [] });
  });

  // First sign-in: the account has nothing, so this browser hands the project
  // over. Not pinned to exactly one -- the workspace files that are written
  // straight to the store, the program keypair among them, legitimately land
  // after the first push and schedule their own. What must be zero is the
  // second phase below.
  await page.reload();
  await expect.poll(() => writes.length, LONG).toBeGreaterThanOrEqual(1);
  await settled(page, writes);

  // Second load: both sides now agree, and the mark says so
  writes.length = 0;
  await page.reload();
  await expect.poll(() => threadId(page), LONG).toBe(localId);

  await page.waitForTimeout(8000);

  expect(writes).toEqual([]);
  await expect(page.getByText("changed on another device")).toHaveCount(0);
});

/**
 * The other device is ahead, and this one has done nothing.
 *
 * The commonest two-browser sequence there is, and it must not ask: only one
 * side has work in it. Reaching the silent path needs the marks to say so --
 * and they nearly did not, because a workspace switch fires on every load and
 * was flagging every project as having unsaved changes before the user had
 * touched anything.
 *
 * The editor has to end up showing the new code too. `replaceWorkspaceFiles`
 * writes to IndexedDB and leaves the in-memory copy alone, and re-opening the
 * workspace you are already in does not re-read it -- so the version the user
 * was meant to receive landed on disk while the screen kept the old one, and
 * the next debounce pushed the old one back over it.
 */
test("the other device's change arrives without asking", async ({ page }) => {
  test.setTimeout(240_000);

  const localId = await makeLocalProject(page, "Handover");

  const writes: unknown[] = [];
  let stored: { snapshot?: unknown; updatedAt: string } | null = null;

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      const body = JSON.parse(r.request().postData() ?? "{}");
      writes.push(body);
      stored = {
        snapshot: body.snapshot,
        updatedAt: "2026-02-01T00:00:00.000Z",
      };
      return json(r, { updatedAt: stored.updatedAt });
    }
    const shared = {
      id: localId,
      name: "Handover",
      kind: "project",
      updatedAt: stored?.updatedAt ?? "2026-02-01T00:00:00.000Z",
    };
    const id = new URL(r.request().url()).searchParams.get("id");
    if (id) {
      return json(r, { project: { ...shared, snapshot: stored?.snapshot } });
    }
    return json(r, { projects: stored ? [shared] : [] });
  });

  // Sign in and hand the project over, so this browser and the account agree
  await page.reload();
  await expect.poll(() => writes.length, LONG).toBeGreaterThanOrEqual(1);
  await settled(page, writes);

  // The other device edits it, adding a file this browser has never seen
  stored = {
    snapshot: {
      files: {
        "src/lib.rs": "// edited on the other device",
        "src/from_other_device.rs": "// new over there",
      },
    },
    updatedAt: "2026-05-01T00:00:00.000Z",
  };

  writes.length = 0;
  await page.reload();
  await expect.poll(() => threadId(page), LONG).toBe(localId);

  // Nothing to decide: this browser has no work of its own to weigh
  await expect(page.getByText("changed on another device")).toHaveCount(0, LONG);

  // The file tree is rendered from the explorer's *in-memory* state, so the
  // new file appearing in it is the proof that the workspace was re-read --
  // writing it to IndexedDB alone would leave the tree exactly as it was
  await expect(page.locator("#root-dir")).toContainText(
    "from_other_device.rs",
    LONG
  );

  // The stale in-memory copy must not go back up. This is the assertion that
  // fails when the workspace is not re-read: the push carries the old files,
  // the server takes them, and the *other* browser is then told its project
  // changed elsewhere.
  await page.waitForTimeout(8000);
  expect(writes).toEqual([]);
});

/**
 * The other device keeps going, and this one keeps up.
 *
 * One round trip is not enough to trust this: the first adopt is what puts the
 * workspace into the state the second one has to read correctly. Anything the
 * app writes to the project *after* a reconcile has taken the server's copy --
 * and the program keypair is written on every open -- makes this device look
 * like it has work of its own, and the second round then reads as a genuine
 * divergence and asks.
 */
test("the other device can change it twice without ever asking", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const localId = await makeLocalProject(page, "PingPong");

  const writes: unknown[] = [];
  let stored: { snapshot?: unknown; updatedAt: string } | null = null;

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      const body = JSON.parse(r.request().postData() ?? "{}");
      writes.push(body);
      stored = {
        snapshot: body.snapshot,
        updatedAt: `2026-02-0${writes.length}T00:00:00.000Z`,
      };
      return json(r, { updatedAt: stored.updatedAt });
    }
    const shared = {
      id: localId,
      name: "PingPong",
      kind: "project",
      updatedAt: stored?.updatedAt ?? "2026-02-01T00:00:00.000Z",
    };
    const id = new URL(r.request().url()).searchParams.get("id");
    if (id) {
      return json(r, { project: { ...shared, snapshot: stored?.snapshot } });
    }
    return json(r, { projects: stored ? [shared] : [] });
  });

  // Hand it over, so both sides agree to begin with
  await page.reload();
  await expect.poll(() => writes.length, LONG).toBeGreaterThanOrEqual(1);
  await settled(page, writes);

  const banner = page.getByText("changed on another device");

  /** The other device edits, and this one picks it up on the next load */
  const roundTrip = async (marker: string) => {
    stored = {
      snapshot: {
        files: {
          "src/lib.rs": `// ${marker}`,
          [`src/${marker}.rs`]: "// added over there",
        },
      },
      updatedAt: `2026-06-0${marker.length}T00:00:00.000Z`,
    };

    writes.length = 0;
    await page.reload();
    await expect.poll(() => threadId(page), LONG).toBe(localId);

    await expect(banner).toHaveCount(0, LONG);
    await expect(page.locator("#root-dir")).toContainText(`${marker}.rs`, LONG);
  };

  await roundTrip("first");
  // The one that was failing: by now this browser has adopted once, and
  // whatever the adopt left behind is what the second round has to survive
  await roundTrip("second");
  // A third, because "works once more" and "settles" are different claims
  await roundTrip("third");
});

/**
 * The one question the user is ever asked, and both of its answers.
 *
 * Reaching it takes a genuine divergence: this browser has work the account
 * never took, and the row has moved since it last agreed. Everything else --
 * taking the server's copy, pushing this one, finishing a delete -- reconcile
 * decides on its own, because only one side has work in it.
 */
test("a divergent project asks, and keeping this version force-pushes it", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const localId = await makeLocalProject(page, "Contested");

  const writes: Array<{ force?: boolean; baseUpdatedAt?: string }> = [];
  let stored: { snapshot?: unknown; updatedAt: string } | null = null;

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      const body = JSON.parse(r.request().postData() ?? "{}");
      writes.push(body);
      // Only `force` gets through. A plain swap is refused, standing in for
      // the other device having written since this one last read.
      if (!body.force) {
        return r.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ conflict: true, updatedAt: stored?.updatedAt }),
        });
      }
      stored = { snapshot: body.snapshot, updatedAt: "2026-04-01T00:00:00.000Z" };
      return json(r, { updatedAt: stored.updatedAt });
    }

    const shared = {
      id: localId,
      name: "Contested",
      kind: "project",
      updatedAt: stored?.updatedAt ?? "2026-03-01T00:00:00.000Z",
    };
    const id = new URL(r.request().url()).searchParams.get("id");
    if (id) {
      return json(r, {
        project: {
          ...shared,
          snapshot: stored?.snapshot ?? {
            files: { "src/lib.rs": "// written on the other device" },
          },
        },
      });
    }
    return json(r, { projects: [shared] });
  });

  await page.reload();

  const banner = page.getByText("changed on another device");
  await expect(banner).toBeVisible(LONG);

  // And it stops pushing while the question is open, rather than re-sending a
  // swap that can never match again
  await page.waitForTimeout(8000);
  const beforeAnswer = writes.length;

  await page.getByRole("button", { name: "Keep this version" }).click();

  await expect.poll(() => writes.at(-1)?.force, LONG).toBe(true);
  expect(writes.length).toBe(beforeAnswer + 1);
  // Answered, so the banner goes -- it used to stay up for the rest of the
  // session, over unrelated projects included
  await expect(banner).toHaveCount(0, LONG);
});

/** The other answer to the same question, which is the destructive one */
test("a divergent project can take the other version instead", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const localId = await makeLocalProject(page, "Contested");

  const writes: Array<{ force?: boolean }> = [];
  const theirs = {
    files: {
      "src/lib.rs": "// written on the other device",
      "src/from_other_device.rs": "// new over there",
    },
  };

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      writes.push(JSON.parse(r.request().postData() ?? "{}"));
      return r.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          conflict: true,
          updatedAt: "2026-03-01T00:00:00.000Z",
        }),
      });
    }
    const shared = {
      id: localId,
      name: "Contested",
      kind: "project",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };
    const id = new URL(r.request().url()).searchParams.get("id");
    return id
      ? json(r, { project: { ...shared, snapshot: theirs } })
      : json(r, { projects: [shared] });
  });

  await page.reload();

  const banner = page.getByText("changed on another device");
  await expect(banner).toBeVisible(LONG);

  await page.getByRole("button", { name: "Take the other version" }).click();

  await expect(banner).toHaveCount(0, LONG);
  // The tree is rendered from in-memory state, so this proves the explorer
  // caught up rather than the files landing on disk behind a stale screen
  await expect(page.locator("#root-dir")).toContainText(
    "from_other_device.rs",
    LONG
  );
  // ...and the editor itself, which is a separate claim and the one the user
  // actually sees. Clearing the workspace directory took the tab state with
  // it, so there was no current file to re-read and the pane went on showing
  // the version that had just been replaced, until the page was reloaded.
  await expect(
    page.getByText("// written on the other device")
  ).toBeVisible(LONG);

  // And nothing goes back up afterwards. A push here would carry the discarded
  // copy and hand the *other* browser a conflict it did not cause.
  writes.length = 0;
  await page.waitForTimeout(8000);
  expect(writes).toEqual([]);
});

/**
 * The program keypair and a lesson's progress travel with the project.
 *
 * Both live in dotfiles, and the explorer's in-memory tree has never held any
 * dotfile (`isItemNameValid`), so a snapshot built from it silently left them
 * behind -- the same project deployed to a different address on every device,
 * and a lesson restarted from page one.
 */
test("a started tutorial hands over its keypair and progress", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto("/");
  await page.getByRole("tab", { name: /tutorials/i }).click();
  await page
    .getByText("Hello Anchor", { exact: true })
    .locator("xpath=../..")
    .getByRole("button", { name: "Open" })
    .click();
  await page.getByRole("button", { name: "START", exact: true }).click();
  // The thread id is the conversation's own, not the workspace's: a project
  // may hold several. What matters here is that opening the lesson opened a
  // conversation at all.
  await expect.poll(() => threadIdIsUuid(page), LONG).toBe(true);
  // The keypair is written after the workspace is up, not with it
  await page.waitForTimeout(5000);

  const writes: Array<{ snapshot?: { files: Record<string, string> } }> = [];

  await page.route("**/api/auth/get-session", (r) =>
    json(r, { user: { id: "u1", name: "T", image: null, login: "t" } })
  );
  await page.route("**/api/sync", (r) => json(r, { enabled: true, db: "ok" }));
  await page.route("**/api/conversations*", (r) => json(r, { items: [] }));
  await page.route("**/api/projects*", (r) => {
    if (r.request().method() === "PUT") {
      writes.push(JSON.parse(r.request().postData() ?? "{}"));
      return json(r, { updatedAt: new Date().toISOString() });
    }
    // An account with nothing on it, so this browser is the one handing over
    return json(r, { projects: [] });
  });

  await page.reload();

  await expect.poll(() => writes.length, LONG).toBeGreaterThan(0);
  const sent = Object.keys(writes[0].snapshot?.files ?? {});
  expect(sent).toContain(".workspace/program-info.json");
  expect(sent).toContain(".tutorial.json");
});
