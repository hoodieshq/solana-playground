/**
 * What a mainnet deploy from the browser risks, said once for the terminal
 * and the Deploy stage. `processDeploy` pays every deploy from the first
 * Playground wallet, whose key is in local storage, even when an external
 * wallet is connected: it funds that wallet first. So the warning does not
 * depend on the connected wallet.
 */
export const MAINNET_DEPLOY_WARNING =
  "Mainnet uses real SOL. This deploy pays through the Playground wallet, whose key is kept in this browser where a malicious script could read it. For a program that matters, deploy from your own machine with the Solana CLI or Anchor.";

/** Whether a deploy to `cluster` gets the warning; `null` is not read yet */
export const warnsOnDeploy = (cluster: string | null) =>
  cluster === "mainnet-beta";

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("commands/deploy/mainnet-warning", () => {
    it("warns on mainnet-beta only", () => {
      expect(warnsOnDeploy("mainnet-beta")).toBe(true);
      expect(warnsOnDeploy("devnet")).toBe(false);
      expect(warnsOnDeploy("localnet")).toBe(false);
      expect(warnsOnDeploy(null)).toBe(false);
    });
  });
}
