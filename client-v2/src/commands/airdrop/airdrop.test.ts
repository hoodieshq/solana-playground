import { describe, expect, it, vi } from "vitest";

import { PgConnection } from "../../utils";
import { airdrop } from "./airdrop";
import { NO_FAUCET } from "./no-faucet";

// Only what `airdrop.handle` reads before it asks the RPC for SOL
vi.mock("../../utils", () => ({
  PgCommon: {},
  PgConnection: { getAirdropAmount: vi.fn() },
  PgTerminal: { println: vi.fn(), info: (text: string) => text },
  PgTx: {},
  PgWallet: {},
  PgWeb3: {},
}));

describe("airdrop", () => {
  it("says the network has no faucet on mainnet or a custom URL", async () => {
    vi.mocked(PgConnection.getAirdropAmount).mockReturnValue(null);
    if (!airdrop.handle) throw new Error("airdrop has no handler");
    await expect(airdrop.handle({ args: {} } as never)).rejects.toThrow(
      NO_FAUCET
    );
  });

  it("reads as Spec 12 words it", () => {
    expect(NO_FAUCET).toBe("This network has no faucet.");
  });
});
