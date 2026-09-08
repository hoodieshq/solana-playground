# Upstream demo-path port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `client-v2` level with `master-2.0`'s `client/` on the three demo-path changes: the `bundle` route, SIMD-0431 in deploy, and the sandboxed `unstable` routes behind a setting.

**Architecture:** Every touched file is byte-identical to some upstream commit today (checked by blob on 2026-09-08) except `explorer.ts` and `common.ts`, so upstream's versions are taken whole where possible, with two fork edits: the unstable flag reads a setting, and the deploy length arithmetic is a pure module beside `deploy.ts`. Tests sit beside the code; `PgExplorer.fs` and `fetch` are faked.

**Tech Stack:** React 17 / CRA 5 + craco, TypeScript, Jest (jsdom) via `craco test`, prettier (80 cols, CI-enforced).

**Spec:** `docs/superpowers/specs/2026-09-08-upstream-demo-path-port-design.md` on `context-archive`.

## Global Constraints

- Branch `feat/upstream-demo-path` off `master-2.0`, worktree `.claude/worktrees/upstream-demo-path`. Node 22: `export PATH=$HOME/.nvm/versions/node/v22.23.2/bin:$PATH`. All commands below run from `client-v2/` in that worktree.
- Never commit `CLAUDE.md`, `AGENTS.md` or `docs/` to this branch; they live on `context-archive`.
- Sole author is Slava; no co-author trailers, no AI mentions. Commits are signed (`commit.gpgsign=true`, ssh).
- CONTRIBUTING.md: 80 columns, 2-space indent, no `any`, no `@ts-ignore`, `import type` for types, `PgWeb3` not `@solana/web3.js`, named exports for non-components, no non-ASCII in source.
- Commit messages: present tense, no prefix for client changes.
- Upstream sources are read with `git show master-2.0:client/<path>` from the worktree; `client/` itself is never edited.
- `PgSettings.experimental.unstable` defaults to `false` in every environment (D37).
- Baseline before any change: 27 suites / 242 tests green (`CI=true yarn test-unit`).

---

### Task 1: Workspace constant and the recursive-removal fix

Ports `346adeae` and `837732bc`. No new test: `PgFs` runs on `lightning-fs`, which needs IndexedDB, absent from jsdom; Task 4's fake exercises the path shape.

**Files:**
- Modify: `src/utils/explorer/explorer.ts` (the `PATHS` block near line 1345)
- Modify: `src/utils/explorer/fs.ts`
- Modify: `src/utils/program-info.ts:58`
- Modify: `src/utils/tutorial/tutorial.ts:346`

**Interfaces:**
- Produces: `PgExplorer.PATHS.WORKSPACE_DIRNAME === ".workspace"`, used by Task 4.

- [ ] **Step 1: Add the constant**

In `src/utils/explorer/explorer.ts`, inside `static readonly PATHS = {`, after `TESTS_DIRNAME: "tests",` add:

```ts
    WORKSPACE_DIRNAME: ".workspace",
```

- [ ] **Step 2: Use it in program-info and tutorial**

`src/utils/program-info.ts`: replace `PATH: ".workspace/program-info.json",` with

```ts
  PATH: PgCommon.joinPaths(
    PgExplorer.PATHS.WORKSPACE_DIRNAME,
    "program-info.json"
  ),
```

Check `PgExplorer` and `PgCommon` are imported at the top of the file (upstream imports them from `./explorer` and `./common`); add the import if missing.

`src/utils/tutorial/tutorial.ts`: replace the `_PATH` line and the two `// TODO` lines above it with

```ts
      private static _PATH = PgCommon.joinPaths(
        PgExplorer.PATHS.WORKSPACE_DIRNAME,
        "tutorial-storage.json"
      );
```

- [ ] **Step 3: Apply the fs fix**

Take upstream's file whole, it has no fork edits:

```bash
git show master-2.0:client/src/utils/explorer/fs.ts > src/utils/explorer/fs.ts
```

Verify the diff is only `837732bc`: `git diff src/utils/explorer/fs.ts` shows the `PgCommon` import, `joinPaths` in `recursivelyRmdir`, and the `exists` error branch.

- [ ] **Step 4: Type-check and test**

