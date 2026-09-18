/** @jest-environment node */
// `api/` is plain ESM outside the TS build (see api/health.mjs); jest
// resolves it by relative path, as the other api specs do.
import handler from "../../../api/agent.mjs";
import { jsonBody, makeReq, makeRes, postJson } from "../../test/api-handler";

/**
 * Regressions for the default-backend rail, pinned against the real
 * handler.
 *
 * M3 from the #13 review: a JSON body of `null` reached `body.messages`
 * outside the try that wraps parsing and surfaced as a 500. The guard
 * now lives in `readJson` (`src/features/api/server/read-json.mjs`),
 * which is where both rails read a body, so this spec's job is to prove
 * this rail actually answers 400 through it -- on both delivery paths,
 * since the platform the report came from pre-parses the body.
 */
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
    it(`answers 400, not 500, to a streamed body that is ${label}`, async () => {
      const res = await postJson(handler, raw);
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  // A pre-parsed string is the one shape that stays ambiguous: the
  // platform hands raw text over that way too, so it is parsed rather
  // than refused, and lands on the malformed-JSON 400 below.
  for (const [label, raw] of notObjects.filter(([l]) => l !== "a string")) {
    it(`answers 400, not 500, to a pre-parsed body that is ${label}`, async () => {
      // `preparsed` also drains the stream, the way Vercel does, so a
      // handler that fell through to it would answer about `messages`
      const res = await postJson(handler, raw, { preparsed: true });
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  it("answers 400 to a pre-parsed body that is not JSON at all", async () => {
    const res = await postJson(handler, '"hello"', { preparsed: true });
    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).error).toMatch(/Malformed/);
  });

  it("still names the missing messages on an empty object", async () => {
    const res = await postJson(handler, "{}");
    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).error).toMatch(/messages/);
  });

  it("still answers 400 to malformed JSON", async () => {
    const res = await postJson(handler, "{not json");
    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).error).toMatch(/Malformed/);
  });

  it("answers 503 when no backend is configured, before reading the body", async () => {
    delete process.env.AGENT_BASE_URL;
    const res = await postJson(handler, "null");
    expect(res.statusCode).toBe(503);
  });
});

/**
 * The streaming half. The upstream is faked, so what these cover is the
 * proxy's own behaviour once the 200 and the SSE headers are committed:
 * everything it has to say from then on has to go inside the stream.
 */
describe("POST /api/agent streaming", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.AGENT_BASE_URL = "https://llm.test/v1";
    process.env.AGENT_MODEL = "test-model";
    delete process.env.AGENT_ENABLED;
  });

  afterEach(() => {
    process.env = { ...env };
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  /** An upstream whose stream yields `chunks`, then does what `then` says */
  const upstream = (chunks: string[], then: "end" | "fail" = "end") => {
    let i = 0;
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (i < chunks.length) {
              return { done: false, value: Buffer.from(chunks[i++]) };
            }
            if (then === "fail") throw new Error("connection reset");
            return { done: true, value: undefined };
          },
          cancel: async () => {},
        }),
      },
    };
  };

  const call = async (
    res: ReturnType<typeof makeRes>,
    response: ReturnType<typeof upstream>
  ) => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => response);
    await handler(
      makeReq('{"messages":[{"role":"user","content":"hi"}]}'),
      res as never
    );
  };

  it("streams the upstream's events through byte for byte", async () => {
    const res = makeRes();
    await call(res, upstream(["data: a\n\n", "data: [DONE]\n\n"]));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/event-stream");
    expect(res.body()).toBe("data: a\n\ndata: [DONE]\n\n");
    expect(res.ended).toBe(true);
  });

  it("says so inside the stream when the upstream drops mid-answer", async () => {
    const res = makeRes();
    await call(res, upstream(["data: a\n\n"], "fail"));

    // Ending quietly would let half an answer pass for a whole one
    expect(res.body()).toContain("data: a\n\n");
    expect(res.body()).toContain("Upstream stream failed");
    expect(res.body()).toContain("connection reset");
    expect(res.ended).toBe(true);
  });

  it("stops writing once the client is gone", async () => {
    // A full write buffer, so the loop waits for `drain` -- and a client
    // that leaves instead. Without `close` ending that wait the
    // invocation would park here until the platform's duration cap.
    const res = makeRes({ write: () => false });
    const pending = call(res, upstream(["data: a\n\n", "data: b\n\n"]));

    await Promise.resolve();
    res.destroyed = true;
    res.emit("close");

    await pending;
    expect(res.ended).toBe(true);
  });
});
