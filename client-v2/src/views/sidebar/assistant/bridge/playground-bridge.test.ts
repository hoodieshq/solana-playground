// What the assistant's deploy question is quoted from.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cluster: "devnet" as string | undefined,
  wallet: undefined as undefined | { isPg?: boolean },
}));

vi.mock("../../../../utils", () => ({
  PgBlockExplorer: {},
  PgCommand: {},
  PgConnection: {
    get cluster() {
      return mocks.cluster;
    },
  },
  PgExplorer: {},
  PgGlobal: {},
  PgProgramInfo: {},
  PgWallet: {
    get current() {
      return mocks.wallet;
    },
  },
}));
vi.mock("../../../../commands/deploy/estimate", () => ({
  estimateDeployCostWithin: async () => 1_420_000_000,
}));
vi.mock("../../../flow/lessons", () => ({ PgLesson: {} }));
vi.mock("./build-output", () => ({
  PgBuildOutput: {},
  stripKnownNoise: (s: string) => s,
}));
vi.mock("./lesson-context", () => ({
  // eslint-disable-next-line unicorn/no-null -- `describeLesson()` answers `null` with no lesson
  describeLesson: () => null,
}));

import { realBridge } from "./playground-bridge";

describe("realBridge.quoteDeploy", () => {
  beforeEach(() => {
    mocks.cluster = "devnet";
    mocks.wallet = undefined;
  });

  it.each([
    {
      label: "no wallet yet, so the Playground wallet will be made and pay",
      wallet: undefined,
      expected: true,
    },
    { label: "the Playground wallet", wallet: { isPg: true }, expected: true },
    { label: "a connected wallet", wallet: { isPg: false }, expected: false },
  ])("says the Playground wallet pays with $label", async (row) => {
    mocks.wallet = row.wallet;
    expect((await realBridge.quoteDeploy()).playground).toBe(row.expected);
  });

  it.each([
    ["devnet", "devnet"],
    ["mainnet-beta", "mainnet"],
    [undefined, undefined],
  ])("names %s as %s", async (cluster, network) => {
    mocks.cluster = cluster;
    expect(await realBridge.quoteDeploy()).toEqual({
      network,
      cost: 1_420_000_000,
      playground: true,
    });
  });
});