Run: `yarn test-types && CI=true yarn test-unit`
Expected: tsc clean; 27 suites / 242 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/explorer/explorer.ts src/utils/explorer/fs.ts src/utils/program-info.ts src/utils/tutorial/tutorial.ts
git commit -m "Name the workspace directory once, and remove directories by joined paths"
```

---

### Task 2: The `experimental.unstable` setting (D37)

**Files:**
- Create: `src/settings/experimental/experimental.ts`
- Create: `src/settings/experimental/index.ts`
- Test: `src/settings/experimental/experimental.test.ts`

**Interfaces:**
- Produces: `PgSettings.experimental.unstable: boolean` (typed through `settings/generated.ts` after `yarn generate-exports`).

- [ ] **Step 1: Write the failing test**

`src/settings/experimental/experimental.test.ts`:

```ts
import { experimental } from "./experimental";

jest.mock("../../utils", () => ({
  PgCommon: {
    toTitleFromCamel: (s: string) => s,
    toKebabFromTitle: (s: string) => s,
    capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
    getValue: jest.fn(),
    setValue: jest.fn(),
  },
  PgSettings: {},
}));

// Upstream defaults this to `NODE_ENV !== "production"`. This fork builds
// against hosted servers that have no `unstable` routes, so the default is
// off everywhere and turning it on is the deliberate act (D37).
describe("experimental.unstable", () => {
  const setting = experimental.find((s) => s.id === "experimental.unstable");

  it("exists as a checkbox setting", () => {
    expect(setting).toBeDefined();
    expect(setting?.values).toBeUndefined();
  });

  it("defaults to off, whatever NODE_ENV says", () => {
    expect(setting?.default).toBe(false);
    expect(process.env.NODE_ENV).toBe("test");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true yarn test-unit src/settings/experimental`
Expected: FAIL, cannot find module `./experimental`.

- [ ] **Step 3: Write the setting**

`src/settings/experimental/experimental.ts`:

```ts
import { createSetting } from "../create";

export const experimental = [
  createSetting({
    id: "experimental.unstable",
    description:
      "Whether to use the build server's unstable routes (sandboxed builds and the package bundler). Needs a server built with `--features unstable`",
    // Upstream defaults this to `NODE_ENV !== "production"`. This fork
    // develops against hosted servers, none of which enable the feature,
    // so the switch is off everywhere and turning it on is deliberate (D37)
    default: false,
  }),
];
```

`src/settings/experimental/index.ts`:

```ts
export * from "./experimental";
```

- [ ] **Step 4: Regenerate the barrel, run the test**

Run: `yarn generate-exports && CI=true yarn test-unit src/settings/experimental && yarn test-types`
Expected: 2 tests pass; tsc clean; `src/settings/generated.ts` (gitignored) now exports `experimental`.

- [ ] **Step 5: Commit**

```bash
git add src/settings/experimental
git commit -m "Add an experimental.unstable setting, off by default"
```

---

### Task 3: `PgServer.bundle` and the unstable prefix

Ports `3e72bea6`, `21f8645b`, `57479351` in `server.ts`, with the flag read from the setting (`876fa552`'s shape).

**Files:**
- Modify: `src/utils/server.ts`
- Test: `src/utils/server.test.ts`

**Interfaces:**
- Produces: `PgServer.bundle(req: { manifest: string; lock?: string | null }): Promise<{ bundle: TupleFiles; types: TupleFiles; manifest: string; lock: string }>`; `PgServer.packages` and `PgServer.types` are removed.

- [ ] **Step 1: Write the failing test**

`src/utils/server.test.ts`:

```ts
import { PgServer } from "./server";

const settings = {
  server: { endpoint: "http://server.test" },
  experimental: { unstable: false },
};

jest.mock("./settings", () => ({
  get PgSettings() {
    return settings;
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const respond = (body: unknown) => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });
};

const requestedUrl = () => mockFetch.mock.calls[0][0] as string;
const requestInit = () => mockFetch.mock.calls[0][1] as RequestInit;

beforeEach(() => {
  mockFetch.mockReset();
  settings.experimental.unstable = false;
});

describe("PgServer routes", () => {
  it("posts a build to /build on the chosen server", async () => {
    respond({ stderr: "", uuid: "u", idl: null });
    await PgServer.build({ files: [], uuid: null, flags: {} as never });

    expect(requestedUrl()).toBe("http://server.test/build");
    expect(requestInit().method).toBe("POST");
  });

  it("gets the program from /deploy/:uuid", async () => {
    respond(null);
    const bytes = await PgServer.deploy("abc");

    expect(requestedUrl()).toBe("http://server.test/deploy/abc");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("posts the manifest and lock to /bundle and returns the files", async () => {
    const answer = {
      bundle: [["a/bundle.js", "export {}"]],
      types: [["a/types.json", "[]"]],
      manifest: "{}",
      lock: "",
    };
    respond(answer);
    const result = await PgServer.bundle({ manifest: "{}", lock: null });

    expect(requestedUrl()).toBe("http://server.test/bundle");
    expect(JSON.parse(requestInit().body as string)).toEqual({
      manifest: "{}",
      lock: null,
    });
    expect(result).toEqual(answer);
  });

  it("has no packages or types routes any more", () => {
    expect((PgServer as Record<string, unknown>).packages).toBeUndefined();
    expect((PgServer as Record<string, unknown>).types).toBeUndefined();
  });
});

describe("the unstable switch", () => {
  beforeEach(() => {
    settings.experimental.unstable = true;
  });

  it("prefixes build with /unstable", async () => {
    respond({ stderr: "", uuid: null, idl: null });
    await PgServer.build({ files: [], uuid: null, flags: {} as never });
    expect(requestedUrl()).toBe("http://server.test/unstable/build");
  });

  it("prefixes deploy with /unstable", async () => {
    respond(null);
    await PgServer.deploy("abc");
    expect(requestedUrl()).toBe("http://server.test/unstable/deploy/abc");
  });

  it("prefixes bundle with /unstable", async () => {
    respond({ bundle: [], types: [], manifest: "", lock: "" });
    await PgServer.bundle({ manifest: "{}" });
    expect(requestedUrl()).toBe("http://server.test/unstable/bundle");
  });

  it("never prefixes the share routes, which live on the db server", async () => {
    respond({ id: "x" });
    await PgServer.shareNew({ explorer: { files: {} } });
    expect(requestedUrl()).toBe("https://api.solpg.io/new");
  });
});
```

If `PgServer.build`'s request type rejects `flags: {} as never`, look at `BuildRequest` in `server.ts` and pass the minimal object it accepts. If `shareNew`'s parameter name differs, read `server.ts` for the share method that posts to `/new` and its argument shape.

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true yarn test-unit src/utils/server.test.ts`
Expected: FAIL: `PgServer.bundle is not a function`, the unstable cases get un-prefixed URLs, and the "no packages" case fails.

- [ ] **Step 3: Take upstream's file and switch the flag to the setting**

```bash
git show master-2.0:client/src/utils/server.ts > src/utils/server.ts
```

Then replace each of the three `unstable: process.env.NODE_ENV !== "production",` with

```ts
      unstable: PgSettings.experimental.unstable,
```

and confirm `PgSettings` is imported (`import { PgSettings } from "./settings";` is already there for `server.endpoint`).

- [ ] **Step 4: Run the test, then the type check**

Run: `CI=true yarn test-unit src/utils/server.test.ts`
Expected: 8 tests pass.

Run: `yarn test-types`
Expected: two errors, in `js-runtime/package.ts` (generated) and `declarations/helper.ts` -- both reference `PgServer.packages`/`types`. Task 5 fixes them; do not stop here.

- [ ] **Step 5: Commit**

```bash
git add src/utils/server.ts src/utils/server.test.ts
git commit -m "Ask the server for a bundle instead of single packages, and know its unstable routes"
```

---

### Task 4: `PgJsPackage`

Ports `3e72bea6`, `21f8645b`, `1dbb78a2`, `af1130cf` (the class) and `8f4d7567` (one line in `common.ts`).

**Files:**
- Create: `src/utils/js-package.ts`
- Modify: `src/utils/index.ts` (add the export)
- Modify: `src/utils/common.ts:528`
- Test: `src/utils/js-package.test.ts`

**Interfaces:**
- Consumes: `PgServer.bundle` (Task 3), `PgExplorer.PATHS.WORKSPACE_DIRNAME` (Task 1).
- Produces: `PgJsPackage.install(): Promise<void>`, `PgJsPackage.import(name: string): Promise<unknown>`, `PgJsPackage.importChunk(path: string)`, `PgJsPackage.getTypes(name: string): Promise<{ files: TupleFiles; dependencies: string[] }>`, and `window.__pgImportChunk`.

- [ ] **Step 1: Write the failing test**

`src/utils/js-package.test.ts`:

```ts
import type { TupleFiles } from "./explorer";

// An in-memory stand-in for `PgExplorer.fs`: lightning-fs needs IndexedDB,
// which jsdom does not have, and the class only reads, writes and removes
const files = new Map<string, string>();
const fakeFs = {
  exists: async (path: string) =>
    [...files.keys()].some((p) => p === path || p.startsWith(path + "/")),
  readToString: async (path: string) => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  },
  readToJSON: async <T>(path: string) => JSON.parse(await fakeFs.readToString(path)) as T,
  writeFile: async (path: string, content: string) => {
    files.set(path, content);
  },
  removeDir: async (path: string) => {
    for (const p of [...files.keys()]) {
      if (p === path || p.startsWith(path + "/")) files.delete(p);
    }
  },
};

jest.mock("./explorer", () => ({
  PgExplorer: {
    fs: fakeFs,
    PATHS: { WORKSPACE_DIRNAME: ".workspace" },
  },
}));

const bundle = jest.fn();
jest.mock("./server", () => ({ PgServer: { bundle } }));

const fetchText = jest.fn();
jest.mock("./common", () => {
  const actual = jest.requireActual("./common");
  return {
    PgCommon: {
      joinPaths: actual.PgCommon.joinPaths,
      fetchText,
    },
  };
});

import { PgJsPackage } from "./js-package";

const answer = (over: Partial<Record<"bundle" | "types", TupleFiles>> = {}) => ({
  bundle: over.bundle ?? [],
  types: over.types ?? [],
  manifest: '{"name":"installed"}',
  lock: "# lock",
});

beforeEach(() => {
  files.clear();
  bundle.mockReset();
  fetchText.mockReset();
});

describe("install", () => {
  it("sends the project manifest and lock, and writes what comes back", async () => {
    files.set("package.json", '{"dependencies":{"a":"1"}}');
    files.set("yarn.lock", "# project lock");
    bundle.mockResolvedValue(
      answer({
        bundle: [
          ["a/bundle.js", "export const a = 1;"],
          ["a/chunk-1.js", "export {}"],
        ],
        types: [
          ["a/types.json", '[["index.d.ts","export const a: number;"]]'],
          ["a/dependencies.json", '["b"]'],
        ],
      })
    );

    await PgJsPackage.install();

    expect(bundle).toHaveBeenCalledWith({
      manifest: '{"dependencies":{"a":"1"}}',
      lock: "# project lock",
    });
    expect(fetchText).not.toHaveBeenCalled();
    expect(files.get(".workspace/js-packages/package.json")).toBe(
      '{"name":"installed"}'
    );
    expect(files.get(".workspace/js-packages/yarn.lock")).toBe("# lock");
    expect(files.get(".workspace/js-packages/a/bundle.js")).toBe(
      "export const a = 1;"
    );
    expect(files.get(".workspace/js-packages/a/chunk-1.js")).toBe("export {}");
    expect(files.get(".workspace/js-packages/a/types.json")).toContain(
      "index.d.ts"
    );
  });

  it("falls back to the framework defaults when the project has none", async () => {
    fetchText.mockImplementation(async (path: string) =>
      path.endsWith("package.json") ? '{"default":true}' : "# default lock"
    );
    bundle.mockResolvedValue(answer());

    await PgJsPackage.install();

    expect(fetchText).toHaveBeenCalledWith("/frameworks/package.json");
    expect(fetchText).toHaveBeenCalledWith("/frameworks/yarn.lock");
    expect(bundle).toHaveBeenCalledWith({
      manifest: '{"default":true}',
      lock: "# default lock",
    });
  });

  it("installs fresh: a previous bundle's files are gone afterwards", async () => {
    files.set(".workspace/js-packages/old/bundle.js", "stale");
    files.set("package.json", "{}");
    files.set("yarn.lock", "");
    bundle.mockResolvedValue(answer({ bundle: [["new/bundle.js", "fresh"]] }));

    await PgJsPackage.install();

    expect(files.has(".workspace/js-packages/old/bundle.js")).toBe(false);
    expect(files.get(".workspace/js-packages/new/bundle.js")).toBe("fresh");
  });
});

describe("getTypes", () => {
  it("reads the package's types and dependencies files", async () => {
    files.set(
      ".workspace/js-packages/@coral-xyz/anchor/types.json",
      '[["index.d.ts","export {}"]]'
    );
    files.set(
      ".workspace/js-packages/@coral-xyz/anchor/dependencies.json",
      '["@solana/web3.js"]'
    );

    await expect(PgJsPackage.getTypes("@coral-xyz/anchor")).resolves.toEqual({
      files: [["index.d.ts", "export {}"]],
      dependencies: ["@solana/web3.js"],
    });
  });
});

describe("module names", () => {
  // The server exports each package under this name; the two must agree
  it("strips scope, slashes, dashes, underscores and dots", () => {
    const toModuleName = (
      PgJsPackage as unknown as { _toModuleName: (n: string) => string }
    )._toModuleName;
    expect(toModuleName("@coral-xyz/anchor")).toBe("coralxyzanchor");
    expect(toModuleName("@solana/web3.js")).toBe("solanaweb3js");
    expect(toModuleName("bn.js")).toBe("bnjs");
    expect(toModuleName("snake_case")).toBe("snakecase");
  });
});

describe("import", () => {
  it("names the package when the bundle does not export it", async () => {
    files.set(".workspace/js-packages/ghost/bundle.js", "export {}");
    const importChunk = jest
      .spyOn(PgJsPackage, "importChunk")
      .mockResolvedValue({});

    await expect(PgJsPackage.import("ghost")).rejects.toThrow(
      "Failed to import: ghost"
    );
    expect(importChunk).toHaveBeenCalledWith("ghost/bundle.js");
    importChunk.mockRestore();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true yarn test-unit src/utils/js-package.test.ts`
Expected: FAIL, cannot find module `./js-package`.

- [ ] **Step 3: Take upstream's file, export it, fix the duration line**

```bash
git show master-2.0:client/src/utils/js-package.ts > src/utils/js-package.ts
```

In `src/utils/index.ts`, add `export * from "./js-package";` in alphabetical position (after `./github` / `./global`, before `./js-runtime`).

In `src/utils/common.ts` line 528, replace

```ts
      ["s", (secs % 60).toFixed(2)],
```

with

```ts
      ["s", secs < 60 ? (secs % 60).toFixed(2) : Math.floor(secs % 60)],
```

- [ ] **Step 4: Run the test**

Run: `CI=true yarn test-unit src/utils/js-package.test.ts`
Expected: 7 tests pass. If the `import` case fails because the class reads `this.importChunk` and the spy misses, spy before the call as written; if it still misses, check that `import()` calls `this.importChunk` and not a module-local copy.

- [ ] **Step 5: Commit**

```bash
git add src/utils/js-package.ts src/utils/js-package.test.ts src/utils/index.ts src/utils/common.ts
git commit -m "Install packages as one bundle under .workspace/js-packages"
```

---

### Task 5: The `pm install` command and the two callers

Ports `3e72bea6`'s command, `4c4224a2`, `fdbf8040`, the template and helper hunks of `876fa552`.

**Files:**
- Create: `src/commands/package-manager/package-manager.ts`
- Create: `src/commands/package-manager/index.ts`
- Modify: `scripts/package-import-template.ts.raw`
- Modify: `src/components/Editor/Monaco/languages/typescript/declarations/helper.ts:1-10,114-130`

**Interfaces:**
- Consumes: `PgJsPackage.install/import/getTypes` (Task 4), `PgSettings.experimental.unstable` (Task 2).
- Produces: the terminal command `pm install`; a regenerated `src/utils/js-runtime/package.ts` (gitignored) that imports through `PgJsPackage`.

- [ ] **Step 1: Take upstream's command**

```bash
mkdir -p src/commands/package-manager
git show master-2.0:client/src/commands/package-manager/package-manager.ts > src/commands/package-manager/package-manager.ts
git show master-2.0:client/src/commands/package-manager/index.ts > src/commands/package-manager/index.ts
```

Expected content of `package-manager.ts` (for the reader; the command above writes exactly this):

```ts
import { PgCommon, PgJsPackage, PgTerminal } from "../../utils";
import { createCmd, createSubcmd } from "../create";

// TODO: `yarn`
// TODO: `npm`
// TODO: `pnpm`
export const packageManager = createCmd({
  name: "pm",
  description: "Manage packages",
  subcommands: [
    createSubcmd({
      // TODO: Alias
      name: "install",
      description: "Install packages",
      handle: async () => {
        const startTime = performance.now();
        await PgJsPackage.install();
        const timePassed = (performance.now() - startTime) / 1000;
        PgTerminal.println(
          `${PgTerminal.success(
            "Installation successful."
          )} Completed in ${PgCommon.formatSeconds(timePassed)}.`
        );
      },
    }),
  ],
});
```

- [ ] **Step 2: The template**

Edit `scripts/package-import-template.ts.raw`:

- replace `import { PgServer } from "../server";` with

```ts
import { PgJsPackage } from "../js-package";
import { PgSettings } from "../settings";
```

- replace `if (process.env.NODE_ENV === "production") {` with `if (!PgSettings.experimental.unstable) {`
- replace `if (isImportable) return await PgServer.packages(name);` with `if (isImportable) return await PgJsPackage.import(name);`

- [ ] **Step 3: The declarations helper**

In `src/components/Editor/Monaco/languages/typescript/declarations/helper.ts`:

- in the import list from `"../../../../../../utils"`, replace `PgServer,` with `PgJsPackage,` and add `PgSettings,` (keep the list alphabetical).
- replace the comment `// TODO: Remove this and inline \`PgServer.types\` once the feature stabilizes.` with `// TODO: Remove this and inline once the feature stabilizes.`
- replace `): ReturnType<typeof PgServer["types"]> => {` with `): ReturnType<typeof PgJsPackage["getTypes"]> => {`
- replace `if (process.env.NODE_ENV === "production") {` (inside `getTypes`) with `if (!PgSettings.experimental.unstable) {`
- replace `return await PgServer.types(packageName);` with `return await PgJsPackage.getTypes(packageName);`

- [ ] **Step 4: Regenerate and verify the whole tree type-checks**

Run: `yarn generate-exports && yarn generate-packages && yarn test-types`
Expected: tsc clean (the two Task 3 errors are gone). `git status` shows only the four files above changed; `src/utils/js-runtime/package.ts` and `src/commands/generated.ts` are gitignored.

Run: `grep -n "PgServer\.\(packages\|types\)" -r src scripts`
Expected: no output.

Run: `CI=true yarn test-unit`
Expected: 30 suites / 259 tests pass (242 + 2 + 8 + 7).

- [ ] **Step 5: Commit**

```bash
git add src/commands/package-manager scripts/package-import-template.ts.raw src/components/Editor/Monaco/languages/typescript/declarations/helper.ts
git commit -m "Add pm install, and import packages and their types from the installed bundle"
```

---

### Task 6: SIMD-0431 and the upgrade fixes in deploy

Ports `4e7a933b`, `dd1bafd6`, `ef8ba918`, with the arithmetic in a pure module.

**Files:**
- Create: `src/commands/deploy/additional-len.ts`
- Test: `src/commands/deploy/additional-len.test.ts`
- Modify: `src/utils/web3/bpf-loader-upgradeable.ts` (after `PROGRAM_DATA_METADATA_SIZE`)
- Modify: `src/commands/deploy/deploy.ts`
- Modify: `src/commands/deploy/bpf-loader-upgradeable.ts:292-297`
- Modify: `src/utils/wallet/wallet.ts:114`

**Interfaces:**
- Produces: `additionalProgramLen(info: { programLen: number; deployed: boolean; onChainLen: number | undefined }): number` and `PgWeb3.BpfLoaderUpgradeableProgram.MINIMUM_EXTEND_PROGRAM_BYTES = 10_240`.

- [ ] **Step 1: Write the failing test**

`src/commands/deploy/additional-len.test.ts`:

```ts
import { additionalProgramLen } from "./additional-len";
import { PgWeb3 } from "../../utils";

const { getProgramDataAccountSize, MINIMUM_EXTEND_PROGRAM_BYTES } =
  PgWeb3.BpfLoaderUpgradeableProgram;

// Size on chain that fits exactly `programLen` bytes of program
const exact = (programLen: number) => getProgramDataAccountSize(programLen);

describe("additionalProgramLen", () => {
  it("is 0 for a program that is not deployed yet", () => {
    expect(
      additionalProgramLen({ programLen: 5000, deployed: false, onChainLen: undefined })
    ).toBe(0);
  });

  it("is 0 when the account fits the new program exactly", () => {
    expect(
      additionalProgramLen({ programLen: 5000, deployed: true, onChainLen: exact(5000) })
    ).toBe(0);
  });

  it("is the surplus, negative, when the account is already larger", () => {
    expect(
      additionalProgramLen({ programLen: 5000, deployed: true, onChainLen: exact(5000) + 300 })
    ).toBe(-300);
  });

  // SIMD-0431: extendProgram rejects a request smaller than the minimum
  it("rounds a small shortfall up to the minimum extend size", () => {
    expect(
      additionalProgramLen({ programLen: 5000, deployed: true, onChainLen: exact(5000) - 100 })
    ).toBe(MINIMUM_EXTEND_PROGRAM_BYTES);
  });

  it("keeps a shortfall that is already above the minimum", () => {
    const shortfall = MINIMUM_EXTEND_PROGRAM_BYTES + 1;
    expect(
      additionalProgramLen({ programLen: 5000, deployed: true, onChainLen: exact(5000) - shortfall })
    ).toBe(shortfall);
  });

  it("throws when a deployed program's on-chain length is unknown", () => {
    expect(() =>
      additionalProgramLen({ programLen: 5000, deployed: true, onChainLen: undefined })
    ).toThrow("Failed to get program data length");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true yarn test-unit src/commands/deploy/additional-len.test.ts`
Expected: FAIL, cannot find module `./additional-len`.

- [ ] **Step 3: The constant and the pure function**

In `src/utils/web3/bpf-loader-upgradeable.ts`, after `static PROGRAM_DATA_METADATA_SIZE = 45; // \`u64 + Option<Pubkey>\`` add:

```ts

  /**
   * Minimum number of bytes for an `extendProgram` instruction.
   *
   * After the SIMD-0431 feature gate is activated, `extendProgram` will reject
   * requests smaller than this value, unless the program data account is within
   * this many bytes of the max permitted data length of an account: 10 MiB.
   *
   * https://github.com/anza-xyz/solana-sdk/blob/822be4736ed01c4170740c804da3b22c39a2bfe7/loader-v3-interface/src/instruction.rs#L25
   */
  static MINIMUM_EXTEND_PROGRAM_BYTES = 10_240;
```

`src/commands/deploy/additional-len.ts`:

```ts
import { PgWeb3 } from "../../utils";

/** What the length arithmetic needs to know about the program */
export interface ProgramLenInfo {
  /** Length of the program binary about to be deployed, in bytes */
  programLen: number;
  /** Whether the program already exists on-chain */
  deployed: boolean;
  /** Current program data account length on-chain, if known */
  onChainLen: number | undefined;
}

/**
 * Get the additional length necessary for upgrades.
 *
 * The return value (`r`) can be interpreted as:
 *
 * - If `r < 0` : The program has `-r` amount of extra space - no need to extend
 * - If `r == 0`: The program either has the exact space or hasn't been deployed
 * - If `r > 0` : The program needs `r` amount of space for upgrade
 *
 * This function takes [SIMD-0431] into account.
 *
 * [SIMD-0431]: https://github.com/solana-foundation/solana-improvement-documents/pull/431
 */
export const additionalProgramLen = (info: ProgramLenInfo) => {
  if (!info.deployed) return 0;

  const requiredLen =
    PgWeb3.BpfLoaderUpgradeableProgram.getProgramDataAccountSize(
      info.programLen
    );
  if (typeof info.onChainLen !== "number") {
    throw new Error("Failed to get program data length");
  }

  const additionalLen = requiredLen - info.onChainLen;
  if (additionalLen <= 0) return additionalLen;

  // SIMD-0431
  return Math.max(
    additionalLen,
    PgWeb3.BpfLoaderUpgradeableProgram.MINIMUM_EXTEND_PROGRAM_BYTES
  );
};
```

- [ ] **Step 4: Run the test**

Run: `CI=true yarn test-unit src/commands/deploy/additional-len.test.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Bring `deploy.ts` level with upstream, delegating the arithmetic**

Apply upstream's diff for the three commits:

```bash
git diff 849670c7 master-2.0 -- client/src/commands/deploy/deploy.ts client/src/commands/deploy/bpf-loader-upgradeable.ts client/src/utils/wallet/wallet.ts \
  | sed 's#client/#client-v2/#g' > /tmp/deploy.patch
git -C .. apply --3way /tmp/deploy.patch
```

(`/tmp` here is the scratchpad directory of the session, not the system one.) Expected: applies cleanly; the three files were byte-identical to upstream at the copy point.

Then, in `src/commands/deploy/deploy.ts`, replace upstream's whole `getAdditionalLen` (the function with the SIMD-0431 doc comment, roughly 30 lines starting at `/**\n * Get the additional length necessary for upgrades.`) with:

```ts
/** {@link additionalProgramLen} for the current program */
const getAdditionalLen = (programLen: number) => {
  const onChain = PgProgramInfo.onChain;
  if (!onChain) throw new Error("Failed to get on-chain program info");
  return additionalProgramLen({
    programLen,
    deployed: onChain.deployed,
    onChainLen: onChain.programDataLen,
  });
};
```

and add `import { additionalProgramLen } from "./additional-len";` with the other relative imports. If `onChain.programDataLen` is typed `number | null | undefined`, pass `onChain.programDataLen ?? undefined`.

- [ ] **Step 6: Verify the file against upstream by eye, then the tree**

Run: `diff <(git show master-2.0:client/src/commands/deploy/deploy.ts) src/commands/deploy/deploy.ts`
Expected: the only hunks are the import line and the `getAdditionalLen` body.

Run: `yarn test-types && yarn check-format && CI=true yarn test-unit`
Expected: tsc clean; prettier clean (run `yarn format` if not, and re-check that it touched only files in this branch's diff); 31 suites / 265 tests.

- [ ] **Step 7: Commit**

```bash
git add src/commands/deploy/additional-len.ts src/commands/deploy/additional-len.test.ts src/commands/deploy/deploy.ts src/commands/deploy/bpf-loader-upgradeable.ts src/utils/web3/bpf-loader-upgradeable.ts src/utils/wallet/wallet.ts
git commit -m "Extend a program by at least SIMD-0431's minimum, and compare the transfer balance in lamports"
```

---

### Task 7: Verify by hand, evidence, pull request

**Files:**
- Evidence: `docs/internal/assets/2026-09-08-pr-demo-path/` on `context-archive` (screenshots, curl transcript)
- Docs on `context-archive`: `docs/decisions.md` (D37), `docs/roadmap.md` (week 1 item -> review; PR number), `docs/friction-log.md` if anything got in the way

- [ ] **Step 1: The production-shape check**

Run: `CI=true yarn build` (from `client-v2/`). Expected: fails on the known `__template` case mismatch until PR #21 lands -- if so, run `yarn build` without `CI=true` instead and expect it to complete with the one pre-existing warning. Record which one happened.

- [ ] **Step 2: Run the app**

```bash
export PATH=$HOME/.nvm/versions/node/v22.23.2/bin:$PATH
BROWSER=none yarn dev
```

Open `http://localhost:3000`. Settings (gear, bottom of the rail): confirm **Experimental** shows *Unstable* unchecked. Set **Build server URL** to *Solana Foundation*. Build the default project: the Network tab shows `POST .../build` and the build succeeds. Turn *Unstable* on, build again: `POST .../unstable/build`, the build fails with the server's 404 reported in the terminal. Turn it back off. In the terminal run `pm install`: the request goes to `POST .../bundle` and the failure names the route. Screenshot each state into the evidence folder.

- [ ] **Step 3: Docs on `context-archive`**

Add D37 to `docs/decisions.md` (the unstable default; the rejected alternative is upstream's `NODE_ENV` default and why), move the week-1 roadmap item to *review* with the PR number, and note the #22 allowlist hand-off there. Commit on `context-archive` only.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/upstream-demo-path
gh pr create -R hoodieshq/solana-playground --base master-2.0 --title "Take upstream's demo-path changes: the bundle route, SIMD-0431, and the unstable routes behind a setting" --body-file <body>
```

The body follows PR #25's sections: *What and why*, *How it works*, *Links* (spec and D37 on `context-archive`), *Testing* (suite counts, the by-hand transcript, the evidence links), *Screenshots*, *Not here* (the 21 unported commits; the #22 allowlist hand-off; that the sandboxed routes and the bundle itself cannot be exercised without a local `--features unstable` server).
