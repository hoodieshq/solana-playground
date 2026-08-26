/**
 * GitHub OAuth web flow. Two branches, one entry point.
 *
 * `?action=start` pins a CSRF `state`, a PKCE `code_verifier` and the client's
 * per-flow nonce in HttpOnly cookies, then redirects to GitHub's consent page.
 * `?action=callback` checks the state, redeems the code using the client secret
 * and the verifier - neither of which ever reaches the browser - and answers a
 * page that hands the result to the SPA and closes itself.
 *
 * Everything the flow needs beyond routing lives in
 * `src/features/github-oauth/server/`, so both halves of the feature sit
 * together. This file is plain ESM on raw Node request/response APIs, which is
 * what lets one function serve the craco dev server, `vercel dev` and a real
 * deployment unchanged - see `api/health.mjs`.
 */
import { GITHUB_AUTHORIZE_URL, OAUTH_ROUTE } from "../src/features/github-oauth/config.mjs";
import { randomHex, sha256Base64Url } from "../src/features/github-oauth/server/crypto.mjs";
import {
  clearFlowCookies,
  isFlowNonce,
  issueFlowCookies,
  readFlowNonce,
  readFlowState,
} from "../src/features/github-oauth/server/flow-cookies.mjs";
import { sendResult } from "../src/features/github-oauth/server/result-page.mjs";
import { exchangeCode } from "../src/features/github-oauth/server/token-exchange.mjs";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  // Every response lands inside the popup, so a thrown error would leave a 500
  // page that never posts and never closes - which the SPA reports as a
  // cancellation. Funnel even the unexpected through `sendResult`.
  try {
    return await route(req, res);
  } catch (e) {
    console.error("github-oauth: unhandled failure", e);
    if (res.headersSent) return;
    return sendResult(res, {
      nonce: readFlowNonce(req),
      error: "Sign-in failed. Try again.",
    });
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action");
  const nonce = readFlowNonce(req);

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("github-oauth: GITHUB_CLIENT_ID/SECRET are not set");
    if (action === "start" || action === "callback") {
      return sendResult(res, {
        nonce,
        error: "GitHub sign-in is not configured in this deployment.",
      });
    }
    return sendJson(res, 503, {
      error: "GitHub OAuth is not configured in this deployment",
    });
  }

  // Chained proxies send "https,https" - the first hop is the client-facing
  // one. Taking the whole value would corrupt `redirectUri` and, because it
  // stops equalling "https", silently drop `Secure` from the cookies.
  const proto = (req.headers["x-forwarded-proto"] ?? "http")
    .split(",")[0]
    .trim();
  // One expression for both branches: GitHub matches the value sent at the
  // exchange against the one sent at authorize time, so they must be identical
  const redirectUri = `${proto}://${req.headers.host}${OAUTH_ROUTE}?action=callback`;
  const flow = { req, res, url, nonce, proto, redirectUri, clientId, clientSecret };

  if (action === "start") return start(flow);
  if (action === "callback") return callback(flow);

  console.warn(`github-oauth: unknown action ${action}`);
  return sendResult(res, { nonce, error: "Unsupported sign-in request." });
}

/** Pin the flow's state in cookies and hand the user to GitHub */
async function start({ res, url, nonce, proto, redirectUri, clientId }) {
  const requested = url.searchParams.get("nonce");
  if (!isFlowNonce(requested)) {
    console.error("github-oauth: start called without a valid nonce");
    return sendResult(res, {
      nonce,
      error: "Sign-in could not start. Reload and try again.",
    });
  }

  const state = randomHex(16);
  // Hex is already `code_verifier`-safe: unreserved, and 64 chars sits inside
  // the 43-128 range RFC 7636 allows
  const verifier = randomHex(32);

  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", "");
  authorize.searchParams.set("code_challenge", await sha256Base64Url(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");

  res.statusCode = 302;
  res.setHeader(
    "set-cookie",
    issueFlowCookies({ state, verifier, nonce: requested, proto })
  );
  res.setHeader("location", authorize.toString());
  return res.end();
}

/** Validate GitHub's answer, redeem the code, and deliver the result */
async function callback(flow) {
  const { req, res, url, nonce, proto, redirectUri, clientId, clientSecret } =
    flow;
  const pinned = readFlowState(req);
  res.setHeader("set-cookie", clearFlowCookies(proto));

  // A declined consent screen comes back here as `error`, with no `code`
  const denied = url.searchParams.get("error");
  if (denied) {
    return sendResult(res, {
      nonce,
      error:
        denied === "access_denied"
          ? "Sign-in was cancelled."
          : url.searchParams.get("error_description") || denied,
    });
  }

  const state = url.searchParams.get("state");
  if (!state || state !== pinned.state) {
    // A mismatch is a CSRF signal, not a routine hiccup - say so in the log
    console.warn(
      `github-oauth: state mismatch (param ${state ? "present" : "absent"},` +
        ` cookie ${pinned.state ? "present" : "absent"})`
    );
    return sendResult(res, { nonce, error: "State mismatch. Try again." });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    console.warn("github-oauth: callback carried no code");
    return sendResult(res, { nonce, error: "GitHub sent no code. Try again." });
  }

  if (!pinned.verifier) {
    console.warn("github-oauth: callback carried no PKCE verifier cookie");
    return sendResult(res, { nonce, error: "Sign-in expired. Try again." });
  }

  const result = await exchangeCode({
    clientId,
    clientSecret,
    code,
    redirectUri,
    verifier: pinned.verifier,
  });
  return sendResult(res, { nonce, ...result });
}

/** Only for callers that are not the popup; everything else uses `sendResult` */
function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
