// The environment variables the browser bundle reads. `.env.example` documents
// them.
//
// Each is a literal `process.env.REACT_APP_*` member expression because CRA
// only inlines the ones it can see statically. `NODE_ENV` stays at its call
// sites: a literal comparison there is what lets the minifier drop
// development-only branches from the production bundle.

/** Build server override; unset means the Solana Foundation's server */
export const SERVER_URL = process.env.REACT_APP_SERVER_URL;

/** Platform RPC endpoints, one per cluster; unset adds no endpoint */
export const PLATFORM_RPC_URLS = {
  devnet: process.env.REACT_APP_DEVNET_RPC_URL,
  testnet: process.env.REACT_APP_TESTNET_RPC_URL,
  mainnet: process.env.REACT_APP_MAINNET_RPC_URL,
};
