import {
  allowRoute,
  isCrossSite,
  resolveUpstreamPath,
  upstreamBase,
} from "./route.mjs";

const FOUNDATION =
  "https://playground-server-dot-analytics-324114.de.r.appspot.com";

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
    expect(allowRoute("GET", "/unstable/packages/@coral-xyz/anchor")).toEqual({
      ok: true,
    });
    expect(allowRoute("GET", "/unstable/types/mocha")).toEqual({ ok: true });
  });

  it("answers 405 with an Allow header for a known path and the wrong method", () => {
    expect(allowRoute("GET", "/build")).toEqual({
      ok: false,
      status: 405,
      allow: "POST",
    });
    expect(allowRoute("POST", "/deploy/x")).toEqual({
      ok: false,
      status: 405,
      allow: "GET",
    });
  });

  it("answers 404 for anything else", () => {
    expect(allowRoute("POST", "/new")).toEqual({ ok: false, status: 404 });
    expect(allowRoute("GET", "/share/abc")).toEqual({ ok: false, status: 404 });
    expect(allowRoute("GET", "/unstable/bundle/x")).toEqual({
      ok: false,
      status: 404,
    });
  });
});

describe("isCrossSite", () => {
  it("passes same-origin fetches, navigations and non-browser clients", () => {
    expect(isCrossSite({ "sec-fetch-site": "same-origin" })).toBe(false);
    expect(isCrossSite({ "sec-fetch-site": "none" })).toBe(false);
    expect(isCrossSite({})).toBe(false);
    expect(
      isCrossSite({ host: "pg.example", origin: "https://pg.example" })
    ).toBe(false);
  });

  it("refuses another site's browser", () => {
    expect(isCrossSite({ "sec-fetch-site": "cross-site" })).toBe(true);
    expect(
      isCrossSite({ host: "pg.example", origin: "https://evil.example" })
    ).toBe(true);
  });

  it("trusts x-forwarded-host over host behind a proxy", () => {
    expect(
      isCrossSite({
        host: "internal:3000",
        "x-forwarded-host": "pg.example",
        origin: "https://pg.example",
      })
    ).toBe(false);
  });
});

describe("upstreamBase", () => {
  it("defaults to the Foundation deployment and strips a trailing slash", () => {
    expect(upstreamBase({})).toBe(FOUNDATION);
    expect(upstreamBase({ BUILD_SERVER_URL: "http://localhost:8080/" })).toBe(
      "http://localhost:8080"
    );
    expect(upstreamBase({ BUILD_SERVER_URL: "  " })).toBe(FOUNDATION);
  });
});
