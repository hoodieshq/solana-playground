// `api/` is plain ESM outside the TS build (see api/health.mjs); jest resolves
// it by relative path, so the handler is testable despite living outside src/
import type { IncomingMessage, ServerResponse } from "node:http";

import handler from "../../../api/agent.mjs";

/**
 * Regressions for the default-backend rail, pinned against the real handler.
 *
 * M3 from the #13 review: a JSON body of `null` reached `body.messages`
 * outside the try that wraps parsing and surfaced as a 500. Every shape a
 * client can send that is not an object has to come back as a 400 that
 * says so.
 */

interface FakeRes {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  setHeader: (k: string, v: string) => void;
  end: (b?: string) => void;
}

const makeRes = (): FakeRes => ({
  statusCode: 0,
  body: "",
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  end(b = "") {
    this.body = b;
  },
});

/**
 * A POST whose body arrives either pre-parsed (`req.body`, as Vercel's
 * runtime does) or as the raw stream (as the dev middleware and Node do).
 */
const post = async (raw: string, preparsed = false) => {
  const res = makeRes();
  const chunks = [Buffer.from(raw)];
  const req = {
    method: "POST",
    headers: { host: "app.test", "content-type": "application/json" },
    body: preparsed ? JSON.parse(raw) : undefined,
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
    on: () => {},
  };
  await handler(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse
  );
  return res;
};

const json = (res: FakeRes) => JSON.parse(res.body) as { error?: string };

describe("POST /api/agent body validation", () => {
  const env = { ...process.env };

  beforeEach(() => {
    // A configured rail, so requests get past the 503 and into parsing
    process.env.AGENT_BASE_URL = "https://llm.test/v1";
    process.env.AGENT_MODEL = "test-model";
    process.env.AGENT_API_KEY = "k";
    delete process.env.AGENT_ENABLED;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  const notObjects: Array<[label: string, raw: string]> = [
    ["null", "null"],
    ["a number", "42"],
    ["a string", '"hello"'],
    ["an array", "[]"],
  ];
  for (const [label, raw] of notObjects) {
    it(`answers 400, not 500, to a JSON body that is ${label}`, async () => {
      const res = await post(raw);
      expect(res.statusCode).toBe(400);
      expect(json(res).error).toMatch(/JSON object/);
    });
  }

  it("answers 400 to a pre-parsed null body too", async () => {
    // Vercel hands `req.body` over already parsed; `null` is falsy, so the
    // handler falls through to the (empty) stream -- still not an object
    const res = await post("null", true);
    expect(res.statusCode).toBe(400);
  });

  it("still names the missing messages on an empty object", async () => {
    const res = await post("{}");
    expect(res.statusCode).toBe(400);
    expect(json(res).error).toMatch(/messages/);
  });

  it("still answers 400 to malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.statusCode).toBe(400);
    expect(json(res).error).toMatch(/Malformed/);
  });
});
