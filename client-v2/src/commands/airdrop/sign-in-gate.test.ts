import { describe, expect, it } from "vitest";

import { isAirdropSignInGated } from "./sign-in-gate";

describe("isAirdropSignInGated", () => {
  it("opens the gate on the local faucets only", () => {
    expect(isAirdropSignInGated("localnet")).toBe(false);
    expect(isAirdropSignInGated("playnet")).toBe(false);
    expect(isAirdropSignInGated("devnet")).toBe(true);
    expect(isAirdropSignInGated("testnet")).toBe(true);
    expect(isAirdropSignInGated(undefined)).toBe(true);
  });
});
