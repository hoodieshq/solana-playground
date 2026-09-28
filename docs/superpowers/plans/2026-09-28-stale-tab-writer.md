# Stale Tab Writer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop a tab that has fallen behind from overwriting another tab's
work, whether it would do so on the server or on disk. The fix covers two
windows side by side and the tab-switch race (HOO-1723).

**Architecture:** Disk (IndexedDB, which tabs share) is the source of truth
for each file. A tab brings its in-memory workspace and Monaco models back
in line with disk when another tab announces a write over `BroadcastChannel`,
and whenever it reconciles. A Web Lock makes reconcile and push atomic across
tabs, and uploads are built from disk, so stale memory can never reach the
server.

**Tech Stack:** React 17 / CRA 5 + craco, TypeScript 5.0.4, Monaco
0.37.1, jest (via `craco test`), Playwright, `BroadcastChannel`,
`navigator.locks`.

**Spec:** `docs/superpowers/specs/2026-09-28-stale-tab-writer-design.md`
(`context-archive`).

**Deviations from the spec, decided while planning** (Task 8 records them in
the spec):
- `session.tsx` is **not** touched. Once `adopt` reloads properly, the
  session's own `switchWorkspace(target)` re-opens a workspace whose models
  are already fresh, so it is harmless. This also removes the textual
  conflict with PR #36.
- `adopt` always takes the **full** reopen path (`{ reopen: true }`). The
  quiet path would leave `PgProgramInfo` holding the old keypair, because
  the adopted snapshot carries `.workspace/program-info.json` and only a
  switch makes `PgProgramInfo` re-read it.
- `pushCurrent` does not schedule a reload when disk and memory disagree. It
  uploads what is on disk, which is enough for correctness, and the channel
  plus reconcile-time reloads already cover the editor.
- The model swap does not use `createModel`/`setModel`. It disposes the
  model and re-dispatches `ON_DID_OPEN_FILE`, which is exactly what
  `Monaco.tsx` does after a rename or delete. Swapping behind its back would
  leave its per-second position timer calling `getOffsetAt` on a disposed
  model.

## Global Constraints

- Everything committed is English: code, comments, commit messages, PR text.
- No edits to upstream-owned files. `client/` must stay byte-identical, and
  inside `client-v2/` do not touch `utils/explorer/*`,
  `components/Editor/Monaco/*` or `utils/program-info.ts`.
- `CONTRIBUTING.md`: 80 columns, 2-space indent, prettier; no `any`, no
  `@ts-ignore`; `import type` for types; named exports for non-components; no
  non-ASCII in source.
- Deep imports only (`../../../utils/explorer/explorer`, never the `utils`
  barrel). Jest cannot load the barrel (`GLOBAL_SETTINGS`).
- Comment density matches `features/persistence/model/*`: every exported
  function explains *why*, in full sentences.
- Commits: present tense, no prefix (`"Add ..."`). No co-author trailers and
  no mention of AI sessions.
- Proposing is automatic, applying is not. None of this adds an automatic
  state change the user did not cause: reloads only mirror what another tab
  of the same user already wrote.

## Review Focus

