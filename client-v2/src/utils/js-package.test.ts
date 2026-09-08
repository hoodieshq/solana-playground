import { PgCommon } from "./common";
import { PgExplorer } from "./explorer";
import { PgJsPackage } from "./js-package";
import { PgServer } from "./server";
import type { TupleFiles } from "./explorer";

// An in-memory stand-in for `PgExplorer.fs`: lightning-fs needs IndexedDB,
// which jsdom does not have, and the class only reads, writes and removes.
// Built inside the factory because `jest.mock` is hoisted above everything
// else in this file, imports included.
jest.mock("./explorer", () => {
  const files = new Map<string, string>();
  const under = (dir: string) => (path: string) =>
    path === dir || path.startsWith(dir + "/");
  const fs = {
    files,
    exists: async (path: string) => [...files.keys()].some(under(path)),
    readToString: async (path: string) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
    readToJSON: async (path: string) => JSON.parse(await fs.readToString(path)),
    writeFile: async (path: string, content: string) => {
      files.set(path, content);
    },
    removeDir: async (path: string) => {
      for (const p of [...files.keys()].filter(under(path))) files.delete(p);
    },
  };
  return {
    PgExplorer: { fs, PATHS: { WORKSPACE_DIRNAME: ".workspace" } },
  };
});

jest.mock("./server", () => ({ PgServer: { bundle: jest.fn() } }));

jest.mock("./common", () => {
  const actual = jest.requireActual("./common");
  return {
    PgCommon: {
      // Called through the class: `joinPaths` reaches for `this`
      joinPaths: (...paths: string[]) => actual.PgCommon.joinPaths(...paths),
      fetchText: jest.fn(),
    },
  };
});

const files = (PgExplorer.fs as unknown as { files: Map<string, string> })
  .files;
const bundle = PgServer.bundle as jest.Mock;
const fetchText = PgCommon.fetchText as jest.Mock;

const answer = (
  over: Partial<Record<"bundle" | "types", TupleFiles>> = {}
) => ({
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
    // The resolved manifest and lock go back to the project, not the bundle
    expect(files.get("package.json")).toBe('{"name":"installed"}');
    expect(files.get("yarn.lock")).toBe("# lock");
    expect(files.get(".workspace/js-packages/a/bundle.js")).toBe(
      "export const a = 1;"
    );
    expect(files.get(".workspace/js-packages/a/chunk-1.js")).toBe("export {}");
    expect(files.get(".workspace/js-packages/a/types.json")).toContain(
      "index.d.ts"
    );
    expect(files.get(".workspace/js-packages/a/dependencies.json")).toBe(
      '["b"]'
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
    const { _toModuleName: toModuleName } = PgJsPackage as unknown as {
      _toModuleName: (name: string) => string;
    };
    expect(toModuleName("@coral-xyz/anchor")).toBe("coralxyzanchor");
    expect(toModuleName("@solana/web3.js")).toBe("solanaweb3js");
    expect(toModuleName("bn.js")).toBe("bnjs");
    expect(toModuleName("snake_case")).toBe("snakecase");
  });
});

describe("import", () => {
  it("names the package when the bundle does not export it", async () => {
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
