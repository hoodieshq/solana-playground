// Redeeming the authorization code, and absorbing GitHub's departures from
// RFC 6749 so the caller sees one shape.
//
// GitHub answers protocol errors with HTTP 200 and an `{error}` body rather
// than a 4xx, and can answer with no JSON at all (a 502 page, a proxy
// interstitial). Both are handled here so the endpoint stays a router.

import { GITHUB_TOKEN_URL } from "../config.mjs";

/**
 * @returns {Promise<{token: string} | {error: string}>} never throws for a
 * protocol-level failure; the caller renders whichever arm it gets.
 */
export async function exchangeCode({
  clientId,
  clientSecret,
  code,
  redirectUri,
  verifier,
}) {
  const resp = await fetch(GITHUB_TOKEN_URL, {
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

  // Read once as text: a non-JSON body is the case worth logging, and
  // `resp.json()` would destroy it before we could
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
    return {
      error:
        data.error_description ||
        `Token exchange failed (HTTP ${resp.status}). Try again.`,
    };
  }

  return { token: data.access_token };
}
