/**
 * Mainnet deploys are refused in the beta (HOO-2728): `processDeploy` pays
 * from a Playground wallet whose key is kept in the browser, and the beta
 * deploys to devnet, testnet and local networks only. Mainnet stays
 * selectable for reading and Interact; its deploys go through the CLI deploy
 * guide, from the user's own machine.
 */

/** The Deploy stage's line on mainnet */
export const MAINNET_DEPLOY_BLOCKED_LINE =
  "Deploys to mainnet are not available in the beta.";

/** The `deploy` command's refusal on mainnet */
export const MAINNET_DEPLOY_BLOCKED = `${MAINNET_DEPLOY_BLOCKED_LINE} Deploy from your own machine with the Solana CLI or Anchor: Deploy stage › Deploy from your machine.`;

/**
 * Whether a program deploy to `cluster` is refused: the stage's switch to the
 * CLI guide, and the command's hard stop. `null` (not read yet) does not block.
 */
export const isDeployBlocked = (cluster: string | null) =>
  cluster === "mainnet-beta";

/**
 * The `deploy` command's refusal when the endpoint did not say which network
 * it is: a custom RPC that is down or refuses the genesis read could be
 * mainnet, so nothing is sent on a guess
 */
export const DEPLOY_NETWORK_UNREAD =
  "Could not read which network the endpoint serves, so nothing was deployed. Check the RPC in Settings › Network and try again.";

/**
 * The terminal's `anchor idl` writes are refused on mainnet for the same
 * reason (HOO-2737): they pay from the same browser-held wallet. Deploy's
 * "Upload IDL" button is not one of them: it only loads a file into this
 * browser.
 */
export const MAINNET_IDL_BLOCKED =
  "Writing an IDL to mainnet is not available in the beta. Run `anchor idl` from your own machine: Deploy stage › Deploy from your machine.";

/** The `anchor idl` writes' refusal when the endpoint did not say its network */
export const IDL_NETWORK_UNREAD =
  "Could not read which network the endpoint serves, so nothing was sent. Check the RPC in Settings › Network and try again.";

/** The two lines a mainnet refusal prints: on mainnet, and on an unread network */
export interface MainnetRefusal {
  blocked: string;
  unread: string;
}

export const DEPLOY_REFUSAL: MainnetRefusal = {
  blocked: MAINNET_DEPLOY_BLOCKED,
  unread: DEPLOY_NETWORK_UNREAD,
};

export const IDL_REFUSAL: MainnetRefusal = {
  blocked: MAINNET_IDL_BLOCKED,
  unread: IDL_NETWORK_UNREAD,
};