1. **The current workspace is renamed or deleted in the other tab.** B's
   current directory disappears. A reasonable person expects B not to crash
   and not to recreate the old name. `reloadCurrentFromDisk` returns
   `"skipped"` when the directory is gone. Pinned in Task 3 ("skips when the
   workspace directory is gone").
2. **Signed out.** Root cause 2, the stale Monaco buffer written back to
   disk, needs no account at all. A reasonable person expects two tabs to
   stay in step without being signed in. `tabSync` must not check the
   session. Pinned in Task 7 ("reloads with nobody signed in").
3. **A burst of autosaves.** A types steadily and autosaves every 500 ms, and
   B should not reload once per save. Pinned in Task 7 (the debounce test).
4. **B has typed in the same file and autosave has not run yet.** Local
   keystrokes must survive. Pinned in Task 3 ("keeps a file the user is
   typing in").
5. **Generated files only.** A's re-open rewrites
   `.workspace/program-info.json`, and B must not reload, or the two tabs
   start bouncing. Pinned in Task 3 ("ignores dotfiles") and Task 7
   (`metadata.json` is not announced).

**Known limitation, hand-check only:** re-dispatching `ON_DID_OPEN_FILE`
calls `editor.focus()` in `Monaco.tsx`. If the user is in B's terminal or
assistant box when A writes the file open in B's editor, focus jumps to the
editor. This is judged in the Task 9 hand-check and noted in the PR.

---

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `client-v2/src/features/persistence/model/editor-models.ts` | create | The only place that touches `monaco-editor`: read a model's value, drop models |
| `client-v2/src/features/persistence/model/tab-reload.ts` | create | `reloadCurrentFromDisk`: bring `PgExplorer.files` and the models in line with disk |
| `client-v2/src/features/persistence/model/tab-reload.test.ts` | create | Unit tests for the above |
| `client-v2/src/features/persistence/model/sync-lock.ts` | create | `withSyncLock`: the cross-tab Web Lock, with a fallback |
| `client-v2/src/features/persistence/model/sync-lock.test.ts` | create | Unit tests for the above |
| `client-v2/src/effects/tab-sync/tab-sync.tsx` | create | The `BroadcastChannel` effect: announce writes, reload on a neighbour's |
| `client-v2/src/effects/tab-sync/index.ts` | create | Barrel, picked up by `generate-exports` |
| `client-v2/src/effects/tab-sync/tab-sync.test.ts` | create | Unit tests for the effect |
| `client-v2/src/features/persistence/model/project-sync.ts` | modify | `adopt` reloads, `push` and `resolve` take the lock, `pushCurrent` reads disk |
| `client-v2/src/features/persistence/model/project-restore.ts` | modify | `reconcile` holds the lock and reloads first |
| `client-v2/src/features/persistence/model/snapshot.ts` | modify | `snapshotOf` always reads disk; `buildSnapshot` removed |
| `client-v2/src/features/persistence/model/{snapshot,project-sync,two-devices}.test.ts` | modify | Seed the store instead of spying on `getAllFiles` |
| `client-v2/e2e/two-tabs.e2e.spec.ts` | create | Four scenarios with two pages of one context |

---

### Task 1: Worktree and branch

**Files:** none in the repo.

- [ ] **Step 1: Create the worktree off `master-2.0`**

```bash
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground
git fetch origin master-2.0
git worktree add .claude/worktrees/hoo-1723 \
  -b slavakoreshkov/hoo-1723-stop-a-stale-tab-from-overwriting-another-tabs-work \
  origin/master-2.0
```

- [ ] **Step 2: Install the cheap toolchain**

```bash
cd .claude/worktrees/hoo-1723
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
git submodule update --init
./wasm/stub-packages.sh
cd client-v2 && yarn install && yarn generate-fast
```

Expected: `yarn install` finishes and `src/*/generated.ts` exist. If
`.env.local` is needed for the e2e dev server, ask Slava to copy it with
`! cp ...`. Secrets are not copied from a session.

- [ ] **Step 3: Baseline**

Run: `yarn test-unit src/features/persistence src/effects`
Expected: all pass. Record the count in the task report.

---

### Task 2: E2E repro for all four scenarios (failing)

Written first, so it proves the bugs exist, including root cause 4, which
the spec asks to verify before relying on it.

**Files:**
- Create: `client-v2/e2e/two-tabs.e2e.spec.ts`

**Interfaces:**
- Produces: the spec that Tasks 4, 5 and 7 turn green, with test names
  `"a tab brought back shows the other tab's edit before it can type"`,
  `"two visible tabs follow each other"`, `"switching tabs mid-debounce
  raises no conflict"` and `"taking the other version replaces a file that
  is already open"`.

- [ ] **Step 1: Write the spec**

```ts
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
  await expect(editor(page)).toContainText("// v0", LONG);
};

/** Type at the end of the open file, the way a person would */
const typeAtEnd = async (page: Page, text: string) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(`\n${text}`);
};

/** Playwright never changes visibility; fake it the way the browser reports it */
const setVisible = (page: Page, visible: boolean) =>
  page.evaluate((v) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (v ? "visible" : "hidden"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visible);

const serverLib = (row: Row) => () => row.snapshot.files[LIB] ?? "";

test("a tab brought back shows the other tab's edit before it can type", async ({
  context,
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
});

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
```

- [ ] **Step 2: Run it and confirm what fails**

Run: `yarn test-e2e e2e/two-tabs.e2e.spec.ts`
Expected: the first three FAIL. B keeps `// v0`, or the race test sees
`state.conflicts > 0` or the banner. **Record whether the fourth fails.**
If it passes, root cause 4 is not real: note that in the task report, and
Task 4 keeps the forced reopen only for the `PgProgramInfo` reason.
If `openShared` never sees `// v0` (the imported project is not opened),
check the header like `account-sync.e2e.spec.ts:106` does and click the
project in the menu. Fix the helper, not the scenarios.

- [ ] **Step 3: Commit**

```bash
git add client-v2/e2e/two-tabs.e2e.spec.ts
git commit -m "Add e2e cases for two tabs overwriting each other"
```

---

### Task 3: `reloadCurrentFromDisk` and the editor-model adapter

**Files:**
- Create: `client-v2/src/features/persistence/model/editor-models.ts`
- Create: `client-v2/src/features/persistence/model/tab-reload.ts`
- Test: `client-v2/src/features/persistence/model/tab-reload.test.ts`

**Interfaces:**
- Produces:
  - `PgEditorModels.valueOf(path: string): Promise<string | null>`
  - `PgEditorModels.drop(paths: readonly string[]): Promise<void>`
  - `PgEditorModels.dropUnder(prefix: string): Promise<void>`
  - `type ReloadResult = "skipped" | "unchanged" | "contents" | "reopened"`
  - `reloadCurrentFromDisk(opts?: { reopen?: boolean }): Promise<ReloadResult>`

- [ ] **Step 1: Write the adapter**

`editor-models.ts`:

```ts
/**
 * The persistence feature's only door into Monaco.
 *
 * Monaco keeps one model per path and `Monaco.tsx` reuses it whenever that
 * path is opened again (`onDidOpenFile`), so text written to disk underneath
 * an open tab stays invisible -- and the next autosave writes the old text
 * back. Anything that replaces files under a live editor has to drop those
 * models; this is where that happens.
 *
 * Loaded lazily, as `playground-bridge.ts` does, so nothing here pulls the
 * editor into a bundle or a test that never needed it.
 */
const models = async () => (await import("monaco-editor")).editor.getModels();

export const PgEditorModels = {
  /** @returns the model's current text, or `null` when there is no model */
  async valueOf(path: string): Promise<string | null> {
    const model = (await models()).find((m) => m.uri.path === path);
    return model ? model.getValue() : null;
  },

  /**
   * Dispose the models for these paths, so the next open builds them from
   * the explorer's state. Disposing is not an edit: no content-change event
   * fires, so no autosave writes anything back.
   */
  async drop(paths: readonly string[]) {
    const wanted = new Set(paths);
    for (const model of await models()) {
      if (wanted.has(model.uri.path)) model.dispose();
    }
  },

  /** `drop` for every model under a directory, trailing slash included */
  async dropUnder(prefix: string) {
    for (const model of await models()) {
      if (model.uri.path.startsWith(prefix)) model.dispose();
    }
  },
};
```

- [ ] **Step 2: Write the failing tests**

`tab-reload.test.ts`:

```ts
import { reloadCurrentFromDisk } from "./tab-reload";
import { PgEditorModels } from "./editor-models";
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

jest.mock("./editor-models", () => ({
  PgEditorModels: {
    valueOf: jest.fn(async () => null),
    drop: jest.fn(async () => {}),
    dropUnder: jest.fn(async () => {}),
  },
}));

const store = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

/** What this tab holds in memory, keyed the way the explorer keys it */
let memory: Record<string, { content?: string }>;

beforeEach(() => {
  store().clear();
  memory = { "/alpha/src/lib.rs": { content: "old" } };
  store().set("/alpha/src/lib.rs", "old");
  jest
    .spyOn(PgExplorer, "currentWorkspaceName", "get")
    .mockReturnValue("alpha");
  jest.spyOn(PgExplorer, "isTemporary", "get").mockReturnValue(false);
  jest
    .spyOn(PgExplorer, "files", "get")
    .mockImplementation(() => memory as typeof PgExplorer.files);
  jest
    .spyOn(PgExplorer, "getCurrentFile")
    .mockImplementation(() => ({ path: "/alpha/src/lib.rs", ...memory["/alpha/src/lib.rs"] }) as ReturnType<typeof PgExplorer.getCurrentFile>);
  jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue(undefined);
  jest.spyOn(PgCommon, "createAndDispatchCustomEvent");
});

afterEach(() => jest.restoreAllMocks());

const dispatched = () =>
  (PgCommon.createAndDispatchCustomEvent as jest.Mock).mock.calls.map(
    ([name]) => name
  );

describe("reloadCurrentFromDisk", () => {
  it("does nothing when memory already matches disk", async () => {
    expect(await reloadCurrentFromDisk()).toBe("unchanged");
    expect(PgEditorModels.drop).not.toHaveBeenCalled();
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });

  it("takes another tab's edit into state and the editor, quietly", async () => {
    store().set("/alpha/src/lib.rs", "from the other tab");

    expect(await reloadCurrentFromDisk()).toBe("contents");
    expect(memory["/alpha/src/lib.rs"].content).toBe("from the other tab");
    expect(PgEditorModels.drop).toHaveBeenCalledWith(["/alpha/src/lib.rs"]);
    // The open file is re-announced so the editor rebuilds its model...
    expect(dispatched()).toContain(PgExplorer.events.ON_DID_OPEN_FILE);
    // ...and nothing that schedules an upload fires
    expect(dispatched()).not.toContain(PgExplorer.events.ON_DID_SAVE_FILE);
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });

  it("keeps a file the user is typing in", async () => {
    store().set("/alpha/src/lib.rs", "from the other tab");
    (PgEditorModels.valueOf as jest.Mock).mockResolvedValueOnce("typing");

    expect(await reloadCurrentFromDisk()).toBe("unchanged");
    expect(memory["/alpha/src/lib.rs"].content).toBe("old");
    expect(PgEditorModels.drop).not.toHaveBeenCalled();
  });

  it("re-opens when the other tab changed which files exist", async () => {
    store().set("/alpha/src/new.rs", "created elsewhere");

    expect(await reloadCurrentFromDisk()).toBe("reopened");
    expect(PgEditorModels.dropUnder).toHaveBeenCalledWith("/alpha/");
    expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
  });

  it("re-opens on request even when nothing differs", async () => {
    expect(await reloadCurrentFromDisk({ reopen: true })).toBe("reopened");
    expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
  });

  it("ignores dotfiles, which the in-memory tree never holds", async () => {
    store().set("/alpha/.workspace/program-info.json", "{}");

    expect(await reloadCurrentFromDisk()).toBe("unchanged");
  });

  it("skips a temporary workspace, which has nothing on disk", async () => {
    jest.spyOn(PgExplorer, "isTemporary", "get").mockReturnValue(true);
    store().set("/alpha/src/lib.rs", "irrelevant");

    expect(await reloadCurrentFromDisk()).toBe("skipped");
  });

  it("skips when the workspace directory is gone", async () => {
    // Renamed or deleted in the other tab: recreating it would be worse
    store().clear();

    expect(await reloadCurrentFromDisk()).toBe("skipped");
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn test-unit src/features/persistence/model/tab-reload.test.ts`
Expected: FAIL with "Cannot find module './tab-reload'".

- [ ] **Step 4: Implement `tab-reload.ts`**

```ts
import { PgEditorModels } from "./editor-models";
// Deep imports, not the `utils` barrel, for the reason `snapshot.ts` gives
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

export type ReloadResult = "skipped" | "unchanged" | "contents" | "reopened";

/**
 * Every file the explorer's in-memory tree could hold, read off the store.
 *
 * Only names `isItemNameValid` accepts: the tree never holds a dotfile, so
 * `.workspace/` and `.tutorial.json` changing -- which `PgProgramInfo` does on
 * every open -- is not a difference this tab can or should act on. That is
 * also what stops two tabs from reloading each other in a loop.
 *
 * @returns full paths to contents, or `null` when the directory is gone
 */
const readTree = async (root: string) => {
  const files: Record<string, string> = {};

  const walk = async (dir: string) => {
    for (const child of await PgFs.readDir(dir)) {
      if (!PgExplorer.isItemNameValid(child)) continue;
      const path = `${dir}/${child}`;
      if ((await PgFs.getMetadata(path)).isDirectory()) await walk(path);
      else files[path] = await PgFs.readToString(path);
    }
  };

  try {
    await walk(root);
  } catch {
    return null;
  }
  return files;
};

/** The current workspace as this tab holds it: files only, not empty dirs */
const inMemory = () => {
  const files: Record<string, string> = {};
  for (const [path, item] of Object.entries(PgExplorer.files)) {
    if (!path.endsWith("/") && item.content !== undefined) {
      files[path] = item.content;
    }
  }
  return files;
};

const sameKeys = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).sort().join("\n") === Object.keys(b).sort().join("\n");

const reloadOnce = async (reopen: boolean): Promise<ReloadResult> => {
  const name = PgExplorer.currentWorkspaceName;
  if (!name || PgExplorer.isTemporary) return "skipped";

  const disk = await readTree(`/${name}`);
  if (!disk) return "skipped";
  // The user may have switched projects while the store was being read
  if (PgExplorer.currentWorkspaceName !== name) return "skipped";

  const memory = inMemory();

  if (reopen || !sameKeys(disk, memory)) {
    // The models first: `switchWorkspace` re-reads state from disk, but the
    // editor reuses any model it already has for a path, so without this a
    // file that was open keeps showing the text that was just replaced
    await PgEditorModels.dropUnder(`/${name}/`);
    await PgExplorer.switchWorkspace(name);
    return "reopened";
  }

  const changed: string[] = [];
  for (const [path, content] of Object.entries(disk)) {
    if (memory[path] === content) continue;
    // A model that differs from state holds keystrokes autosave has not
    // written yet. They are this tab's, and newer than anything on disk.
    const typed = await PgEditorModels.valueOf(path);
    if (typed !== null && typed !== memory[path]) continue;

    // Straight into state, not `saveFileToState`: that dispatches the save
    // event, which schedules an upload of what another tab already uploaded
    PgExplorer.files[path].content = content;
    changed.push(path);
  }
  if (!changed.length) return "unchanged";

  await PgEditorModels.drop(changed);
  const open = PgExplorer.getCurrentFile();
  if (open && changed.includes(open.path)) {
    // What `switchWorkspace` does to show a file: `Monaco.tsx` answers by
    // building the model again from state, and restarts its position timer
    // against the new model rather than the disposed one
    PgCommon.createAndDispatchCustomEvent(
      PgExplorer.events.ON_DID_OPEN_FILE,
      open
    );
  }
  return "contents";
};

let queue: Promise<ReloadResult> = Promise.resolve("skipped");

/**
 * Bring the workspace this tab has open back in line with the store.
 *
 * Tabs share IndexedDB but each holds the current workspace in memory, so a
 * tab that another tab has written underneath goes on showing -- and
 * uploading, and autosaving -- the old copy. Disk is the one place both tabs
 * agree on, file by file, because an edit reaches it straight after it
 * reaches state.
 *
 * Contents alone are taken quietly: no switch, no reconcile, no upload. A
 * change in which files exist re-opens the workspace, which is rare and worth
 * its cost.
 *
 * Serialized: a reload asked for while one runs waits for it, then looks
 * again, because what it read may already be out of date.
 *
 * @param opts -
 * - `reopen`: re-open even when only contents differ. `adopt` needs it,
 *   because the adopted snapshot also carries the program keypair, and only
 *   a switch makes `PgProgramInfo` read that again.
 */
export const reloadCurrentFromDisk = (
  opts: { reopen?: boolean } = {}
): Promise<ReloadResult> => {
  const run = () => reloadOnce(opts.reopen === true);
  queue = queue.then(run, run);
  return queue;
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test-unit src/features/persistence/model/tab-reload.test.ts`
Expected: 8 passed. If the `files` getter spy is refused as not
configurable, replace it with
`Object.defineProperty(PgExplorer, "files", { get: () => memory, configurable: true })`,
restored in `afterEach`. If `PgExplorer.getCurrentFile` depends on tabs,
the spy above already bypasses that.

- [ ] **Step 6: Types and format**

Run: `yarn test-types && npx prettier --check src/features/persistence/model`
Expected: clean. If the cast inside `getCurrentFile`'s mock is over 80
columns, let prettier wrap it.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/features/persistence/model/editor-models.ts \
  client-v2/src/features/persistence/model/tab-reload.ts \
  client-v2/src/features/persistence/model/tab-reload.test.ts
git commit -m "Add a reload that brings the open workspace in line with disk"
```

---

### Task 4: `adopt` re-opens through the reload

**Files:**
- Modify: `client-v2/src/features/persistence/model/project-sync.ts`
  (`adopt`, the block ending `await PgExplorer.switchWorkspace(local);`)
- Modify: `client-v2/src/features/persistence/model/project-sync.test.ts`,
  `two-devices.test.ts`, `project-restore.test.ts` (mock the adapter)

**Interfaces:**
- Consumes: `reloadCurrentFromDisk({ reopen: true })` from Task 3.

- [ ] **Step 1: Write the failing test** (in `project-sync.test.ts`, inside
  the existing `describe`, next to the other `adopt` cases)

```ts
it("drops the editor's models when it adopts the open workspace", async () => {
  global.fetch = jest.fn().mockImplementation((url: string) =>
    url === "/api/sync"
      ? Promise.resolve(okProbe)
      : Promise.resolve({
          ok: true,
          json: async () => ({
            project: {
              id: "p1",
              name: "alpha",
              kind: "project",
              updatedAt: "t2",
              snapshot: { files: { "src/lib.rs": "theirs" } },
            },
          }),
        })
  ) as unknown as typeof fetch;
  await signedIn();
  jest.spyOn(PgExplorer, "workspaceNameOf").mockReturnValue("alpha");
  jest
    .spyOn(PgExplorer, "currentWorkspaceName", "get")
    .mockReturnValue("alpha");
  jest.spyOn(PgExplorer, "replaceWorkspaceFiles").mockResolvedValue();
  jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue();
  storedFiles().set("/alpha/src/lib.rs", "theirs");

  expect(await PgProjectSync.adopt("p1")).toBe("alpha");
  expect(PgEditorModels.dropUnder).toHaveBeenCalledWith("/alpha/");
  expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
});
```

Add at the top of the file:

```ts
import { PgEditorModels } from "./editor-models";

jest.mock("./editor-models", () => ({
  PgEditorModels: {
    valueOf: jest.fn(async () => null),
    drop: jest.fn(async () => {}),
    dropUnder: jest.fn(async () => {}),
  },
}));
```

Add the same `jest.mock` block (without the import) to `two-devices.test.ts`
and `project-restore.test.ts`, so no test ever loads `monaco-editor`.

- [ ] **Step 2: Run to verify it fails**

Run: `yarn test-unit src/features/persistence/model/project-sync.test.ts -t "drops the editor"`
Expected: FAIL, `dropUnder` not called.

- [ ] **Step 3: Implement**

In `adopt`, replace

```ts
    if (local === PgExplorer.currentWorkspaceName) {
      await PgExplorer.switchWorkspace(local);
    }
```

with

```ts
    // Through the reload rather than a bare switch: the editor reuses any
    // model it already has for a path, so a switch alone left a file that
    // was open showing the version the user had just chosen to discard, and
    // the next autosave wrote it back. Forced, because the adopted snapshot
    // also carries the program keypair, and only a switch re-reads it.
    if (local === PgExplorer.currentWorkspaceName) {
      await reloadCurrentFromDisk({ reopen: true });
    }
```

and add `import { reloadCurrentFromDisk } from "./tab-reload";` with the
other local imports. Update the long comment above the block so that it
names the model cache, which was the missing half.

- [ ] **Step 4: Run the persistence suite**

Run: `yarn test-unit src/features/persistence src/effects`
Expected: all pass. The earlier `adopt` tests that spied `switchWorkspace`
still see it called once.

- [ ] **Step 5: Run the e2e regression**

Run: `yarn test-e2e e2e/two-tabs.e2e.spec.ts -g "already open"` and
`yarn test-e2e e2e/account-sync.e2e.spec.ts`
Expected: PASS on both.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/features/persistence/model
git commit -m "Show the adopted version in a file that was already open"
```

---

### Task 5: One cross-tab lock around deciding and writing

**Files:**
- Create: `client-v2/src/features/persistence/model/sync-lock.ts`
- Test: `client-v2/src/features/persistence/model/sync-lock.test.ts`
- Modify: `project-restore.ts` (`reconcile`), `project-sync.ts` (`push`,
  `pushCurrent`, `resolve`)

**Interfaces:**
- Consumes: `reloadCurrentFromDisk()` from Task 3.
- Produces: `withSyncLock<T>(fn: () => Promise<T>): Promise<T>` and
  `SYNC_LOCK = "pg-project-sync"`.
- Contract: **a caller holding the lock passes `immediate: true` to
  `push`.** Web Locks are not re-entrant, so taking the lock again would
  deadlock. `reconcile` already passes it; `resolve` and `pushCurrent` start
  to.

- [ ] **Step 1: Write the failing tests**

`sync-lock.test.ts`:

```ts
import { SYNC_LOCK, withSyncLock } from "./sync-lock";

const setLocks = (locks: unknown) =>
  Object.defineProperty(navigator, "locks", {
    value: locks,
    configurable: true,
  });

afterEach(() => setLocks(undefined));

describe("withSyncLock", () => {
  it("runs directly where the browser has no Web Locks", async () => {
    setLocks(undefined);
    expect(await withSyncLock(async () => 7)).toBe(7);
  });

  it("asks for the one shared lock by name", async () => {
    const request = jest.fn((_name: string, fn: () => Promise<unknown>) =>
      fn()
    );
    setLocks({ request });

    expect(await withSyncLock(async () => "done")).toBe("done");
    expect(request).toHaveBeenCalledWith(SYNC_LOCK, expect.any(Function));
  });

  it("serializes holders, which is the whole point", async () => {
    let tail: Promise<unknown> = Promise.resolve();
    setLocks({
      request: (_name: string, fn: () => Promise<unknown>) => {
        const run = tail.then(fn);
        tail = run.catch(() => {});
        return run;
      },
    });

    const order: string[] = [];
    let release!: () => void;
    const first = withSyncLock(async () => {
      order.push("first:start");
      await new Promise<void>((done) => (release = done));
      order.push("first:end");
    });
    const second = withSyncLock(async () => {
      order.push("second");
    });
    await Promise.resolve();
    release();
    await Promise.all([first, second]);

    expect(order).toEqual(["first:start", "first:end", "second"]);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn test-unit src/features/persistence/model/sync-lock.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `sync-lock.ts`**

```ts
/** One name for the whole origin: every tab decides against the same marks */
export const SYNC_LOCK = "pg-project-sync";

/**
 * Run `fn` while no other tab of this browser is deciding or writing.
 *
 * Tabs share the sync marks, so a reconcile in one tab and an upload in
 * another read and write the same state in whatever order they happen to
 * run. The tab-switch race came from exactly that: B listed the account
 * before A's flush landed and read the mark after it, and so saw a
 * divergence that was only A's own edit in flight.
 *
 * Not re-entrant -- no Web Lock is. A caller that already holds it says so
 * to `push` with `immediate`, which is the same promise `reconcile` makes
 * about the push gate.
 *
 * Where the browser has no Web Locks (jsdom, very old engines) `fn` just
 * runs. That loses cross-tab ordering, not correctness within a tab.
 */
export const withSyncLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const locks =
    typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return await fn();
  return (await locks.request(SYNC_LOCK, fn)) as T;
};
```

- [ ] **Step 4: Run to verify they pass**

Run: `yarn test-unit src/features/persistence/model/sync-lock.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Wire the lock in**

`project-restore.ts`: rename the existing `export const reconcile = async ()`
to `const reconcileUnlocked = async ()`. Make the reload its first
statement, after `const result = empty();` and before the `isAvailable`
check:

```ts
  // Before anything reads the current workspace. This is the backstop for
  // a neighbour's write this tab never heard about -- a message lost, or a
  // tab opened before tabs announced writes at all -- and it is what makes
  // the fast path below safe: that path trusts memory, which is only true
  // once memory matches disk.
  await reloadCurrentFromDisk();
```

Then export the locked wrapper, keeping the existing JSDoc on it:

```ts
export const reconcile = (): Promise<SyncResult> =>
  withSyncLock(reconcileUnlocked);
```

`project-sync.ts`, `push`: after the `_conflicts` check, wrap everything
from `const mark = await PgSyncMark.read(projectId);` to the end of the
`try`/`catch` in `const send = async (): Promise<PushResult> => { ... };`,
then

```ts
    // Held from reading the mark to writing the new one, so no other tab
    // can decide against a mark that is about to change. A caller already
    // inside the lock says so with `immediate`.
    return opts.immediate ? await send() : await withSyncLock(send);
```

`pushCurrent`: build the snapshot inside the lock and push with
`immediate`, so the disk read in Task 6 cannot observe another tab's
half-finished `replaceWorkspaceFiles`:

```ts
  static async pushCurrent(): Promise<PushResult> {
    const id = PgExplorer.currentWorkspaceId;
    if (!id) return "skipped";
    if (!(await PgProjectSync._ready())) return "skipped";
    await PgProjectSync._gate;

    return await withSyncLock(async () => {
      const snapshot = await buildSnapshot();
      // (existing empty-snapshot guard and its comment, unchanged)
      if (!Object.keys(snapshot.files).length) {
        report(`push project ${id}: refused an empty snapshot`, null);
        return "skipped";
      }
      return await PgProjectSync.push(
        id,
        snapshot,
        PgExplorer.currentWorkspaceName,
        { immediate: true }
      );
    });
  }
```

`resolve`: wrap the body of the `try` in
`return await withSyncLock(async () => { switch (...) { ... } });`, and add
`immediate: true` to its two `push` calls: `{ force: true, immediate: true }`
in `keep-local`, and `{ immediate: true }` in `retry`. The TypeScript switch
has no default, so make the lambda's return type
`Promise<boolean>` explicit.

Add the imports: `withSyncLock` in both files, and `reloadCurrentFromDisk`
in `project-restore.ts`.

- [ ] **Step 6: Run the suites**

Run: `yarn test-unit src/features/persistence src/effects`
Expected: all pass. jsdom has no `navigator.locks`, so every existing test
takes the fallback. A test that counts `push` calls through
`pushCurrent` still sees one. Watch `two-devices.test.ts` in particular:
where it mocks `currentWorkspaceName` and seeds the store, the new
reconcile-time reload sees memory (the real, empty `PgExplorer.files`)
differ from disk and calls the real `switchWorkspace`. Stub it there with
`jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue()`, and
change no assertion.

- [ ] **Step 7: Run the race e2e**

Run: `yarn test-e2e e2e/two-tabs.e2e.spec.ts -g "mid-debounce"`
Expected: PASS. If it still sees a conflict, add an e2e-only diagnostic
(`window.__pgSyncDiagnostics.failures()`) to the report before changing
code.

- [ ] **Step 8: Commit**

```bash
git add client-v2/src/features/persistence/model
git commit -m "Hold one lock across tabs while syncing decides and writes"
```

---

### Task 6: Upload what is on disk

**Files:**
- Modify: `client-v2/src/features/persistence/model/snapshot.ts`
  (`buildSnapshot`, `snapshotOf`)
- Modify: `project-sync.ts` (`pushCurrent`), plus the tests that spy on
  `getAllFiles`: `snapshot.test.ts:37-93,136-165`,
  `project-sync.test.ts:345,531,573,665`,
  `two-devices.test.ts:144,271,366`

**Interfaces:**
- Produces: `snapshotOf(name)` reads from the store for every workspace;
  `buildSnapshot` no longer exists.

- [ ] **Step 1: Turn the memory test around** (in `snapshot.test.ts`)

Replace `"reads the current workspace from memory, where the edit is"`
with:

```ts
  it("reads the current workspace off the store too", async () => {
    // Memory is per tab and disk is shared, so memory is the copy that can
    // be stale. An edit reaches disk straight after state, so nothing the
    // user typed is missing from here by the time a push runs.
    store.set("/alpha/src/lib.rs", "what is on disk");

    expect((await snapshotOf("alpha")).files["src/lib.rs"]).toBe(
      "what is on disk"
    );
  });
```

Delete the `describe("buildSnapshot", ...)` block. Move any of its cases
that `buildSnapshotOf` does not already cover (the `.workspace/` filtering
and `metadata.json` exclusion) into the `buildSnapshotOf` block, seeding
`store` instead of spying on `getAllFiles`.

- [ ] **Step 2: Run to verify it fails**

Run: `yarn test-unit src/features/persistence/model/snapshot.test.ts`
Expected: FAIL, it returns `"unsaved edit"`.

- [ ] **Step 3: Implement**

In `snapshot.ts`, delete `buildSnapshot` and make `snapshotOf` read the
store:

```ts
/**
 * Serialize a workspace, current or not, off the store.
 *
 * The current one used to come from memory, on the grounds that an unsaved
 * edit lives there. It does not stay there: autosave writes state and disk in
 * the same callback. What memory does hold, and disk does not, is a stale
 * copy -- tabs share the store but not each other's state, so a tab another
 * tab has written underneath would upload its old files over the new ones.
 */
export const snapshotOf = (name: string): Promise<Snapshot> =>
  buildSnapshotOf(name);
```

Delete the `PgExplorer` import if nothing else in the file uses it.
In `pushCurrent`, replace `await buildSnapshot()` with
`await snapshotOf(PgExplorer.currentWorkspaceName!)` (already inside the
lock from Task 5) and update the empty-snapshot comment: the window it
describes is now `replaceWorkspaceFiles` between its `removeDir` and its
writes. The lock serializes that within this browser. Fix the import list.

- [ ] **Step 4: Migrate the tests that spied on `getAllFiles`**

For every `jest.spyOn(PgExplorer, "getAllFiles").mockReturnValue([[path, content], ...])`
in `project-sync.test.ts` and `two-devices.test.ts`, seed the store instead:

```ts
for (const [path, content] of [["/alpha/src/lib.rs", "v1"]] as const) {
  storedFiles().set(path, content);
}
```

The full paths stay as they were, because `buildSnapshotOf` strips
`/<name>/` the same way. Where a test mocked an empty `getAllFiles` to hit
the empty-snapshot guard (`project-sync.test.ts:573`), leave the store
empty for that workspace. Keep each test's assertion unchanged: if an
assertion has to change, the behaviour changed, so stop and report it.

- [ ] **Step 5: Run the suites**

Run: `yarn test-unit src/features/persistence src/effects && yarn test-types`
Expected: all pass. `grep -rn "buildSnapshot\b" src` returns nothing.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/features/persistence/model
git commit -m "Build uploads from disk, which tabs share, not from memory"
```

---

### Task 7: Tabs announce writes to each other

**Files:**
- Create: `client-v2/src/effects/tab-sync/tab-sync.tsx`
- Create: `client-v2/src/effects/tab-sync/index.ts`
- Test: `client-v2/src/effects/tab-sync/tab-sync.test.ts`

**Interfaces:**
- Consumes: `reloadCurrentFromDisk()` from Task 3.
- Produces: `tabSync(): Disposable`, mounted by `EFFECTS` after
  `yarn generate-exports`. Channel `"pg-workspace-sync"`, message
  `{ type: "files-written"; projectId: string; from: string }`.

- [ ] **Step 1: Write the failing tests**

`tab-sync.test.ts`:

```ts
import { tabSync } from "./tab-sync";
import { reloadCurrentFromDisk } from "../../features/persistence/model/tab-reload";
import { PgExplorer } from "../../utils/explorer/explorer";
import { PgFs } from "../../utils/explorer/fs";

jest.mock("../../features/persistence/model/tab-reload", () => ({
  reloadCurrentFromDisk: jest.fn(async () => "unchanged"),
}));

/** Every channel opened in this test, so one can talk to another */
const opened: FakeChannel[] = [];
class FakeChannel {
  posted: unknown[] = [];
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  constructor(public name: string) {
    opened.push(this);
  }
  postMessage(data: unknown) {
    this.posted.push(data);
  }
  close() {}
}

const deliver = (data: unknown) =>
  opened.forEach((channel) => channel.onmessage?.({ data }));

beforeEach(() => {
  jest.useFakeTimers();
  opened.length = 0;
  Object.defineProperty(globalThis, "BroadcastChannel", {
    value: FakeChannel,
    configurable: true,
  });
  jest.spyOn(PgExplorer, "allWorkspaceNames", "get").mockReturnValue(["alpha"]);
  jest.spyOn(PgExplorer, "workspaceIdOf").mockReturnValue("p1");
  jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue("p1");
  (reloadCurrentFromDisk as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("tabSync", () => {
  it("announces a write once per burst, naming the project", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/src/lib.rs", "a");
    await PgFs.writeFile("/alpha/src/lib.rs", "ab");
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([
      expect.objectContaining({ type: "files-written", projectId: "p1" }),
    ]);
    effect.dispose();
  });

  it("does not announce the tabs-and-cursors file", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/.workspace/metadata.json", "[]");
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([]);
    effect.dispose();
  });

  it("reloads when a neighbour wrote the open project", () => {
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("ignores a neighbour's write to another project", () => {
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p2", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("ignores its own announcements", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/src/lib.rs", "a");
    jest.advanceTimersByTime(300);
    deliver(opened[0].posted[0]);
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("reloads with nobody signed in", () => {
    // Nothing here asks the session: the on-disk overwrite this prevents
    // needs no account at all
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("is inert where the browser has no BroadcastChannel", () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: undefined,
      configurable: true,
    });
    expect(() => tabSync().dispose()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn test-unit src/effects/tab-sync`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`index.ts`:

```ts
export * from "./tab-sync";
```

`tab-sync.tsx`:

```ts
import { report } from "../../features/persistence/model/diagnostics";
import { reloadCurrentFromDisk } from "../../features/persistence/model/tab-reload";
import { PgFs } from "../../utils/explorer/fs";
// Deep import rather than the `utils` barrel, for the reason
// `project-sync.tsx` gives
import { PgExplorer } from "../../utils/explorer/explorer";
import type { Disposable } from "../../utils/types";

const CHANNEL = "pg-workspace-sync";

/** Long enough that a run of autosaves is one message */
const ANNOUNCE_MS = 250;
/** Long enough that a run of messages is one reload */
const RELOAD_MS = 300;

interface FilesWritten {
  type: "files-written";
  projectId: string;
  from: string;
}

const isFilesWritten = (data: unknown): data is FilesWritten =>
  (data as FilesWritten)?.type === "files-written" &&
  typeof (data as FilesWritten).projectId === "string";

/**
 * Which project a written path belongs to, if it is worth announcing.
 *
 * Not only the current one: an import, or an adopt of a project in the
 * background, writes elsewhere -- and the neighbour may have that one open.
 * `metadata.json` is the one file left out. It holds this tab's open tabs and
 * cursor, it is rewritten on every open, and no other tab has any use for it.
 */
const projectOfPath = (path: string): string | null => {
  const name = path.split("/")[1];
  if (!name || !PgExplorer.allWorkspaceNames?.includes(name)) return null;
  if (path === `/${name}/.workspace/metadata.json`) return null;
  return PgExplorer.workspaceIdOf(name) ?? null;
};

/**
 * Keep tabs of one browser from working on each other's old copies.
 *
 * Tabs share the store but not each other's memory, so a tab showing a
 * project another tab has written goes on showing the old text -- and the
 * next autosave in it writes the old text back, file by file, before sync is
 * ever involved. Visibility cannot catch it: two windows side by side are
 * both visible the whole time. So each tab says when it has written, and a
 * tab that has the same project open re-reads it.
 *
 * Deliberately independent of the session. The overwrite on disk needs no
 * account, and neither does the fix.
 *
 * Where the browser has no `BroadcastChannel` this does nothing; the reload
 * at the start of every reconcile still catches up on focus.
 */
export const tabSync = (): Disposable => {
  if (typeof BroadcastChannel !== "function") return { dispose: () => {} };

  const channel = new BroadcastChannel(CHANNEL);
  const self = crypto.randomUUID();

  const pending = new Set<string>();
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  const announce = (projectId: string | null | undefined) => {
    if (!projectId) return;
    pending.add(projectId);
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      for (const id of pending) {
        const message: FilesWritten = {
          type: "files-written",
          projectId: id,
          from: self,
        };
        channel.postMessage(message);
      }
      pending.clear();
    }, ANNOUNCE_MS);
  };

  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  channel.onmessage = ({ data }) => {
    if (!isFilesWritten(data) || data.from === self) return;
    if (data.projectId !== PgExplorer.currentWorkspaceId) return;

    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      reloadCurrentFromDisk().catch((e) => report("reload from tab", e));
    }, RELOAD_MS);
  };

  // Writes cover edits and the three dotfiles. Deletes and renames reach the
  // store without a write, so the tree's own events cover those.
  const current = () => announce(PgExplorer.currentWorkspaceId);
  const subscriptions = [
    PgFs.onDidWriteFile((path) => announce(projectOfPath(path))),
    PgExplorer.onDidDeleteItem(current),
    PgExplorer.onDidRenameItem(current),
  ];

  return {
    dispose: () => {
      if (announceTimer) clearTimeout(announceTimer);
      if (reloadTimer) clearTimeout(reloadTimer);
      for (const sub of subscriptions) sub.dispose();
      channel.close();
    },
  };
};
```

- [ ] **Step 4: Run to verify they pass**

Run: `yarn test-unit src/effects/tab-sync`
Expected: 7 passed. If `crypto.randomUUID` is missing under jsdom, the
`setupTests` polyfill installs `webcrypto` only when `subtle` is absent.
In that case, fall back to
`Math.random().toString(36).slice(2)` guarded by
`typeof crypto.randomUUID === "function"`, and say why in a comment.

- [ ] **Step 5: Mount it**

Run: `yarn generate-exports && grep tab-sync src/effects/generated.ts`
Expected: `export * from "./tab-sync";` is present (the file is
gitignored, so nothing is committed for it).

- [ ] **Step 6: Run the side-by-side and the full two-tab spec**

Run: `yarn test-e2e e2e/two-tabs.e2e.spec.ts`
Expected: all four PASS.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/effects/tab-sync
git commit -m "Tell other tabs when a project's files are written"
```

---

### Task 8: Records

**Files:** on `context-archive`
(`.claude/worktrees/context-archive`): `docs/decisions.md`,
`docs/superpowers/specs/2026-09-28-stale-tab-writer-design.md`. That
worktree carries other sessions' uncommitted edits, so stage **only** these
paths.

- [ ] **Step 1: Add the D-entry**

Take the next free number (`grep -oE "^## D[0-9]+" docs/decisions.md | tail -1`;
D49 at the time of writing). Match the house format: title, date, status,
then context, the decision, the options rejected, and when to revisit. Its
content is the spec's "Records" section plus the four planning deviations
above.

- [ ] **Step 2: Amend the spec**

Add a short "Amended while planning" section that lists the four
deviations, and correct part 4 (no reload on a disk/memory mismatch) and
the "Interaction with PR #36" section (`session.tsx` is untouched).

- [ ] **Step 3: Commit locally, do not push**

```bash
git add docs/decisions.md docs/superpowers/specs/2026-09-28-stale-tab-writer-design.md
git commit -m "Record the cross-tab sync decision"
```

The push waits on Slava: the branch carries an unpushed screenshots commit
from the PR #32 round.

---

### Task 9: Verify the whole branch

- [ ] **Step 1: The full gate**

```bash
cd client-v2
yarn test-types
npx prettier --check "src/**/*.{ts,tsx}" "e2e/**/*.ts"
yarn test-unit
yarn test-e2e e2e/two-tabs.e2e.spec.ts e2e/account-sync.e2e.spec.ts
```

Expected: all green. Report the unit count against the Task 1 baseline.

- [ ] **Step 2: Hand-check with two real windows side by side**

Run `yarn dev`, sign in with the working OAuth app, and open one project in
two windows placed side by side.
1. Type in A and watch B follow within about a second.
2. Type in B and watch A follow.
3. Put the cursor in B's terminal, type in A, and note whether B's focus
   jumps to the editor (Review Focus: the known limitation).
4. Create a file in A and check it appears in B's tree.
5. Reload both windows and check that no edit is lost.

Record the results, with screenshots, per the PR description contract
(before and after images go on `context-archive`).

- [ ] **Step 3: Confirm the upstream boundary**

Run: `git diff --stat origin/master-2.0 -- client/ client-v2/src/utils client-v2/src/components`
Expected: empty.
