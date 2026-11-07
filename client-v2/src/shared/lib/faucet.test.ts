import { describe, expect, it } from "vitest";

import { FAUCET_URL, faucetLink } from "./faucet";

const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

describe("faucetLink", () => {
  it("is the bare faucet with nothing to fill in", () => {
    expect(faucetLink({})).toBe(FAUCET_URL);
  });

  it("fills in the wallet, the amount and the cluster the faucet takes", () => {
    const url = new URL(
      faucetLink({ walletAddress: WALLET, amount: 5, cluster: "devnet" })
    );
    expect(url.origin).toBe(FAUCET_URL);
    expect(url.searchParams.get("walletAddress")).toBe(WALLET);
    expect(url.searchParams.get("amount")).toBe("5");
    expect(url.searchParams.get("cluster")).toBe("devnet");
  });

  it("leaves out an amount the faucet does not offer", () => {
    const url = new URL(faucetLink({ walletAddress: WALLET, amount: 3 }));
    expect(url.searchParams.has("amount")).toBe(false);
    expect(url.searchParams.get("walletAddress")).toBe(WALLET);
  });

  it("leaves out a cluster the faucet has no form for", () => {
    const url = new URL(
      faucetLink({ walletAddress: WALLET, cluster: "localnet" })
    );
    expect(url.searchParams.has("cluster")).toBe(false);
  });

  it("takes testnet", () => {
    const url = new URL(faucetLink({ cluster: "testnet", amount: 1 }));
    expect(url.searchParams.get("cluster")).toBe("testnet");
    expect(url.searchParams.get("amount")).toBe("1");
  });
});
