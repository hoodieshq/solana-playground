/** The faucet's 429, or its own words for the limit */
const FAUCET_LIMIT = /\b429\b|too many requests|rate limit|airdrop limit/i;

/**
 * Whether a refused airdrop's message is the devnet faucet's limit: an
 * expected answer, unlike any other failure of the request
 */
export const isFaucetLimit = (message: string) => FAUCET_LIMIT.test(message);

/**
 * Why a tutorial's airdrop brought no SOL, in words true to the cause (Design
 * alignment, 7 Nov). No "try again in a minute": the faucet's limit rarely
 * lifts that soon, so the steps under it send the learner to the web faucet
 * instead (10 Nov)
 */
export const airdropCause = (message: string) =>
  isFaucetLimit(message)
    ? "The devnet faucet is at its limit."
    : "The airdrop didn't go through.";

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("shared/lib/faucet-limit", () => {
    it.each([
      "429 Too Many Requests",
      "Server responded with 429",
      "airdrop limit reached",
      "You've hit the rate limit",
    ])("reads %j as the faucet's limit", (message) => {
      expect(isFaucetLimit(message)).toBe(true);
    });

    it("reads any other failure as something else", () => {
      expect(isFaucetLimit("fetch failed")).toBe(false);
      expect(isFaucetLimit("slot 14290")).toBe(false);
    });
  });
}
