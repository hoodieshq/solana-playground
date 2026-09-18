/**
 * Every `/api` path the browser calls must be served by a file on the platform.
 *
 * Vercel maps `api/<name>.mjs` to exactly `/api/<name>` -- one path, never a
 * subtree. A nested path needs a catch-all file (`api/<name>/[...all].mjs`).
 * When that file is missing the request does not 404: nothing in the
 * filesystem matches, so the SPA rewrite in `vercel.json` takes it and answers
 * with `index.html`. That is a static file, so a POST comes back
 * `405 Method Not Allowed` and no code of ours ever runs -- which is exactly
 * how `/api/auth/sign-in/social` failed on a preview deployment while working
 * locally.
 *
 * It works locally because the dev server dispatches on the first path segment
 * (`resolveApiRoute` in `craco.config.js`), so it serves a subtree whether or
 * not the deployed layout can. Only the file tree can tell us the truth, which
 * is what this asserts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Vercel's own name for a catch-all: `[...anything]` */
const CATCH_ALL = /^\[\.\.\..+\]\.mjs$/;

/**
 * The file the platform would invoke for a path, by Vercel's routing rules:
 * an exact match first, then the nearest catch-all above it.
 *
 * @param {string} urlPath e.g. `/api/auth/sign-in/social`
 * @returns {string | null} the file, relative to `client-v2`, or `null`
 */
const servingFile = (urlPath) => {
  const segments = urlPath.replace(/^\/api\//, "").split("/");

  const exact = path.join("api", ...segments) + ".mjs";
  if (existsSync(path.join(root, exact))) return exact;

  for (let depth = segments.length - 1; depth >= 0; depth--) {
    const dir = path.join("api", ...segments.slice(0, depth));
    if (!existsSync(path.join(root, dir))) continue;
    const found = readdirSync(path.join(root, dir)).find((f) =>
      CATCH_ALL.test(f)
    );
    if (found) return path.join(dir, found);
  }

  return null;
};

/** What the app actually calls. Better Auth's own routes are the nested ones. */
const CALLED_PATHS = [
  "/api/agent",
  "/api/auth-complete",
  "/api/auth/callback/github",
  "/api/auth/get-session",
  "/api/auth/sign-in/social",
  "/api/auth/sign-out",
  "/api/conversations",
  "/api/health",
  "/api/mcp",
  "/api/projects",
  "/api/sync",
];

describe("deployed API routing", () => {
  for (const urlPath of CALLED_PATHS) {
    it(`serves ${urlPath}`, () => {
      assert.ok(
        servingFile(urlPath),
        `No file under api/ answers ${urlPath} on the platform`
      );
    });
  }

  it("keeps the SPA rewrite off /api, so a miss is a 404 and not index.html", () => {
    const { rewrites } = JSON.parse(
      readFileSync(path.join(root, "vercel.json"), "utf8")
    );

    for (const { source, destination } of rewrites) {
      if (destination === "/index.html") {
        assert.doesNotMatch(
          "/api/auth/sign-in/social",
          new RegExp(`^${source}$`),
          `${source} swallows /api paths into the SPA fallback`
        );
      }
    }
  });
});
