// The flow's short-lived server-side state and how it is carried.
//
// Three values are pinned across the GitHub hop: the CSRF `state`, the PKCE
// `code_verifier`, and the client's per-flow nonce. All three share one
// lifetime and one set of attributes, so they are issued, read and expired
// together rather than being spelled out at each call site.

const STATE_COOKIE = "pg_gh_oauth_state";
const VERIFIER_COOKIE = "pg_gh_oauth_verifier";
const NONCE_COOKIE = "pg_gh_oauth_nonce";

/** Long enough for a consent screen, short enough to be worthless if leaked */
const MAX_AGE_SECONDS = 600;

/**
 * `HttpOnly` is what makes the nonce a binding: same-origin script cannot read
 * it, so it cannot forge a reply the client will accept. `Secure` only over
 * https - it would stop the cookie working on http://localhost.
 */
const cookie = (name, value, maxAge, proto) =>
  `${name}=${value}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/api` +
  (proto === "https" ? "; Secure" : "");

/** Shape the client mints and the handler echoes: 128 bits of lower-case hex */
export const isFlowNonce = (value) =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);

export const issueFlowCookies = ({ state, verifier, nonce, proto }) => [
  cookie(STATE_COOKIE, state, MAX_AGE_SECONDS, proto),
  cookie(VERIFIER_COOKIE, verifier, MAX_AGE_SECONDS, proto),
  cookie(NONCE_COOKIE, nonce, MAX_AGE_SECONDS, proto),
];

/** Expire all three on first use, so nothing here can be replayed */
export const clearFlowCookies = (proto) => [
  cookie(STATE_COOKIE, "", 0, proto),
  cookie(VERIFIER_COOKIE, "", 0, proto),
  cookie(NONCE_COOKIE, "", 0, proto),
];

export const readFlowState = (req) => ({
  state: readCookie(req.headers.cookie, STATE_COOKIE),
  verifier: readCookie(req.headers.cookie, VERIFIER_COOKIE),
});

/**
 * On `start` the nonce arrives in the query, on `callback` in the cookie.
 * Returns only a well-formed one, so callers can echo it without re-checking -
 * and a reply the client cannot match is one it treats as a cancellation.
 */
export function readFlowNonce(req) {
  const query = new URL(req.url, `http://${req.headers.host}`).searchParams.get(
    "nonce"
  );
  if (isFlowNonce(query)) return query;
  const stored = readCookie(req.headers.cookie, NONCE_COOKIE);
  return isFlowNonce(stored) ? stored : undefined;
}

function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}
