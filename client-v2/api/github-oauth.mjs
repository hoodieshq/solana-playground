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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return sendJson(res, 503, {
      error: "GitHub OAuth is not configured in this deployment",
    });
  }

  const proto = req.headers["x-forwarded-proto"] ?? "http";

  if (action === "start") {
    const state = randomHex(16);
    // Hex is already `code_verifier`-safe: unreserved, and 64 chars is inside
    // the 43-128 range RFC 7636 allows
    const verifier = randomHex(32);
    const redirectUri = `${proto}://${req.headers.host}/api/github-oauth?action=callback`;
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
      return sendResult(res, { error: "State mismatch. Try again." });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return sendResult(res, { error: "GitHub sent no code. Try again." });
    }

    if (!verifier) {
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
        code_verifier: verifier,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      return sendResult(res, {
        error: data.error_description || "Token exchange failed.",
      });
    }
    return sendResult(res, { token: data.access_token });
  }

  return sendJson(res, 400, { error: `Unknown action: ${action}` });
}

/** The page that hands the result to the app and closes the popup */
function sendResult(res, { token, error }) {
  const payload = JSON.stringify({
    type: "pg-github-auth",
    ...(token ? { token } : { error }),
  }).replace(/</g, "\\u003c");
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  // This body carries the access token - RFC 6749 5.1
  res.setHeader("cache-control", "no-store");
  // Own origin only: the opener is our SPA on the same host
  res.end(
    `<!doctype html><meta charset="utf-8"><title>Signing in...</title>` +
      `<script>` +
      `if (window.opener) {` +
      `window.opener.postMessage(${payload}, window.location.origin);` +
      `}` +
      `window.close();` +
      `</script>` +
      `<p>You can close this window.</p>`
  );
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
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
