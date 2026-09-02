// The pure half of api/build.mjs: which build-server routes the proxy
// forwards, from which request, for whom. Kept beside the other server-side
// .mjs features so it is unit-tested despite api/ sitting outside the
// TypeScript build (see api/health.mjs).

/** The client's whole request surface against the build server, nothing more */
export const ROUTES = [
  { method: "POST", pattern: /^\/build$/ },
  { method: "GET", pattern: /^\/deploy\/[A-Za-z0-9_-]{1,64}$/ },
  // Package names carry a scope slash: /unstable/packages/@coral-xyz/anchor
  {
    method: "GET",
    pattern: /^\/unstable\/(packages|types)\/[@A-Za-z0-9._/-]{1,128}$/,
  },
];

/** Matches the server's own PAYLOAD_LIMIT default (server/src/config.rs) */
export const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Upstream's own production deployment, the one D28 measured. The App Engine
 * URL the client's picker calls "Solana Foundation" builds the same program
 * in the same ~4-5 s when idle; both serialize builds behind a file lock, so
 * a build that is still compiling there (this proxy's timeout does not cancel
 * it server-side) makes the next caller wait for it.
 */
export const DEFAULT_UPSTREAM = "https://api.solpg.io";

/**
 * The build-server path this request asks for.
 *
 * In production a vercel.json rewrite turns `/api/build/deploy/x` into
 * `/api/build?path=deploy/x`; under the dev server the remainder stays on
 * the URL. `?path=` wins so one handler serves both.
 *
 * @param {string} url `req.url`
 * @returns {string | null} a leading-slash path, or null when empty or unsafe
 */
export function resolveUpstreamPath(url) {
  // The URL parser resolves `..` before we could see it; refuse it raw
  const traverses = (s) => s.split("/").some((seg) => seg === "..");
  if (traverses(url.split("?")[0])) return null;

  const parsed = new URL(url.replace(/^(?!\/)/, "/"), "http://placeholder");
  let path = parsed.searchParams.get("path");
  if (path === null) {
    path = parsed.pathname.replace(/^\/api\/build(?=\/|$)/, "");
  }
  path = "/" + path.replace(/^\/+/, "");
  if (path === "/" || traverses(path)) return null;
  return path;
}

/**
 * @param {string} method
 * @param {string} path
 * @returns {{ok: true} | {ok: false, status: 404 | 405, allow?: string}}
 */
export function allowRoute(method, path) {
  const matching = ROUTES.filter((r) => r.pattern.test(path));
  if (!matching.length) return { ok: false, status: 404 };
  if (matching.some((r) => r.method === method)) return { ok: true };
  return {
    ok: false,
    status: 405,
    allow: [...new Set(matching.map((r) => r.method))].join(", "),
  };
}

/**
 * A browser on another site is the one caller CORS would have stopped at the
 * build server and this proxy would otherwise let through. Non-browser
 * clients send neither header and are not the concern here: they can reach
 * the build server directly anyway.
 *
 * @param {Record<string, string | undefined>} headers
 */
export function isCrossSite(headers) {
  const site = headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = headers.origin;
  if (!origin) return false;
  const host = headers["x-forwarded-host"] ?? headers.host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** @param {Record<string, string | undefined>} env */
export function upstreamBase(env) {
  const configured = env.BUILD_SERVER_URL?.trim();
  return (configured || DEFAULT_UPSTREAM).replace(/\/+$/, "");
}
