// `@types/mocha` also declares a global `it`, without `each`
import { describe, expect, it } from "vitest";

import { getAirdropVia, withAirdropVia } from "./via";

describe("commands/airdrop/via", () => {
  it("names the terminal when no caller named itself", () => {
    expect(getAirdropVia()).toBe("terminal");
  });

  it("names the caller for the duration of its run, and resolves with its result", async () => {
    const result = await withAirdropVia(async () => {
      await Promise.resolve();
      return getAirdropVia();
    }, "deploy");
    expect(result).toBe("deploy");
    expect(getAirdropVia()).toBe("terminal");
  });

  it("restores the previous caller after a nested run", async () => {
    const seen: string[] = [];
    await withAirdropVia(async () => {
      seen.push(getAirdropVia());
      await withAirdropVia(async () => {
        seen.push(getAirdropVia());
      }, "automatic");
      seen.push(getAirdropVia());
    }, "wallet");
    expect(seen).toEqual(["wallet", "automatic", "wallet"]);
    expect(getAirdropVia()).toBe("terminal");
  });

  it("restores the previous caller when the run throws", async () => {
    await expect(
      withAirdropVia(async () => {
        throw new Error("rate limited");
      }, "stage")
    ).rejects.toThrow("rate limited");
    expect(getAirdropVia()).toBe("terminal");
  });
});
