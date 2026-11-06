/** Solana's faucet site; its form reads `walletAddress`, `cluster` and `amount` from the query */
export const FAUCET_URL = "https://faucet.solana.com";

/** The most SOL the faucet gives on devnet in one request */
export const DEVNET_FAUCET_SOL = 5;

/** The clusters the faucet site serves; a local validator has none */
const FAUCET_CLUSTERS = new Set(["devnet", "testnet"]);

export const isFaucetCluster = (cluster: string): boolean =>
  FAUCET_CLUSTERS.has(cluster);

const urlFor =
  (extra: Record<string, string>) =>
  (cluster: string) =>
  (address: string | undefined): string => {
    if (!address) return FAUCET_URL;
    const params = new URLSearchParams({ walletAddress: address });
    if (isFaucetCluster(cluster)) params.set("cluster", cluster);
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
    return `${FAUCET_URL}/?${params.toString()}`;
  };

/** The faucet with the wallet's address filled in; the bare site without one */
export const faucetUrlFor = urlFor({});

/** {@link faucetUrlFor}, also asking for `sol` */
export const faucetUrlWith = (sol: number) => urlFor({ amount: String(sol) });

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("shared/lib/faucet", () => {
    it.each([
      [
        "an address on devnet",
        faucetUrlFor("devnet")("Wa11et"),
        "https://faucet.solana.com/?walletAddress=Wa11et&cluster=devnet",
      ],
      [
        "an address on testnet",
        faucetUrlFor("testnet")("Wa11et"),
        "https://faucet.solana.com/?walletAddress=Wa11et&cluster=testnet",
      ],
      [
        "an address on a cluster the faucet does not serve",
        faucetUrlFor("localnet")("Wa11et"),
        "https://faucet.solana.com/?walletAddress=Wa11et",
      ],
      [
        "no address",
        faucetUrlFor("devnet")(undefined),
        "https://faucet.solana.com",
      ],
      [
        "an address that needs encoding",
        faucetUrlFor("devnet")("a&b=c d"),
        "https://faucet.solana.com/?walletAddress=a%26b%3Dc+d&cluster=devnet",
      ],
      [
        "an amount",
        faucetUrlWith(5)("devnet")("Wa11et"),
        "https://faucet.solana.com/?walletAddress=Wa11et&cluster=devnet&amount=5",
      ],
    ])("builds the link for %s", (...[, url, expected]) => {
      expect(url).toBe(expected);
    });
  });
}
