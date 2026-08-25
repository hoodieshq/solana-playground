/**
 * GitHub OAuth web-flow exchange.
 *
 * `?action=start` redirects to GitHub's authorize page with a random
 * `state` pinned in a short-lived HttpOnly cookie. `?action=callback`
 * verifies the state, exchanges the code for an access token using the
 * client secret - which therefore never reaches the browser - and
 * answers a page that posts the token to `window.opener` (same origin
 * only) and closes itself. The SPA keeps the token in memory; nothing
 * is persisted anywhere.
 *
 * Plain ESM on raw Node request/response APIs - see `api/health.mjs`
 * for why.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
import { randomBytes } from "node:crypto";

const COOKIE = "pg_gh_oauth_state";

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

  if (action === "start") {
    const state = randomBytes(16).toString("hex");
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const redirectUri = `${proto}://${req.headers.host}/api/github-oauth?action=callback`;
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("state", state);
    res.statusCode = 302;
    res.setHeader(
      "set-cookie",
      `${COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/api`,
    );
    res.setHeader("location", authorize.toString());
    return res.end();
  }

  if (action === "callback") {
    const state = url.searchParams.get("state");
    const cookieState = readCookie(req.headers.cookie, COOKIE);
    if (!state || state !== cookieState) {
      return sendResult(res, { error: "State mismatch. Try again." });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return sendResult(res, { error: "GitHub sent no code. Try again." });
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
  });
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  // Own origin only: the opener is our SPA on the same host
  res.end(
    `<!doctype html><meta charset="utf-8"><title>Signing in...</title>` +
      `<script>` +
      `if (window.opener) {` +
      `window.opener.postMessage(${payload}, window.location.origin);` +
      `}` +
      `window.close();` +
      `</script>` +
      `<p>You can close this window.</p>`,
  );
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
