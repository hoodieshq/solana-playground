// `api/` is plain ESM outside the TS build (see api/health.mjs); jest resolves
// it by relative path, so the handler is testable despite living outside src/
import type { IncomingMessage, ServerResponse } from "node:http";

import handler from "../../../../api/github-oauth.mjs";

/**
 * Security regressions for the OAuth flow, pinned against the real handler.
 *
 * Every case here corresponds to a finding from a review of this feature. They
 * exist so a future "simplification" that reopens one fails loudly.
 */

interface FakeRes {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[]>;
  headersSent: boolean;
  setHeader: (k: string, v: string | string[]) => void;
  end: (b?: string) => void;
}

const makeRes = (): FakeRes => ({
  statusCode: 0,
  body: "",
  headers: {},
  headersSent: false,
  setHeader(k, v) {
    this.headers[k] = v;
  },
  end(b = "") {
    this.body = b;
    this.headersSent = true;
  },
});

const call = async (url: string, headers: Record<string, string> = {}) => {
  const res = makeRes();
  // The handler only reads `url`/`headers` and writes via the four members
  // `FakeRes` implements; casting keeps the fakes minimal.
  await handler(
    {
      url,
      headers: { host: "app.test", ...headers },
    } as unknown as IncomingMessage,
    res as unknown as ServerResponse
  );
  return res;
};

const setCookies = (res: FakeRes) =>
  ([] as string[]).concat(res.headers["set-cookie"] ?? []);

const cookieValue = (res: FakeRes, name: string) =>
  setCookies(res)
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0]
    .slice(name.length + 1);

/** The payload the callback page would deliver, without executing it */
const payloadOf = (res: FakeRes) =>
  JSON.parse(
    res.body.match(/postMessage\((\{.*?\}), window\.location\.origin\)/)?.[1] ??
      res.body.match(/postMessage\((\{.*?\})\)/)?.[1] ??
      "null"
  );

/** Run the emitted inline script against fakes, so delivery is observed not inferred */
const deliver = (html: string, opts: { hasOpener: boolean }) => {
  const script = html.match(
    /<script nonce="[a-f0-9]+">([\s\S]*?)<\/script>/
  )?.[1];
  if (!script) throw new Error("no inline script in callback page");

  const toOpener: unknown[] = [];
  const toBroadcast: unknown[] = [];
  const fakeWindow = {
    opener: opts.hasOpener
      ? { postMessage: (d: unknown) => toOpener.push(d) }
      : null,
    close: () => {},
    location: { origin: "https://app.test" },
  };
  class FakeBroadcastChannel {
    constructor(public name: string) {}
    postMessage(d: unknown) {
      toBroadcast.push(d);
    }
  }
  // eslint-disable-next-line no-new-func
  new Function("window", "document", "BroadcastChannel", script)(
    fakeWindow,
    { body: {} },
    FakeBroadcastChannel
  );
  return { toOpener, toBroadcast };
};

const NONCE = "a".repeat(32);
const START = `/api/github-oauth?action=start&nonce=${NONCE}`;

