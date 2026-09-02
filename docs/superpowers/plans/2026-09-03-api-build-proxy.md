# Same-origin Build Proxy (D28, launch floor half-project 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In production the client talks to the build server through a
same-origin `/api/build/*` route, so a deployment on a domain the
Foundation's CORS allowlist does not know about can still build and
deploy; local development is unchanged.

**Architecture:** One new handler `api/build.mjs` (the D20 shape: plain
ESM, raw Node req/res, served by the craco middleware in dev and as a
function in prod) forwards an allowlisted set of build-server routes to
a configurable upstream and returns status, content-type and body
byte-for-byte. The pure parts - path resolution, the route allowlist,
the cross-site check - live in `src/features/build-proxy/server/` and
are unit-tested; the handler is pinned by an integration spec with a
fake `fetch`. The client changes its *production default* endpoint to
`/api/build`, keeps the picker, and gains one named option for it.

**Tech Stack:** Node 22 `fetch` + `AbortSignal.timeout`, jest via
`craco test` (the OAuth feature's pattern: `.mjs` logic imported by a
`.test.ts`), CRA env at build time for the client default. No new
dependencies.

**Spec:** D28 in `docs/decisions.md`; the round brief
`docs/internal/2026-09-03-launch-floor-brief.md` (half-project 2); D20
for the handler shape. Measured 2026-09-02 (see friction log #7): the
allowlist is `CLIENT_URLS` prefix-matched on **every** route of
`server/` (`middlewares/cors.rs`), default
`http://localhost,https://beta.solpg.io`; both `api.solpg.io` and the
appspot URL echo `access-control-allow-origin` for `localhost:3000` and
for nothing else we tried; `/deploy/*` and `/unstable/*` are gated
exactly like `/build`.

## Global Constraints

- Branch `feat/api-build-proxy`, cut fresh from `master-2.0`
  (`1d908844`); **not** from `feat/lesson-ledger` or
  `fix/ci-production-bundle`. PR against `master-2.0`. No AI
  attribution, no `docs/`, no `CLAUDE.md` on the branch, English only.
- CONTRIBUTING: 80 columns, 2-space indent, prettier (`yarn check-format`
  covers `api/` only once #21 merges - run `npx prettier --check api/`
  by hand until then); no `any`, no `@ts-ignore`; `import type`.
- `server/` untouched. `client/` untouched. Upstream-derived files in
  `client-v2/` edited minimally: `settings/server/server.ts` (two lines
  + one picker entry), `views/flow/stages/Build.tsx` (one line),
  `craco.config.js` (the D20 middleware, ~6 lines), root `vercel.json`
  (one rewrite, one `functions` entry), `.env.example` (one block).
  `commands/build/build.ts` and `utils/server.ts` are **not** touched:
  `PgServer._send` already builds every URL from
  `PgSettings.server.endpoint`, so changing the default is enough.
- Every request the browser makes to the build server today must work
  through the proxy: `POST /build`, `GET /deploy/:uuid`,
  `GET /unstable/packages/:name`, `GET /unstable/types/:name` (the
  names contain `@scope/name`, i.e. a slash).
- Verification per task: `npx tsc --noEmit`, the touched test files,
  and before push `CI=true yarn test-unit` + `yarn check-format` +
  `npx prettier --check api/ ../vercel.json`. Baseline 242 / 27.
- Friction entries go to
  `docs/internal/2026-09-03-launch-floor-friction.md` (section
  "Half-project 2") as found.

## Decisions the brief leaves to the implementation

1. **Upstream default is the client's own production default**,
   `https://playground-server-dot-analytics-324114.de.r.appspot.com`
   (`FOUNDATION_ENDPOINT` in `settings/server/server.ts`), overridable
   with `BUILD_SERVER_URL` (server-side env, never `REACT_APP_*`). D28
   names `api.solpg.io`, but the fork already points production at the
   appspot deployment and `api.solpg.io` is the older one (roadmap,
   "Upstream drift"). One env var, no second source of truth.
2. **Local development keeps hitting the build server directly.** The
   dev default stays `http://localhost:8080` (unchanged from upstream);
   `localhost:3000` is allowlisted, so pointing the picker at the
   Foundation server works as before. `/api/build` is offered as a
   named picker entry ("This site") so the proxy can be exercised under
   `yarn dev` without editing code. Only the **production** default
   changes.
3. **The proxy covers the whole build round trip**, not `/build` alone:
   the same allowlist gates `/deploy/:uuid` (the ELF the client fetches
   to deploy) and the `/unstable/*` package routes, so a `/build`-only
   proxy would fail at the demo's own next step. The allowlist in the
   handler is the client's request surface and nothing else.
4. **Nested paths under `/api/build`.** The dev middleware maps
   `/api/<name>` to `api/<name>.mjs` and rejects slashes. It is extended
   to take the first segment as the module and leave the rest on
   `req.url`; in production a `vercel.json` rewrite sends
   `/api/build/:path*` to `/api/build?path=:path*`. The handler reads
   the upstream path from `?path=` first and the URL remainder second,
   so one function serves both runtimes.
5. **Cheap H1 hardening ships here; the rest is H1's scope.** In:
   method+path allowlist (anything else 404/405), a 1 MiB request cap
   (the server's own `PAYLOAD_LIMIT` default), a cross-site refusal
   (`sec-fetch-site` present and not `same-origin`/`none`, or `origin`
   present and not our host -> 403; curl and same-origin fetches pass),
   only `content-type` and `accept` forwarded, a 60 s upstream timeout
   (`maxDuration: 60` on the function - M4's fix for `agent.mjs` stays
   its own item). Out: per-IP rate limiting, metering.
6. **Errors pass through untouched.** The build server answers a failed
   compile with a non-2xx and the raw `stderr` in the body; the
   assistant reads it. The proxy copies status, `content-type` and body
   bytes and adds nothing. Only *our* failures (bad route, cap, upstream
   unreachable/timeout) get a JSON `{error}` body, with 4xx/502/504.
7. **`Build.tsx` shows the host of a relative endpoint as our own host.**
   `new URL(endpoint)` throws on `/api/build`; it becomes
   `new URL(endpoint, window.location.origin).host`.

---

### Task 1: Worktree and a red-green start on the pure route logic

**Files:**
- Create: `client-v2/src/features/build-proxy/server/route.mjs`
- Test: `client-v2/src/features/build-proxy/server/route.test.ts`

**Interfaces (produced):**
```js
// route.mjs
export const ROUTES = [
  { method: "POST", pattern: /^\/build$/ },
  { method: "GET", pattern: /^\/deploy\/[A-Za-z0-9_-]{1,64}$/ },
  { method: "GET", pattern: /^\/unstable\/(packages|types)\/[@A-Za-z0-9._\/-]{1,128}$/ },
];
export const MAX_BODY_BYTES = 1024 * 1024;
/** `?path=` first (the Vercel rewrite), else the remainder after `/api/build`; always leading-slash, no query, no `..`; null when empty or unsafe */
export function resolveUpstreamPath(url: string): string | null;
/** { ok: true } | { ok: false, status: 404 | 405, allow?: string } */
export function allowRoute(method: string, path: string): { ok: boolean; status?: number; allow?: string };
/** true when the request is a browser call from another site */
export function isCrossSite(headers: Record<string, string | undefined>): boolean;
export function upstreamBase(env: Record<string, string | undefined>): string;
```

- [ ] **Step 1: Create the worktree and set it up**

```sh
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground
git worktree add .claude/worktrees/api-build-proxy -b feat/api-build-proxy master-2.0
cd .claude/worktrees/api-build-proxy && ./wasm/stub-packages.sh
cd client-v2 && yarn install --frozen-lockfile && yarn generate-fast
```
Expected: `Synced 201 files from client/public@...`; no errors.

- [ ] **Step 2: Write the failing tests**

`src/features/build-proxy/server/route.test.ts`:
```ts
import {
  allowRoute,
  isCrossSite,
  resolveUpstreamPath,
  upstreamBase,
} from "./route.mjs";

describe("resolveUpstreamPath", () => {
  it("takes the URL remainder under the dev server", () => {
    expect(resolveUpstreamPath("/build")).toBe("/build");
    expect(resolveUpstreamPath("/deploy/abc-123")).toBe("/deploy/abc-123");
  });
  it("prefers ?path= (the production rewrite)", () => {
    expect(resolveUpstreamPath("/?path=deploy/abc")).toBe("/deploy/abc");
    expect(resolveUpstreamPath("/api/build?path=%2Fbuild")).toBe("/build");
  });
  it("normalizes the leading slash and drops the query", () => {
    expect(resolveUpstreamPath("build?x=1")).toBe("/build");
  });
  it("refuses empty and traversing paths", () => {
    expect(resolveUpstreamPath("/")).toBeNull();
    expect(resolveUpstreamPath("/?path=")).toBeNull();
    expect(resolveUpstreamPath("/deploy/../admin")).toBeNull();
    expect(resolveUpstreamPath("/?path=..%2Fx")).toBeNull();
  });
});

describe("allowRoute", () => {
  it("allows exactly the client's request surface", () => {
    expect(allowRoute("POST", "/build")).toEqual({ ok: true });
    expect(allowRoute("GET", "/deploy/9f1c2d3e-uuid")).toEqual({ ok: true });
    expect(allowRoute("GET", "/unstable/packages/@coral-xyz/anchor")).toEqual({ ok: true });
    expect(allowRoute("GET", "/unstable/types/mocha")).toEqual({ ok: true });
  });
  it("answers 405 with an Allow header for a known path and the wrong method", () => {
    expect(allowRoute("GET", "/build")).toEqual({ ok: false, status: 405, allow: "POST" });
    expect(allowRoute("POST", "/deploy/x")).toEqual({ ok: false, status: 405, allow: "GET" });
  });
  it("answers 404 for anything else", () => {
    expect(allowRoute("POST", "/new")).toEqual({ ok: false, status: 404 });
    expect(allowRoute("GET", "/share/abc")).toEqual({ ok: false, status: 404 });
    expect(allowRoute("GET", "/unstable/bundle/x")).toEqual({ ok: false, status: 404 });
  });
});

describe("isCrossSite", () => {
  it("passes same-origin fetches, navigations and non-browser clients", () => {
    expect(isCrossSite({ "sec-fetch-site": "same-origin" })).toBe(false);
    expect(isCrossSite({ "sec-fetch-site": "none" })).toBe(false);
    expect(isCrossSite({})).toBe(false);
    expect(isCrossSite({ host: "pg.example", origin: "https://pg.example" })).toBe(false);
  });
  it("refuses another site's browser", () => {
    expect(isCrossSite({ "sec-fetch-site": "cross-site" })).toBe(true);
    expect(isCrossSite({ host: "pg.example", origin: "https://evil.example" })).toBe(true);
  });
  it("trusts x-forwarded-host over host behind a proxy", () => {
    expect(isCrossSite({ host: "internal:3000", "x-forwarded-host": "pg.example", origin: "https://pg.example" })).toBe(false);
  });
});

describe("upstreamBase", () => {
  it("defaults to the Foundation deployment and strips a trailing slash", () => {
    expect(upstreamBase({})).toBe("https://playground-server-dot-analytics-324114.de.r.appspot.com");
    expect(upstreamBase({ BUILD_SERVER_URL: "http://localhost:8080/" })).toBe("http://localhost:8080");
    expect(upstreamBase({ BUILD_SERVER_URL: "  " })).toBe("https://playground-server-dot-analytics-324114.de.r.appspot.com");
  });
});
```

- [ ] **Step 3: Run it - it must fail on the missing module**

```sh
CI=true npx craco test --watchAll=false src/features/build-proxy
```
Expected: `Cannot find module './route.mjs'`.

- [ ] **Step 4: Implement `route.mjs`**

```js
// The pure half of api/build.mjs: which build-server routes the proxy
// forwards, from which request, for whom. Kept beside the other
// server-side .mjs features so it is unit-tested despite api/ sitting
// outside the TypeScript build (see api/health.mjs).

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

export const DEFAULT_UPSTREAM =
  "https://playground-server-dot-analytics-324114.de.r.appspot.com";

/**
 * The build-server path this request asks for.
 *
 * In production a vercel.json rewrite turns `/api/build/deploy/x` into
 * `/api/build?path=deploy/x`; under the dev server the remainder stays on
 * the URL. `?path=` wins so one handler serves both.
 *
 * @param {string} url `req.url`
 * @returns {string | null} a leading-slash path, or null when empty/unsafe
 */
export function resolveUpstreamPath(url) {
  const parsed = new URL(url, "http://placeholder");
  let path = parsed.searchParams.get("path");
  if (path === null) {
    path = parsed.pathname.replace(/^\/api\/build(?=\/|$)/, "");
  }
  path = "/" + path.replace(/^\/+/, "");
  if (path === "/") return null;
  if (path.split("/").some((seg) => seg === "..")) return null;
  return path;
}

/**
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
 * A browser on another site is the one caller CORS would have stopped at
 * the build server and this proxy would otherwise let through. Non-browser
 * clients send neither header and are not the concern here (they could
 * reach the build server directly anyway).
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

export function upstreamBase(env) {
  const configured = env.BUILD_SERVER_URL?.trim();
  return (configured || DEFAULT_UPSTREAM).replace(/\/+$/, "");
}
```

- [ ] **Step 5: Run the tests - green**

```sh
CI=true npx craco test --watchAll=false src/features/build-proxy
```
Expected: all pass. Fix anything the regexes miss (e.g. the
`resolveUpstreamPath("build?x=1")` case relies on `new URL` treating a
bare `build` as a path - if it does not, prepend `/` before parsing).

- [ ] **Step 6: Commit**

```sh
npx prettier --write src/features/build-proxy && npx tsc --noEmit
git add src/features/build-proxy
git commit -m "Add the build proxy's route logic: which paths, from whom, to where"
```

---

### Task 2: The handler, pinned by an integration spec

**Files:**
- Create: `client-v2/api/build.mjs`
- Test: `client-v2/src/features/build-proxy/build.integration.spec.ts`

**Interfaces:**
- Consumes Task 1's exports.
- Produces: `export default async function handler(req, res)` at
  `/api/build`; responds with the upstream's status/content-type/body,
  or `{error}` JSON for 403/404/405/413/502/504.

- [ ] **Step 1: Write the failing spec**

```ts
// api/ is plain ESM outside the TS build (see api/health.mjs); jest resolves
// it by relative path, same as github-auth.integration.spec.ts
import { Readable } from "node:stream";

import handler from "../../../api/build.mjs";

interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  chunks: Buffer[];
  ended: boolean;
  setHeader: (k: string, v: string) => void;
  write: (c: Uint8Array | string) => boolean;
  end: (c?: Uint8Array | string) => void;
  once: (ev: string, cb: () => void) => void;
  body: () => string;
}
const makeRes = (): FakeRes => ({
  statusCode: 0,
  headers: {},
  chunks: [],
  ended: false,
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
  write(c) { this.chunks.push(Buffer.from(c)); return true; },
  end(c) { if (c) this.chunks.push(Buffer.from(c)); this.ended = true; },
  once() {},
  body() { return Buffer.concat(this.chunks).toString("utf8"); },
});
const makeReq = (opts: { method?: string; url: string; headers?: Record<string, string>; body?: string }) => {
  const req = Readable.from(opts.body ? [Buffer.from(opts.body)] : []) as Readable & {
    method: string; url: string; headers: Record<string, string>;
  };
  req.method = opts.method ?? "GET";
  req.url = opts.url;
  req.headers = { host: "pg.example", ...(opts.headers ?? {}) };
  return req;
};

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  delete process.env.BUILD_SERVER_URL;
});

const upstreamResponse = (status: number, body: string, type = "application/json") =>
  new Response(body, { status, headers: { "content-type": type } });

describe("api/build", () => {
  it("forwards POST /build with the JSON body and returns the response byte for byte", async () => {
    fetchMock.mockResolvedValue(upstreamResponse(200, '{"stderr":"ok","uuid":"u1","idl":null}'));
    const res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: '{"files":[]}' }), res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://playground-server-dot-analytics-324114.de.r.appspot.com/build");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(Buffer.from(init.body).toString()).toBe('{"files":[]}');
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json");
    expect(res.body()).toBe('{"stderr":"ok","uuid":"u1","idl":null}');
  });

  it("passes a build failure through untouched: status and stderr body", async () => {
    fetchMock.mockResolvedValue(upstreamResponse(400, "error[E0425]: cannot find value `x`", "text/plain; charset=utf-8"));
    const res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json" }, body: "{}" }), res);
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.body()).toBe("error[E0425]: cannot find value `x`");
  });

  it("forwards GET /deploy/:uuid as binary and honours BUILD_SERVER_URL", async () => {
    process.env.BUILD_SERVER_URL = "http://localhost:8080/";
    const bytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    fetchMock.mockResolvedValue(new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } }));
    const res = makeRes();
    await handler(makeReq({ url: "/api/build?path=deploy/u1" }), res);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8080/deploy/u1");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(Buffer.concat(res.chunks)).toEqual(Buffer.from(bytes));
  });

  it("does not forward cookies, authorization or any other request header", async () => {
    fetchMock.mockResolvedValue(upstreamResponse(200, "{}"));
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json", cookie: "a=b", authorization: "Bearer x", "x-forwarded-for": "1.2.3.4" }, body: "{}" }), makeRes());
    expect(Object.keys(fetchMock.mock.calls[0][1].headers)).toEqual(["content-type"]);
  });

  it("404s an unknown path and 405s a wrong method, without calling upstream", async () => {
    let res = makeRes();
    await handler(makeReq({ method: "POST", url: "/new", body: "{}" }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body()).error).toMatch(/No build route/);
    res = makeRes();
    await handler(makeReq({ method: "GET", url: "/build" }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("POST");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses another site's browser with 403", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" }), res);
    expect(res.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps the request body at 1 MiB with 413", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json" }, body: "x".repeat(1024 * 1024 + 1) }), res);
    expect(res.statusCode).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 when the upstream is unreachable and 504 on timeout", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } }));
    let res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json" }, body: "{}" }), res);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body()).error).toMatch(/Build server unreachable/);
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));
    res = makeRes();
    await handler(makeReq({ method: "POST", url: "/build", headers: { "content-type": "application/json" }, body: "{}" }), res);
    expect(res.statusCode).toBe(504);
  });
});
```

- [ ] **Step 2: Run - fails on the missing handler**

```sh
CI=true npx craco test --watchAll=false src/features/build-proxy
```
Expected: `Cannot find module '../../../api/build.mjs'`.

- [ ] **Step 3: Implement `api/build.mjs`**

```js
/**
 * Same-origin proxy to the Solana Playground build server (D28).
 *
 * The Foundation's server answers CORS preflights only for an allowlist of
 * origins (localhost, beta.solpg.io). A production deployment of this fork
 * lives on a domain it does not know, so the browser's direct call dies at
 * the preflight. Server-to-server requests have no preflight: the client
 * talks to this route on its own origin and this route talks to the build
 * server. If the Foundation grants the allowlist entry, this route thins
 * out or disappears.
 *
 * What it forwards is exactly the client's request surface -- POST /build,
 * GET /deploy/:uuid, GET /unstable/{packages,types}/:name -- and it forwards
 * responses byte for byte: a failed compile's stderr is in the body and the
 * assistant reads it, so nothing here rewrites an error.
 *
 * Cheap hardening only (the rest is H1, alongside /api/agent): route
 * allowlist, a 1 MiB body cap matching the server's own PAYLOAD_LIMIT, a
 * cross-site refusal, no request header forwarded but content-type, a 60 s
 * upstream timeout. There is no rate limit here yet: our origin is now the
 * traffic source in front of the Foundation's server, and that obligation
 * is recorded, not met.
 *
 * Plain ESM on raw Node request/response APIs -- see api/health.mjs for why.
 * Routing: under the dev server the path remainder stays on req.url; in
 * production a vercel.json rewrite passes it as ?path=. route.mjs handles
 * both.
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
  if (!path || !route.ok) {
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
        error: `Build server did not answer within ${UPSTREAM_TIMEOUT_MS / 1000}s.`,
      });
    }
    return sendJson(res, 502, {
      error: `Build server unreachable: ${e?.cause?.code ?? e?.message}`,
    });
  }

  // Byte-for-byte: the status, the content type and the body are the build
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
      if (!res.write(value)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
  } finally {
    res.end();
  }
}
```

Note on the spec's `expect(init.headers).toEqual({ "content-type": ... })`
for POST: the fake requests send no `accept`, so only `content-type`
lands. The "does not forward" test lists exactly `["content-type"]` for
the same reason.

- [ ] **Step 4: Run - green**

```sh
CI=true npx craco test --watchAll=false src/features/build-proxy
```
Expected: all pass (Task 1's too). If jest's environment lacks
`Response`/`AbortSignal.timeout` (jsdom), add
`/** @jest-environment node */` as the first line of the spec.

- [ ] **Step 5: Format, type-check, commit**

```sh
npx prettier --write api/build.mjs src/features/build-proxy && npx tsc --noEmit
git add api/build.mjs src/features/build-proxy
git commit -m "Add /api/build, a same-origin proxy to the build server

The Foundation's server answers CORS preflights only for an allowlist of
origins, so a production domain of this fork is refused before a build
starts (D28). This route forwards exactly the client's request surface -
POST /build, GET /deploy/:uuid, GET /unstable/{packages,types}/:name - to
the configured upstream and returns status, content type and body byte
for byte, so a failed compile's stderr reaches the assistant unchanged.
Cheap hardening only: route allowlist, 1 MiB cap, cross-site refusal, no
header pass-through, 60 s timeout. Rate limiting is H1's."
```

---

### Task 3: Serve nested paths in dev and in production

**Files:**
- Modify: `client-v2/craco.config.js` (the `serveApiRoute` function,
  ~lines 333-352)
- Modify: `vercel.json` (repo root): one rewrite before the SPA
  fallback, one `functions` entry
- Modify: `client-v2/.env.example`: a `BUILD_SERVER_URL` line in the
  build-server block

- [ ] **Step 1: Let the middleware take `/api/<name>/<rest>`**

In `craco.config.js`, `serveApiRoute` currently does
```js
  const name = req.url.split("?")[0].replace(/^\/+/, "");
  // Constrained rather than sanitised: ...
  if (!/^[a-z0-9-]+$/.test(name)) {
```
Change to
```js
  // The first segment picks the module; the remainder stays on `req.url`
  // for routes that carry a path of their own (`/api/build/deploy/<uuid>`),
  // matching the vercel.json rewrite that does the same in production
  const [name] = req.url.split("?")[0].replace(/^\/+/, "").split("/");
  // Constrained rather than sanitised: ...
  if (!/^[a-z0-9-]+$/.test(name)) {
```
and, just before `await route.default(req, res);`, strip the module
segment so the handler sees the remainder the way the rewrite delivers
it:
```js
    req.url = req.url.replace(new RegExp(`^/${name}(?=/|\\?|$)`), "") || "/";
```

- [ ] **Step 2: The production rewrite and the function timeout**

`vercel.json` becomes
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "bash scripts/vercel-install.sh",
  "buildCommand": "NODE_OPTIONS='--max-old-space-size=6144' yarn build",
  "devCommand": "yarn dev-cra",
  "outputDirectory": "build",
  "trailingSlash": false,
  "functions": {
    "api/build.mjs": { "maxDuration": 60 }
  },
  "rewrites": [
    {
      "source": "/api/build/:path*",
      "destination": "/api/build?path=:path*"
    },
    {
      "source": "/((?!static/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ]
}
```
Check first that `scripts/vercel-install.sh` exists where the file
says (`vercel.json` sits at the repo root with `rootDirectory:
client-v2`, so paths are relative to `client-v2`).

- [ ] **Step 3: Document the env var**

In `.env.example`, after the `REACT_APP_SERVER_URL=` line:
```
# Where api/build.mjs forwards builds (server-side; never reaches the bundle).
# Unset, it uses the Foundation deployment the client defaults to. Set it to
# http://localhost:8080 to proxy a locally running server.
BUILD_SERVER_URL=
```

- [ ] **Step 4: Verify the dev middleware by hand**

```sh
lsof -ti :3000 || echo free          # kill only your own processes
BROWSER=none yarn dev-cra > /tmp/dev.log 2>&1 &   # scratchpad path in practice
# wait for "Compiled successfully" / "webpack compiled"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health          # 200
curl -s -w "\n%{http_code}\n" http://localhost:3000/api/build/build                 # 405, Allow: POST
curl -s -w "\n%{http_code}\n" http://localhost:3000/api/build/nope                  # 404 JSON
curl -s -w "\n%{http_code}\n" -X POST http://localhost:3000/api/build/build \
  -H 'content-type: application/json' \
  --data '{"files":[["src/lib.rs","use anchor_lang::prelude::*;\ndeclare_id!(\"11111111111111111111111111111111\");\n#[program]\npub mod t { use super::*; pub fn go(_ctx: Context<Go>) -> Result<()> { let x: u8 = \"no\"; Ok(()) } }\n#[derive(Accounts)]\npub struct Go {}\n"]]}'
```
Expected: the last call returns the build server's own status and a
body whose `stderr` carries `error[E0308]: mismatched types` - the
error passed through untouched. Record wall-clock time.

- [ ] **Step 5: Commit**

```sh
npx prettier --check craco.config.js ../vercel.json .env.example
git add craco.config.js ../vercel.json .env.example
git commit -m "Route /api/build/* to the build proxy in dev and in production

The dev middleware takes the first segment as the module and leaves the
remainder on req.url; vercel.json rewrites /api/build/:path* to
?path=:path* and gives the function 60 s, the time a build may take."
```

---

### Task 4: The client's production default becomes the proxy

**Files:**
- Create: `client-v2/src/settings/server/default-endpoint.ts`
- Test: `client-v2/src/settings/server/default-endpoint.test.ts`
- Modify: `client-v2/src/settings/server/server.ts` (default + one picker
  entry)
- Modify: `client-v2/src/views/flow/stages/Build.tsx:195`

**Interfaces (produced):**
```ts
export const SAME_ORIGIN_ENDPOINT = "/api/build";
export const defaultServerEndpoint = (env: {
  REACT_APP_SERVER_URL?: string; NODE_ENV?: string;
}, endpoints: { local: string }) => string;
```

- [ ] **Step 1: Failing test**

`src/settings/server/default-endpoint.test.ts`:
```ts
import { defaultServerEndpoint, SAME_ORIGIN_ENDPOINT } from "./default-endpoint";

const LOCAL = "http://localhost:8080";

describe("defaultServerEndpoint", () => {
  it("is the same-origin proxy in production", () => {
    expect(defaultServerEndpoint({ NODE_ENV: "production" }, { local: LOCAL })).toBe(SAME_ORIGIN_ENDPOINT);
  });
  it("stays the local server in development and test", () => {
    expect(defaultServerEndpoint({ NODE_ENV: "development" }, { local: LOCAL })).toBe(LOCAL);
    expect(defaultServerEndpoint({ NODE_ENV: "test" }, { local: LOCAL })).toBe(LOCAL);
  });
  it("lets REACT_APP_SERVER_URL win, but not an empty one", () => {
    expect(defaultServerEndpoint({ NODE_ENV: "production", REACT_APP_SERVER_URL: "https://x.example" }, { local: LOCAL })).toBe("https://x.example");
    expect(defaultServerEndpoint({ NODE_ENV: "production", REACT_APP_SERVER_URL: "" }, { local: LOCAL })).toBe(SAME_ORIGIN_ENDPOINT);
  });
});
```

- [ ] **Step 2: Run - fails** (`Cannot find module './default-endpoint'`).

- [ ] **Step 3: Implement**

`src/settings/server/default-endpoint.ts`:
```ts
/** The same-origin build proxy, `api/build.mjs` (D28) */
export const SAME_ORIGIN_ENDPOINT = "/api/build";

/**
 * Which build server a fresh profile talks to.
 *
 * Production goes through the same-origin proxy: the Foundation's server
 * allowlists origins and a deployment of this fork is not on the list.
 * Development keeps the local server, as upstream does; `localhost:3000`
 * is allowlisted, so the picker can still point straight at the
 * Foundation. `||` not `??`: sourcing an env file leaves unfilled keys as
 * "", which is not nullish and would win.
 */
export const defaultServerEndpoint = (
  env: { REACT_APP_SERVER_URL?: string; NODE_ENV?: string },
  endpoints: { local: string }
) =>
  env.REACT_APP_SERVER_URL ||
  (env.NODE_ENV === "production" ? SAME_ORIGIN_ENDPOINT : endpoints.local);
```

`src/settings/server/server.ts`: import
`{ defaultServerEndpoint, SAME_ORIGIN_ENDPOINT } from "./default-endpoint"`;
the `values` array gains
`{ name: "This site (proxy)", value: SAME_ORIGIN_ENDPOINT },` after the
Foundation entry; the `default:` expression and its comment become
```ts
    default: defaultServerEndpoint(process.env, { local: LOCAL_ENDPOINT }),
```
(CRA inlines `process.env.NODE_ENV` and `process.env.REACT_APP_*` when
they are accessed as properties of `process.env`; passing `process.env`
as an object works because CRA replaces the whole `process.env`
expression with an object of the `REACT_APP_*` values plus `NODE_ENV` -
verify in the built bundle in Step 6, and if it does not, pass
`{ REACT_APP_SERVER_URL: process.env.REACT_APP_SERVER_URL, NODE_ENV: process.env.NODE_ENV }`
explicitly.)

`src/views/flow/stages/Build.tsx:195`:
```ts
  const host = new URL(PgSettings.server.endpoint, window.location.origin).host;
```

- [ ] **Step 4: Run - green**

```sh
CI=true npx craco test --watchAll=false src/settings src/features/build-proxy && npx tsc --noEmit
```

- [ ] **Step 5: Check the picker still validates typed URLs and accepts the named entry**

`custom.parse` still rejects a typed relative path (it demands an
absolute URL); the named "This site (proxy)" entry bypasses `parse`
because named values are stored as-is. Confirm by reading
`src/settings/create.tsx` and the URL setting component; if named
values *are* parsed, relax `parse` to accept a leading-slash path:
`if (PgCommon.isUrl(v) || v.startsWith("/")) return v;`.

- [ ] **Step 6: Production-bundle check**

```sh
CI=true yarn build-fast >/dev/null && grep -o '"/api/build"' build/static/js/*.js | head -1
```
Expected: one match (the production default is inlined). Also
`grep -c 'appspot' build/static/js/*.js` still finds the Foundation
entry for the picker.

- [ ] **Step 7: Commit**

```sh
npx prettier --write src/settings/server src/views/flow/stages/Build.tsx
git add src/settings/server src/views/flow/stages/Build.tsx
git commit -m "Default production builds to the same-origin /api/build proxy

The Foundation's build server allowlists origins, so a production
deployment of this fork is refused at the preflight (D28). A fresh
profile in production now talks to /api/build; development keeps the
local server and the picker keeps every other option, plus a named
entry for the proxy. Build.tsx resolves a relative endpoint against
the page's origin when it names the server."
```

---

### Task 5: Hand verification, evidence, PR

- [ ] **Step 1: The round trip through `yarn dev`**

With the dev server up (Task 3 step 4): open `http://localhost:3000`,
Settings (gear) -> Build server URL -> **This site (proxy)**. Open Hello
Anchor (Learn -> Hello Anchor -> Start), press **Build**. Expected: the
terminal shows the build output (~3.5 s on the network tab, request
`POST /api/build/build` -> 200). Introduce a type error in `lib.rs`,
Build again: the error block in the terminal and the assistant's error
card show the compiler's stderr - the pass-through in the real UI.
Then **Deploy** (needs a funded devnet wallet; if the airdrop is not
available, the network tab still shows `GET /api/build/deploy/<uuid>`
-> 200 with `application/octet-stream` before the transaction step).

- [ ] **Step 2: Evidence, per the CLAUDE.md rule**

The surface is not UI, but the evidence must show the thing working:
(a) a screenshot of the terminal after a successful build with the
picker on "This site (proxy)" and the Build stage's meta line showing
`localhost:3000` as the server host (before: the appspot host);
(b) a screenshot of DevTools -> Network filtered to `api/build` with the
`build` POST (status, time) and the `deploy` GET; (c) the curl
transcript from Task 3 step 4 with the error stderr passing through.
Save to `docs/internal/assets/2026-09-03-pr22/` on `context-archive`
(before/after where it applies), commit, embed via
`raw.githubusercontent.com`.

Screenshots without the Chrome extension: `client-v2` has playwright;
a script with `chromium.launch()` + `page.goto("http://localhost:3000")`
can drive the picker and Build (see the OAuth e2e in
`client-v2/e2e/` for selectors), or take the shots by hand.

- [ ] **Step 3: Full checks, push, PR**

```sh
CI=true yarn test-unit 2>&1 | tail -5     # expect 242 + new tests, all green
yarn check-format && npx prettier --check api/ ../vercel.json
git push -u origin feat/api-build-proxy
gh pr create --base master-2.0 --title "Proxy builds through a same-origin /api/build (D28)" --body-file <body>
```
PR body sections: what/why (D28, the measured allowlist incl.
`/deploy` and `/unstable`), how (the four commits), links (D28, brief,
this plan, friction log), before/after evidence per Step 2 with the
explicit note that the visual surface is the picker entry and the meta
line, how to test by hand (the Task 3 curl + the Step 1 clicks). The
`client-v2` workflow runs only once #21 merges; until then paste the
local check output and note it.

- [ ] **Step 4: Round-close on `context-archive`**

Friction log "Half-project 2" entries (at minimum: the appspot-vs-
api.solpg.io upstream; the allowlist covering `/deploy` and
`/unstable`; nested routing under the D20 middleware; `Build.tsx`'s
`new URL`; whatever the hand test surfaces). D28 status line: "**Status
2026-09-0x:** implemented as PR #22; upstream default = the appspot
deployment; local dev unchanged; H1 remainder recorded." Roadmap
status board: week-1 item -> review, PR #22. Board artifact regenerated.
Notify the owner.
