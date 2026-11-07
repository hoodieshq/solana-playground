/** The web faucet, until Playground has a faucet of its own */
export const FAUCET_URL = "https://faucet.solana.com";

/** The amounts the faucet's form offers; it ignores any other in a link.
 * Read from faucet.solana.com's page script on 7 Nov 2026: update both lists
 * if its form changes. */
const FAUCET_AMOUNTS: readonly number[] = [0.5, 1, 2.5, 5];

/** The clusters the faucet's form has; it ignores any other in a link */
const FAUCET_CLUSTERS: readonly string[] = ["devnet", "testnet"];

export interface FaucetLinkFill {
  walletAddress?: string;
  /** In SOL */
  amount?: number;
  cluster?: string | null;
}

/**
 * A link to the faucet with its form filled in. The faucet reads
 * `walletAddress`, `amount` and `cluster` from the query on load and drops a
 * value its form does not offer, so only those it takes are written.
 */
export const faucetLink = ({
  walletAddress,
  amount,
  cluster,
}: FaucetLinkFill): string => {
  const query = new URLSearchParams();
  if (walletAddress) query.set("walletAddress", walletAddress);
  if (amount !== undefined && FAUCET_AMOUNTS.includes(amount)) {
    query.set("amount", String(amount));
  }
  if (cluster && FAUCET_CLUSTERS.includes(cluster)) {
    query.set("cluster", cluster);
  }
  const search = query.toString();
  return search ? `${FAUCET_URL}/?${search}` : FAUCET_URL;
};
