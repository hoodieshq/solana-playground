/**
 * Better Auth's catch-all. Every `/api/auth/...` path lands here.
 *
 * The file name is the routing: Vercel maps `api/auth.mjs` to exactly
 * `/api/auth` and nothing below it, so as a flat file this module answered
 * none of the routes Better Auth actually serves -- `/api/auth/sign-in/social`
 * missed the filesystem entirely and the SPA rewrite handed it `index.html`,
 * which as a static file answers a POST with `405 Method Not Allowed`. A
 * `[...all]` file is how one module serves the whole subtree. `api-routing.test.mjs`
 * holds the rule.
 *
 * The dev server reaches the same module by dispatching on the first path
 * segment (see `resolveApiRoute` in `craco.config.js`).
 */
import { toNodeHandler } from "better-auth/node";

import { getAuth } from "../../src/features/auth/server/auth.mjs";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  const auth = getAuth();
  if (!auth) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    return res.end(
      JSON.stringify({ error: "Authentication is not configured" })
    );
  }

  return toNodeHandler(auth)(req, res);
}
