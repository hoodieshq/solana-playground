/**
 * GitHub OAuth web-flow exchange.
 *
 * `?action=start` redirects to GitHub's authorize page with a random
 * `state` and a PKCE `code_challenge`, pinning the nonce and the
 * verifier in short-lived HttpOnly cookies. `?action=callback` checks
 * the state, exchanges the code using the client secret and the
 * `code_verifier` - neither of which ever reaches the browser - and
 * answers a page that posts the token to `window.opener` (same origin
 * only) and closes itself. The SPA keeps the token in memory; nothing
 * is persisted anywhere.
 *
 * Plain ESM on raw Node request/response APIs - see `api/health.mjs`
 * for why. Randomness comes from the Web Crypto global rather than
 * `node:crypto`, so this also runs on runtimes without Node builtins.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
const COOKIE = "pg_gh_oauth_state";
const VERIFIER_COOKIE = "pg_gh_oauth_verifier";

export default async function handler(req, res) {
  // Every response reaches the user inside the popup, so a thrown error would
  // leave a 500 page that never posts and never closes - the SPA then reports
  // it as a cancellation. Funnel everything through `sendResult` instead.
  try {
    return await route(req, res);
  } catch (e) {
    console.error("github-oauth: unhandled failure", e);
    if (res.headersSent) return;
    return sendResult(res, { error: "Sign-in failed. Try again." });
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("github-oauth: GITHUB_CLIENT_ID/SECRET are not set");
    if (action === "start" || action === "callback") {
      return sendResult(res, {
        error: "GitHub sign-in is not configured in this deployment.",
      });
    }
    return sendJson(res, 503, {
      error: "GitHub OAuth is not configured in this deployment",
    });
  }

  // Chained proxies send "https,https" - the first hop is the client-facing one.
  // Taking the whole value would both corrupt `redirectUri` and, because it stops
  // equalling "https", silently drop `Secure` from the cookies.
  const proto = (req.headers["x-forwarded-proto"] ?? "http")
    .split(",")[0]
    .trim();
  // One expression for both branches: GitHub matches the value sent here against
  // the one sent at authorize time, so they must be identical
  const redirectUri = `${proto}://${req.headers.host}/api/github-oauth?action=callback`;

  if (action === "start") {
    const state = randomHex(16);
    // Hex is already `code_verifier`-safe: unreserved, and 64 chars is inside
    // the 43-128 range RFC 7636 allows
    const verifier = randomHex(32);
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("scope", "");
    authorize.searchParams.set(
      "code_challenge",
      await sha256Base64Url(verifier)
    );
    authorize.searchParams.set("code_challenge_method", "S256");
    res.statusCode = 302;
    res.setHeader("set-cookie", [
      cookie(COOKIE, state, 600, proto),
      cookie(VERIFIER_COOKIE, verifier, 600, proto),
    ]);
    res.setHeader("location", authorize.toString());
    return res.end();
  }

  if (action === "callback") {
    const verifier = readCookie(req.headers.cookie, VERIFIER_COOKIE);
    // Expire both on first use so neither `state` nor the verifier can be replayed
    res.setHeader("set-cookie", [
      cookie(COOKIE, "", 0, proto),
      cookie(VERIFIER_COOKIE, "", 0, proto),
    ]);

    // A declined consent screen comes back here as `error`, with no `code`
    const denied = url.searchParams.get("error");
    if (denied) {
      return sendResult(res, {
        error:
          denied === "access_denied"
            ? "Sign-in was cancelled."
            : url.searchParams.get("error_description") || denied,
      });
    }

    const state = url.searchParams.get("state");
    const cookieState = readCookie(req.headers.cookie, COOKIE);
    if (!state || state !== cookieState) {
      // A mismatch is a CSRF signal, not a routine hiccup - say so in the log
      console.warn(
        `github-oauth: state mismatch (param ${state ? "present" : "absent"},` +
          ` cookie ${cookieState ? "present" : "absent"})`
      );
      return sendResult(res, { error: "State mismatch. Try again." });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      console.warn("github-oauth: callback carried no code");
      return sendResult(res, { error: "GitHub sent no code. Try again." });
    }

    if (!verifier) {
      console.warn("github-oauth: callback carried no PKCE verifier cookie");
      return sendResult(res, { error: "Sign-in expired. Try again." });
    }

    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        // GitHub matches this against the authorize-time value to bind the code
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    // Read once as text: a non-JSON body (502 page, proxy interstitial) is the
    // case worth logging, and `resp.json()` would destroy it
    const body = await resp.text();
    let data = {};
    try {
      data = JSON.parse(body);
    } catch {
      console.error(
        `github-oauth: non-JSON token response, status ${resp.status}: ` +
          body.slice(0, 200)
      );
    }
    if (!resp.ok || !data.access_token) {
      console.error(
        `github-oauth: token exchange failed, status ${resp.status}: ` +
          (data.error ?? "unparseable")
      );
      return sendResult(res, {
        error:
          data.error_description ||
          `Token exchange failed (HTTP ${resp.status}). Try again.`,
      });
    }
    return sendResult(res, { token: data.access_token });
  }

  console.warn(`github-oauth: unknown action ${action}`);
  return sendResult(res, { error: "Unsupported sign-in request." });
}

/** The page that hands the result to the app and closes the popup */
function sendResult(res, { token, error }) {
  const payload = JSON.stringify({
    type: "pg-github-auth",
    ...(token ? { token } : { error }),
  }).replace(/</g, "\\u003c");
  const nonce = randomHex(16);
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  // This body carries the access token - RFC 6749 5.1
  res.setHeader("cache-control", "no-store");
  // A same-origin frame can read a framed document, and this one holds the
  // token. No `sandbox`: an opaque origin would break `postMessage`/`opener`.
  res.setHeader(
    "content-security-policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`
  );
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-content-type-options", "nosniff");
  // BroadcastChannel is the primary path - `window.opener` is not reliable
  // across the GitHub navigation (COOP severing) - and stays same-origin by
  // construction. The opener post covers runtimes without it; if neither
  // delivered, say so rather than closing like a cancelled sign-in.
  res.end(
    `<!doctype html><meta charset="utf-8"><title>Signing in...</title>` +
      `<script nonce="${nonce}">` +
      `var sent = false;` +
      `try {` +
      `new BroadcastChannel("pg-github-auth").postMessage(${payload});` +
      `sent = true;` +
      `} catch (e) {}` +
      `if (window.opener) {` +
      `window.opener.postMessage(${payload}, window.location.origin);` +
      `window.close();` +
      `} else if (sent) {` +
      `window.close();` +
      `} else {` +
      `document.body.textContent = ` +
      `"Sign-in finished but this window could not reach the app. ` +
      `Close it and try again from the original tab.";` +
      `}` +
      `</script>` +
      `<p>You can close this window.</p>`
  );
}

/** Web Crypto global, so the handler carries no Node-only import */
function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** PKCE S256 challenge - RFC 7636 4.2 */
async function sha256Base64Url(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/** `Secure` only over https - it would stop the cookie working on localhost */
function cookie(name, value, maxAge, proto) {
  return (
    `${name}=${value}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/api` +
    (proto === "https" ? "; Secure" : "")
  );
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
