// A file of its own, with the boot-time global and the wasm packages stubbed
// as `../round-trip.test.ts` does: the exporter imports the `utils` barrel.
//
// The exported project's guide is `export.md`: `anchor test` and
// `anchor run client` must run on what the tutorial's last step leaves
// (HOO-2749).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PgCommon, PgLanguage, TupleFiles } from "../../utils";
import { convertFromPlayground } from "./export";

vi.hoisted(() => {
  vi.stubGlobal("GLOBAL_SETTINGS", { default: {} });
  vi.stubGlobal("PACKAGES", { global: {}, importable: [] });
  vi.stubGlobal("CRATES", { importable: [] });
});

vi.mock("../../utils/package", () => ({ PgPackage: {} }));

const LIB = [
  "src/lib.rs",
  "use anchor_lang::prelude::*;\n\n#[program]\nmod hello_anchor {\n    use super::*;\n}\n",
] as const;

const CLIENT = [
  "client/client.ts",
  'const txHash = await pg.program.methods.hello("Anchor").rpc();\nconsole.log(txHash);\n',
] as const;

const TEST = [
  "tests/anchor.test.ts",
  'describe("hello_anchor", () => {\n  it("runs", async () => {\n    await pg.program.methods.hello("Anchor").rpc();\n  });\n});\n',
] as const;

const exported = async (...files: (readonly [string, string])[]) => {
  const result = await convertFromPlayground(files.map(([p, c]) => [p, c]));
  return new Map(result as TupleFiles);
};

describe("convertFromPlayground", () => {
  beforeEach(() => {
    // Set at boot by `globals/`, which this test does not load
    PgLanguage.all = [];
    vi.spyOn(PgCommon, "fetchJSON").mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it("adds a placeholder test to a project that has none", async () => {
    const files = await exported(LIB, CLIENT);

    const test = files.get("tests/hello-anchor.ts");
    expect(test).toContain('describe("hello_anchor", () => {');
    expect(test).toContain("anchor.setProvider(anchor.AnchorProvider.env());");
    expect(test).toContain("program.programId");
    expect(test).toContain(
      'import type { HelloAnchor } from "../target/types/hello_anchor";'
    );
  });

  it("keeps the tests a project has", async () => {
    const files = await exported(LIB, CLIENT, TEST);

    expect(files.has("tests/anchor.ts")).toBe(true);
    expect(files.has("tests/hello-anchor.ts")).toBe(false);
  });

  it("wraps the await of a client in an async function", async () => {
    const files = await exported(LIB, CLIENT);

    const client = files.get("client/client.ts") ?? "";
    expect(client).toContain(
      "const program = anchor.workspace.HelloAnchor as anchor.Program<HelloAnchor>;"
    );
    expect(client).toContain(
      '(async () => {\n  const txHash = await program.methods.hello("Anchor").rpc();\n  console.log(txHash);\n})();'
    );
    expect(client.indexOf("const program")).toBeLessThan(
      client.indexOf("(async")
    );
  });

  it("leaves a client without await as it is", async () => {
    const files = await exported(LIB, [
      "client/client.ts",
      "console.log(1);\n",
    ]);

    expect(files.get("client/client.ts")).not.toContain("(async");
  });

  it("leaves the await of a test alone", async () => {
    const files = await exported(LIB, TEST);

    expect(files.get("tests/anchor.ts")).not.toContain("(async () => {");
  });

  it("lists ts-node, which anchor run client needs, as a dev dependency", async () => {
    const files = await exported(LIB, CLIENT);

    const manifest = JSON.parse(files.get("package.json") ?? "{}");
    expect(manifest.devDependencies["ts-node"]).toBeDefined();
    expect(manifest.devDependencies["ts-mocha"]).toBeDefined();
  });
});
