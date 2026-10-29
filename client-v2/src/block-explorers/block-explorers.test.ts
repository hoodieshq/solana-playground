import { solanaExplorer } from "./solana-explorer";
import { solanaFM } from "./solana-fm";
import { solscan } from "./solscan";

// `settings.ts`, reached through the block explorer module, reads a global
// that only exists once the app has booted
vi.hoisted(() => {
  vi.stubGlobal("GLOBAL_SETTINGS", { default: {} });
});

// Testnet is the network picked now; every record below is from elsewhere
vi.mock("../utils", async () => ({
  PgBlockExplorer: (await import("../utils/block-explorer")).PgBlockExplorer,
  PgConnection: { cluster: "testnet" },
}));

const ID = "11111111111111111111111111111111";

describe("block explorers", () => {
  it("open the network they are given, not the one picked now", () => {
    expect(solanaExplorer.getAddressUrl(ID, "devnet")).toBe(
      `https://explorer.solana.com/address/${ID}?cluster=devnet`
    );
    expect(solanaFM.getTxUrl("sig", "devnet")).toBe(
      "https://solana.fm/tx/sig?cluster=devnet-solana"
    );
    expect(solscan.getAddressUrl(ID, "mainnet-beta")).toBe(
      `https://solscan.io/address/${ID}`
    );
  });

  it("open the network picked now when given none", () => {
    expect(solanaExplorer.getTxUrl("sig")).toBe(
      "https://explorer.solana.com/tx/sig?cluster=testnet"
    );
  });
});
