import { describe, expect, it, vi } from "vitest";

import { checkSignedIn } from "../../features/auth";
import { PgConnection } from "../../utils";
import { airdrop } from "./airdrop";
import { NO_FAUCET } from "./no-faucet";

// Only what `airdrop.handle` reads before it asks the RPC for SOL
vi.mock("../../utils", () => ({
  PgCommon: {},
  // eslint-disable-next-line unicorn/no-null -- `PgConnection.cluster` and `getAirdropAmount()` are `null` before the cluster is read or where there is no faucet
  PgConnection: { cluster: null, getAirdropAmount: vi.fn() },
  PgTerminal: { println: vi.fn(), info: (text: string) => text },
  PgTx: {},
  PgWallet: {},
  PgWeb3: {},
}));

// Signed out: the session check throws, as the real one does
vi.mock("../../features/auth", () => ({
  checkSignedIn: vi.fn(() => {
    throw new Error("Sign in with GitHub to request devnet SOL.");
  }),
}));

/** The airdrop's pre-checks after the wallet's, run on `cluster` */
const checkOn = async (cluster: string | null) => {
  Object.defineProperty(PgConnection, "cluster", {
    value: cluster,
    configurable: true,
  });
  const checks = airdrop.preChecks as Array<() => Promise<void> | void>;
  for (const check of checks.slice(1)) await check();
};

const runOn = (
  cluster: string | null,
  amount: ReturnType<typeof PgConnection.getAirdropAmount>
) => {
  Object.defineProperty(PgConnection, "cluster", {
    value: cluster,
    configurable: true,
  });
  vi.mocked(PgConnection.getAirdropAmount).mockReturnValue(amount);
  if (!airdrop.handle) throw new Error("airdrop has no handler");
  return airdrop.handle({ args: {} } as never);
};

describe("airdrop", () => {
  it("says the network has no faucet on mainnet", async () => {
    // eslint-disable-next-line unicorn/no-null -- `PgConnection.cluster` and `getAirdropAmount()` are `null` before the cluster is read or where there is no faucet
    await expect(runOn("mainnet-beta", null)).rejects.toThrow(NO_FAUCET);
  });

  it("does not claim there is no faucet before the cluster is read", async () => {
    // eslint-disable-next-line unicorn/no-null -- `PgConnection.cluster` and `getAirdropAmount()` are `null` before the cluster is read or where there is no faucet
    const run = runOn(null, null);
    await expect(run).rejects.toThrow("still loading");
    await expect(run).rejects.not.toThrow(NO_FAUCET);
  });

  // The local faucet is the user's own validator (Localnet, Surfpool): the
  // sign-in gate guards the public devnet faucet only, as upstream has none
  it.each(["localnet", "playnet"])(
    "airdrops on %s without a sign-in",
    async (cluster) => {
      await expect(checkOn(cluster)).resolves.toBeUndefined();
      expect(checkSignedIn).not.toHaveBeenCalled();
    }
  );

  it.each(["devnet", "testnet"])("asks to sign in on %s", async (cluster) => {
    await expect(checkOn(cluster)).rejects.toThrow("Sign in with GitHub");
  });
});
