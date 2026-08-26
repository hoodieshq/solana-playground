// How a result reaches the SPA: the page the popup lands on, and the headers
// that keep the token from leaking out of it.
//
// Every outcome goes through here, success and failure alike. A response that
// does not post and close leaves the popup open and the SPA waiting, which it
// eventually reports as a cancellation - so no branch may answer any other way.

import { CHANNEL_NAME, MESSAGE_TYPE } from "../config.mjs";
import { randomHex } from "./crypto.mjs";

/**
 * @param {import("node:http").ServerResponse} res
 * @param {{token?: string, error?: string, nonce?: string}} result
 */
export function sendResult(res, { token, error, nonce }) {
  const payload = JSON.stringify({
    type: MESSAGE_TYPE,
    // Echoed so the client can tell its own flow from anything else on the
    // page; omitted rather than forged when we never had a valid one
    ...(nonce ? { nonce } : {}),
    ...(token ? { token } : { error }),
    // `<` is the only character that can break out of a <script> element;
    // JSON.stringify has already escaped quotes, backslashes and controls
  }).replace(/</g, "\\u003c");

  const cspNonce = randomHex(16);
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  // This body carries the access token - RFC 6749 5.1
  res.setHeader("cache-control", "no-store");
  // A same-origin frame can read a framed document, and this one holds the
  // token. No `sandbox`: an opaque origin would break `postMessage`/`opener`.
  res.setHeader(
    "content-security-policy",
    `default-src 'none'; script-src 'nonce-${cspNonce}'; frame-ancestors 'none'`
  );
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(deliveryPage(payload, cspNonce));
}

/**
 * The opener is addressed - one window, pinned by targetOrigin - so it is
 * preferred, keeping the token off the bus entirely. A BroadcastChannel reaches
 * every same-origin context, so it is the fallback for when COOP severed the
 * opener, not the default; the echoed nonce is what makes it safe to accept.
 * If neither delivered, say so rather than closing like a cancelled sign-in.
 */
const deliveryPage = (payload, cspNonce) =>
  `<!doctype html><meta charset="utf-8"><title>Signing in...</title>` +
  `<script nonce="${cspNonce}">` +
  `var sent = false;` +
  `if (window.opener) {` +
  `window.opener.postMessage(${payload}, window.location.origin);` +
  `sent = true;` +
  `} else {` +
  `try {` +
  `new BroadcastChannel(${JSON.stringify(CHANNEL_NAME)})` +
  `.postMessage(${payload});` +
  `sent = true;` +
  `} catch (e) {}` +
  `}` +
  `if (sent) {` +
  `window.close();` +
  `} else {` +
  `document.body.textContent = ` +
  `"Sign-in finished but this window could not reach the app. ` +
  `Close it and try again from the original tab.";` +
  `}` +
  `</script>` +
  `<p>You can close this window.</p>`;
