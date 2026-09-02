/**
 * Same-origin proxy to the Solana Playground build server (D28).
 *
 * The Foundation's server answers CORS preflights only for an allowlist of
 * origins (localhost, beta.solpg.io). A production deployment of this fork
 * lives on a domain it does not know, so the browser's direct call dies at
 * the preflight. Server-to-server requests have no preflight: the client
 * talks to this route on its own origin and this route talks to the build
 * server. If the Foundation grants the allowlist entry, this route thins out
 * or disappears.
 *
 * What it forwards is exactly the client's request surface -- POST /build,
 * GET /deploy/:uuid, GET /unstable/{packages,types}/:name -- and it forwards
 * responses byte for byte: a failed compile's stderr is in the body and the
 * assistant reads it, so nothing here rewrites an error.
 *
 * Cheap hardening only (the rest is H1, alongside /api/agent): the route
 * allowlist, a 1 MiB body cap matching the server's own PAYLOAD_LIMIT, a
 * cross-site refusal, no request header forwarded but content-type and
 * accept, a 60 s upstream timeout. There is no rate limit here yet: our
 * origin is now the traffic source in front of the Foundation's server, and
 * that obligation is recorded, not met.
 *
 * Plain ESM on raw Node request/response APIs -- see api/health.mjs for why.
 * Routing: under the dev server the path remainder stays on req.url; in
 * production a vercel.json rewrite passes it as ?path=. route.mjs reads both.
 */

import {
  allowRoute,
  isCrossSite,
  MAX_BODY_BYTES,
  resolveUpstreamPath,
  upstreamBase,
} from "../src/features/build-proxy/server/route.mjs";

/** How long a build may take before we give up on the upstream */
const UPSTREAM_TIMEOUT_MS = 60_000;

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

/** Read up to the cap; `null` past it (the caller answers 413) */
const readBody = async (req) => {
  if (req.body !== undefined) {
    const buf = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === "string" ? req.body : JSON.stringify(req.body)
        );
    return buf.length > MAX_BODY_BYTES ? null : buf;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  const path = resolveUpstreamPath(req.url ?? "/");
  const route = path ? allowRoute(req.method ?? "GET", path) : null;
  if (!route?.ok) {
    if (route?.status === 405) {
      res.setHeader("allow", route.allow);
      return sendJson(res, 405, { error: `Use ${route.allow} for ${path}.` });
    }
    return sendJson(res, 404, { error: `No build route at ${path ?? "/"}.` });
  }

  if (isCrossSite(req.headers)) {
    return sendJson(res, 403, {
      error: "The build proxy serves this site only.",
    });
  }

  const init = { method: req.method, headers: {} };
  if (req.method === "POST") {
    const body = await readBody(req);
    if (body === null) {
      return sendJson(res, 413, {
        error: `Request body over ${MAX_BODY_BYTES} bytes.`,
      });
    }
    init.body = body;
    init.headers["content-type"] =
      req.headers["content-type"] ?? "application/json";
  }
  if (req.headers.accept) init.headers.accept = req.headers.accept;
  init.signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(upstreamBase(process.env) + path, init);
  } catch (e) {
    if (e?.name === "TimeoutError") {
      return sendJson(res, 504, {
        error: `Build server did not answer within ${
          UPSTREAM_TIMEOUT_MS / 1000
        }s.`,
      });
    }
    return sendJson(res, 502, {
      error: `Build server unreachable: ${e?.cause?.code ?? e?.message}`,
    });
  }

  // Byte for byte: the status, the content type and the body are the build
  // server's, including the stderr of a failed compile
  res.statusCode = upstream.status;
  const type = upstream.headers.get("content-type");
  if (type) res.setHeader("content-type", type);
  if (!upstream.body) return res.end();

  const reader = upstream.body.getReader();
  req.on?.("close", () => reader.cancel().catch(() => {}));
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // A full write buffer means the client is slower than the upstream
      if (!res.write(value)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
  } finally {
    res.end();
  }
}
