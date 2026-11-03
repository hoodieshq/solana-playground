/**
 * Clusters whose faucet is the user's own validator: Localnet, and Surfpool
 * on its default `127.0.0.1:8899`, both read as `localnet`, and Playnet in the
 * browser. Upstream asks no one to sign in there, and nothing public is spent.
 */
const LOCAL_FAUCETS = new Set(["localnet", "playnet"]);

/**
 * Whether an airdrop on `cluster` asks for a sign-in first. The gate guards
 * the public faucets (devnet, testnet); an unread cluster (`null`) or an
 * unknown one stays gated, so the gate never opens by mistake.
 *
 * Imports nothing, so the Deploy stage and the wallet menu read it without
 * loading the airdrop command.
 */
export const isAirdropSignInGated = (cluster: string | null | undefined) =>
  cluster === null || cluster === undefined || !LOCAL_FAUCETS.has(cluster);
