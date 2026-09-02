/** @jest-environment node */
// `api/` is plain ESM outside the TS build (see api/health.mjs); jest resolves
// it by relative path, as github-auth.integration.spec.ts does.
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";

import handler from "../../../api/build.mjs";

const FOUNDATION =
  "https://playground-server-dot-analytics-324114.de.r.appspot.com";

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
  setHeader(k, v) {
    this.headers[k.toLowerCase()] = v;
  },
  write(c) {
    this.chunks.push(Buffer.from(c));
    return true;
  },
  end(c) {
    if (c) this.chunks.push(Buffer.from(c));
    this.ended = true;
  },
  once() {},
  body() {
    return Buffer.concat(this.chunks).toString("utf8");
  },
});

type FakeReq = Readable & {
  method: string;
  url: string;
  headers: Record<string, string>;
};

const makeReq = (opts: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): FakeReq => {
  const req = Readable.from(
    opts.body ? [Buffer.from(opts.body)] : []
  ) as FakeReq;
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

// Jest 27's node environment has no `Response`; this double carries the three
// things the handler reads from one -- status, headers.get, a web stream body
const upstreamResponse = (
  status: number,
  body: string | Uint8Array,
  type = "application/json"
) => ({
  status,
  headers: new Map([["content-type", type]]),
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(Buffer.from(body)));
      controller.close();
    },
  }),
});

/** The handler is typed on Node's req/res; the fakes carry what it reads */
const call = (req: FakeReq, res: FakeRes) =>
  handler(req as unknown as IncomingMessage, res as unknown as ServerResponse);

const JSON_POST = { "content-type": "application/json" };

describe("api/build", () => {
  it("forwards POST /build with the JSON body and returns the response byte for byte", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse(200, '{"stderr":"ok","uuid":"u1","idl":null}')
    );
    const res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: { ...JSON_POST, "sec-fetch-site": "same-origin" },
        body: '{"files":[]}',
      }),
      res
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${FOUNDATION}/build`);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(Buffer.from(init.body).toString()).toBe('{"files":[]}');
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json");
    expect(res.body()).toBe('{"stderr":"ok","uuid":"u1","idl":null}');
  });

  it("passes a build failure through untouched: status and stderr body", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse(
        400,
        "error[E0425]: cannot find value `x`",
        "text/plain; charset=utf-8"
      )
    );
    const res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: JSON_POST,
        body: "{}",
      }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.body()).toBe("error[E0425]: cannot find value `x`");
  });

  it("forwards GET /deploy/:uuid as binary and honours BUILD_SERVER_URL", async () => {
    process.env.BUILD_SERVER_URL = "http://localhost:8080/";
    const bytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    fetchMock.mockResolvedValue(
      upstreamResponse(200, bytes, "application/octet-stream")
    );
    const res = makeRes();
    await call(makeReq({ url: "/api/build?path=deploy/u1" }), res);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8080/deploy/u1");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(Buffer.concat(res.chunks)).toEqual(Buffer.from(bytes));
  });

  it("does not forward cookies, authorization or any other request header", async () => {
    fetchMock.mockResolvedValue(upstreamResponse(200, "{}"));
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: {
          ...JSON_POST,
          cookie: "a=b",
          authorization: "Bearer x",
          "x-forwarded-for": "1.2.3.4",
        },
        body: "{}",
      }),
      makeRes()
    );

    expect(Object.keys(fetchMock.mock.calls[0][1].headers)).toEqual([
      "content-type",
    ]);
  });

  it("404s an unknown path and 405s a wrong method, without calling upstream", async () => {
    let res = makeRes();
    await call(makeReq({ method: "POST", url: "/new", body: "{}" }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body()).error).toMatch(/No build route/);

    res = makeRes();
    await call(makeReq({ method: "GET", url: "/build" }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("POST");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses another site's browser with 403", async () => {
    const res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: { ...JSON_POST, origin: "https://evil.example" },
        body: "{}",
      }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps the request body at 1 MiB with 413", async () => {
    const res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: JSON_POST,
        body: "x".repeat(1024 * 1024 + 1),
      }),
      res
    );

    expect(res.statusCode).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 when the upstream is unreachable and 504 on timeout", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED" },
      })
    );
    let res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: JSON_POST,
        body: "{}",
      }),
      res
    );
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body()).error).toMatch(/Build server unreachable/);

    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted due to timeout"), {
        name: "TimeoutError",
      })
    );
    res = makeRes();
    await call(
      makeReq({
        method: "POST",
        url: "/build",
        headers: JSON_POST,
        body: "{}",
      }),
      res
    );
    expect(res.statusCode).toBe(504);
  });
});
