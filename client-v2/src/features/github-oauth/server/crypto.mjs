// Web Crypto only, never `node:crypto`, so the handler stays portable to
// runtimes without Node builtins (Vercel Edge among them).

/** Lower-case hex, `bytes` long. Used for `state`, the flow nonce and the CSP nonce. */
export function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** PKCE S256 code challenge - RFC 7636 4.2 */
export async function sha256Base64Url(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
