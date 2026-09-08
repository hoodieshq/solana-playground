/** The same-origin build proxy, `api/build.mjs` (D28) */
export const SAME_ORIGIN_ENDPOINT = "/api/build";

/** A build server on this machine, as upstream's development default */
export const LOCAL_ENDPOINT = "http://localhost:8080";

/** The Solana Foundation's own deployment -- what the proxy forwards to */
export const FOUNDATION_ENDPOINT =
  "https://playground-server-dot-analytics-324114.de.r.appspot.com";

/**
 * Upstream's original backend. Reachable on purpose and never a default
 * (D30): a user who picks it accepts that it is Acheron's capacity, not
 * Solana's, and the label says which one it is.
 */
export const SOLPG_ENDPOINT = "https://api.solpg.io";

/**
 * What the picker offers, in this order. The custom URL field comes after
 * these, from the setting itself.
 */
export const SERVER_ENDPOINT_OPTIONS: ReadonlyArray<{
  name: string;
  value: string;
}> = [
  { name: "Local", value: LOCAL_ENDPOINT },
  { name: "Solana Foundation", value: FOUNDATION_ENDPOINT },
  { name: "This site (proxy)", value: SAME_ORIGIN_ENDPOINT },
  { name: "SolPg (original backend)", value: SOLPG_ENDPOINT },
];

/**
 * Which build server a fresh profile talks to.
 *
 * Production goes through the same-origin proxy: the Foundation's server
 * allowlists origins and a deployment of this fork is not on the list.
 * Development keeps the local server, as upstream does; `localhost:3000` is
 * allowlisted, so the picker can still point straight at the Foundation.
 * `||` not `??`: sourcing an env file leaves unfilled keys as "", which is
 * not nullish and would win.
 */
export const defaultServerEndpoint = (
  env: { REACT_APP_SERVER_URL?: string; NODE_ENV?: string },
  endpoints: { local: string }
) =>
  env.REACT_APP_SERVER_URL ||
  (env.NODE_ENV === "production" ? SAME_ORIGIN_ENDPOINT : endpoints.local);
