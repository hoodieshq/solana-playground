import type { Cluster } from "../../utils";

/**
 * What the list says when the signatures could not be read. `fetch` rejects
 * with a `TypeError` when nothing answers at the endpoint, whatever the
 * browser words it as ("Failed to fetch", "Load failed"), so that case names
 * the endpoint instead of repeating the browser's words.
 */
export const describeTxsError = (
  error: unknown,
  { endpoint, cluster }: { endpoint: string; cluster: Cluster | null }
) => {
  if (error instanceof TypeError) {
    const unreachable = `Can't reach the RPC endpoint at ${endpoint}.`;
    return cluster === "localnet"
      ? `${unreachable} Is the local validator running?`
      : unreachable;
  }
  const message = error instanceof Error ? error.message : "";
  return `Connection error: ${message || "Unknown error"}`;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("components/Wallet/txs-error", () => {
    const devnet = "https://api.devnet.solana.com";
    const local = "http://localhost:8899";

    it("names a local endpoint that does not answer, and the validator", () => {
      expect(
        describeTxsError(new TypeError("Failed to fetch"), {
          endpoint: local,
          cluster: "localnet",
        })
      ).toBe(
        "Can't reach the RPC endpoint at http://localhost:8899. Is the local validator running?"
      );
    });

    it("names a public endpoint that does not answer", () => {
      expect(
        describeTxsError(new TypeError("Load failed"), {
          endpoint: devnet,
          cluster: "devnet",
        })
      ).toBe("Can't reach the RPC endpoint at https://api.devnet.solana.com.");
    });

    it("keeps the words of an endpoint that answered with an error", () => {
      expect(
        describeTxsError(new Error("429 Too Many Requests"), {
          endpoint: devnet,
          cluster: "devnet",
        })
      ).toBe("Connection error: 429 Too Many Requests");
    });

    it("says unknown when the failure carries no words", () => {
      expect(
        describeTxsError("nope", { endpoint: devnet, cluster: "devnet" })
      ).toBe("Connection error: Unknown error");
    });
  });
}
