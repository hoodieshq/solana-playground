// `@types/mocha` also declares a global `it`, without `each`
import { describe, expect, it } from "vitest";
import { transpile } from "typescript";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { signer } from "@solana/kit-plugin-signer";
import { Keypair } from "@solana/web3.js";

import { missingPackageOf } from "./missing-package";
import {
  pgSignerFromFile,
  SIGNER_NEEDS_PG_WALLET,
  TRANSPILE_OPTIONS,
  wrapScript,
} from "./kit";

describe("missingPackageOf", () => {
  it("names the package a failed import asked for", () => {
    expect(
      missingPackageOf("Package `@solana-program/memo` is not available.")
    ).toBe("@solana-program/memo");
  });

  it("is null for any other error", () => {
    expect(missingPackageOf("fetch failed")).toBeNull();
  });
});

describe("TRANSPILE_OPTIONS", () => {
  it("keeps for...of over a Map working", () => {
    const code = transpile(
      `for (const [k] of new Map([["a", 1]])) out.push(k);`,
      TRANSPILE_OPTIONS
    );
    const out: string[] = [];
    // eslint-disable-next-line no-new-func
    new Function("out", code)(out);
    expect(out).toEqual(["a"]);
  });

  it("keeps BigInt literals and numeric separators", () => {
    const code = transpile(`out.push(1_000n * 2n);`, TRANSPILE_OPTIONS);
    const out: bigint[] = [];
    // eslint-disable-next-line no-new-func
    new Function("out", code)(out);
    expect(out).toEqual([2000n]);
  });
});

describe("wrapScript", () => {
  /** Run a wrapped script; resolves with what it logged once it ends */
  const run = (script: string) =>
    new Promise<unknown[]>((resolve) => {
      const logged: unknown[] = [];
      const code = transpile(wrapScript(script, "__end()"), TRANSPILE_OPTIONS);
      // eslint-disable-next-line no-new-func
      new Function("console", "__fail", "__end", code)(
        { log: (...args: unknown[]) => logged.push(args.join(" ")) },
        (error: string) => logged.push(`fail: ${error}`),
        () => resolve(logged)
      );
    });

  it("runs a script with top-level await", async () => {
    expect(
      await run("const x = await Promise.resolve(2); console.log(x);")
    ).toEqual(["2"]);
  });

  it("hides eval and Function from the script", async () => {
    expect(await run("console.log(typeof eval, typeof Function);")).toEqual([
      "undefined undefined",
    ]);
  });

  it("reports an uncaught error", async () => {
    expect(await run('throw new Error("boom");')).toEqual([
      "fail: boom",
      "Uncaught error: boom",
    ]);
  });
});

describe("pgSignerFromFile", () => {
  const deps = { createKeyPairSignerFromBytes, signer };

  it("makes the Playground wallet the identity and the payer", async () => {
    const keypair = Keypair.generate();
    const signerFromFile = pgSignerFromFile(deps, () => ({
      isPg: true,
      keypair,
    }));

    const client = await signerFromFile("wallet.json")({});

    expect(client.identity.address).toBe(keypair.publicKey.toBase58());
    expect(client.payer.address).toBe(keypair.publicKey.toBase58());
  });

  it("refuses a wallet that is not the Playground wallet", async () => {
    const signerFromFile = pgSignerFromFile(deps, () => ({ isPg: false }));

    await expect(signerFromFile("wallet.json")({})).rejects.toThrow(
      SIGNER_NEEDS_PG_WALLET
    );
  });
});
