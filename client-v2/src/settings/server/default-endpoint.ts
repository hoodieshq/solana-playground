/** The same-origin build proxy, `api/build.mjs` (D28) */
export const SAME_ORIGIN_ENDPOINT = "/api/build";

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