describe("github-oauth handler — real request/response, no HTTP server", () => {
  const OLD_ID = process.env.GITHUB_CLIENT_ID;
  const OLD_SECRET = process.env.GITHUB_CLIENT_SECRET;

  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "id";
    process.env.GITHUB_CLIENT_SECRET = "secret";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    process.env.GITHUB_CLIENT_ID = OLD_ID;
    process.env.GITHUB_CLIENT_SECRET = OLD_SECRET;
  });

  it("should never put the token on the broadcast bus when an opener exists", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify({ access_token: "gho_secret" })),
    });
    const start = await call(START);
    const state = cookieValue(start, "pg_gh_oauth_state");
    const verifier = cookieValue(start, "pg_gh_oauth_verifier");

    const cb = await call(
      `/api/github-oauth?action=callback&state=${state}&code=c`,
      {
        cookie: `pg_gh_oauth_state=${state}; pg_gh_oauth_verifier=${verifier}; pg_gh_oauth_nonce=${NONCE}`,
      }
    );

    const withOpener = deliver(cb.body, { hasOpener: true });
    expect(withOpener.toOpener).toHaveLength(1);
    // The bus reaches every same-origin context, including the project iframe
    expect(withOpener.toBroadcast).toHaveLength(0);

    // Only when COOP severed the opener does it fall back to the bus
    const noOpener = deliver(cb.body, { hasOpener: false });
    expect(noOpener.toBroadcast).toHaveLength(1);
  });

  it("should echo the client nonce so a forged broadcast cannot match", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ access_token: "gho_x" })),
    });
    const start = await call(START);
    const state = cookieValue(start, "pg_gh_oauth_state");
    const verifier = cookieValue(start, "pg_gh_oauth_verifier");

    expect(cookieValue(start, "pg_gh_oauth_nonce")).toBe(NONCE);

    const cb = await call(
      `/api/github-oauth?action=callback&state=${state}&code=c`,
      {
        cookie: `pg_gh_oauth_state=${state}; pg_gh_oauth_verifier=${verifier}; pg_gh_oauth_nonce=${NONCE}`,
      }
    );
    expect(payloadOf(cb).nonce).toBe(NONCE);
  });

  it("should keep the nonce cookie HttpOnly, which is what stops a forgery", async () => {
    const start = await call(START);
    const nonceCookie = setCookies(start).find((c) =>
      c.startsWith("pg_gh_oauth_nonce=")
    );
    expect(nonceCookie).toContain("HttpOnly");
    expect(nonceCookie).toContain("SameSite=Lax");
  });

  it("should reject a state mismatch without exchanging the code", async () => {
    const cb = await call(
      "/api/github-oauth?action=callback&state=attacker&code=c",
      { cookie: `pg_gh_oauth_state=real; pg_gh_oauth_nonce=${NONCE}` }
    );
    expect(payloadOf(cb).error).toMatch(/state mismatch/i);
    // The causal signal: no token exchange was even attempted
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should send the PKCE verifier and redirect_uri it issued", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ access_token: "gho_x" })),
    });
    const start = await call(START, { "x-forwarded-proto": "https" });
    const state = cookieValue(start, "pg_gh_oauth_state");
    const verifier = cookieValue(start, "pg_gh_oauth_verifier");

    await call(`/api/github-oauth?action=callback&state=${state}&code=c`, {
      "x-forwarded-proto": "https",
      cookie: `pg_gh_oauth_state=${state}; pg_gh_oauth_verifier=${verifier}; pg_gh_oauth_nonce=${NONCE}`,
    });

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string
    );
    expect(body.code_verifier).toBe(verifier);
    expect(body.redirect_uri).toBe(
      "https://app.test/api/github-oauth?action=callback"
    );
  });

  it("should expire all three cookies on the callback so none can be replayed", async () => {
    const cb = await call(
      "/api/github-oauth?action=callback&error=access_denied",
      { cookie: `pg_gh_oauth_nonce=${NONCE}` }
    );
    const cookies = setCookies(cb);
    expect(cookies).toHaveLength(3);
    for (const c of cookies) expect(c).toContain("Max-Age=0");
  });

  it("should report a declined consent as cancelled, not as a missing code", async () => {
    const cb = await call(
      "/api/github-oauth?action=callback&error=access_denied",
      { cookie: `pg_gh_oauth_nonce=${NONCE}` }
    );
    expect(payloadOf(cb).error).toMatch(/cancelled/i);
  });

  it("should mark the token-bearing page no-store and un-framable", async () => {
    const cb = await call(
      "/api/github-oauth?action=callback&error=access_denied",
      { cookie: `pg_gh_oauth_nonce=${NONCE}` }
    );
    expect(cb.headers["cache-control"]).toBe("no-store");
    expect(cb.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );
  });

  it("should still reach the client when the deployment is unconfigured", async () => {
    process.env.GITHUB_CLIENT_ID = "";
    const start = await call(START);
    // Not a bare 503: the popup must post and close, or the SPA reports a
    // cancellation and the operator sees a silent failure
    expect(payloadOf(start).error).toMatch(/not configured/i);
    expect(payloadOf(start).nonce).toBe(NONCE);
  });
});
