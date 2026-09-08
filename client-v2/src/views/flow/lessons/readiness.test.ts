import { readiness, readinessLine } from "./readiness";
import type { ReadinessEnv } from "./readiness";
import type { VerifyCondition } from "./types";

const DEPLOYED: VerifyCondition = { kind: "deployed" };

/** Everything a deploy needs, in place */
const READY: ReadinessEnv = {
  build: "done",
  wallet: true,
  balance: 2.5,
  cluster: "devnet",
  signedIn: true,
};

const kinds = (env: Partial<ReadinessEnv>, c: VerifyCondition = DEPLOYED) =>
  readiness(c, { ...READY, ...env }).map((b) => b.kind);

describe("readiness", () => {
  it("has nothing to say when a deploy can go ahead", () => {
    expect(readiness(DEPLOYED, READY)).toEqual([]);
  });

  it("names a missing build, wallet and cluster, in the order to fix them", () => {
    expect(
      kinds({ build: "upcoming", wallet: false, cluster: "localnet" })
    ).toEqual(["needs-build", "needs-wallet", "needs-cluster"]);
    expect(kinds({ build: "failed" })).toEqual(["needs-build"]);
    expect(kinds({ build: "running" })).toEqual(["needs-build"]);
  });

  it("names an empty wallet, with sign-in first when the airdrop needs it", () => {
    expect(readiness(DEPLOYED, { ...READY, balance: 0 })).toEqual([
      { kind: "needs-sol", signedIn: true },
    ]);
    expect(
      readiness(DEPLOYED, { ...READY, balance: 0, signedIn: false })
    ).toEqual([{ kind: "needs-sol", signedIn: false }]);
  });

  it("does not guess about a balance it does not know", () => {
    expect(kinds({ balance: null })).toEqual([]);
    // Low but non-zero: the deploy command itself asks about an airdrop
    // with the real cost in hand, so the band does not second-guess it
    expect(kinds({ balance: 0.3 })).toEqual([]);
  });

  it("does not ask about SOL when there is no wallet to hold it", () => {
    expect(kinds({ wallet: false, balance: 0 })).toEqual(["needs-wallet"]);
  });

  it("carries the current cluster so the copy can name it", () => {
    expect(readiness(DEPLOYED, { ...READY, cluster: "mainnet-beta" })).toEqual([
      { kind: "needs-cluster", cluster: "mainnet-beta" },
    ]);
    expect(readiness(DEPLOYED, { ...READY, cluster: null })).toEqual([
      { kind: "needs-cluster", cluster: null },
    ]);
  });

  it("has no preconditions for a build or a reading", () => {
    const bare: ReadinessEnv = {
      build: "upcoming",
      wallet: false,
      balance: 0,
      cluster: null,
      signedIn: false,
    };
    expect(readiness({ kind: "build-passes" }, bare)).toEqual([]);
    expect(readiness({ kind: "idl", instruction: "hello" }, bare)).toEqual([]);
    expect(readiness({ kind: "read", at: "interact" }, bare)).toEqual([]);
  });
});

describe("readinessLine", () => {
  it("is null when nothing is missing", () => {
    expect(readinessLine([])).toBeNull();
  });

  it("says what stands in the way, each with its remedy", () => {
    const line = readinessLine([
      { kind: "needs-build" },
      { kind: "needs-wallet" },
      { kind: "needs-cluster", cluster: "localnet" },
      { kind: "needs-sol", signedIn: false },
    ]);
    expect(line?.lead).toBe("Before you can deploy:");
    expect(line?.items.map((i) => i.text)).toEqual([
      "build first",
      "connect a wallet",
      "switch from localnet to devnet",
      "sign in, then airdrop -- the wallet holds no SOL",
    ]);
  });

  it("names the whole chain for an empty wallet, or just the airdrop", () => {
    expect(
      readinessLine([{ kind: "needs-sol", signedIn: true }])?.items[0].text
    ).toBe("airdrop -- the wallet holds no SOL");
    expect(
      readinessLine([{ kind: "needs-cluster", cluster: null }])?.items[0].text
    ).toBe("switch to devnet");
  });
});
