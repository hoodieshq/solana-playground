/** @jest-environment node */
// `api/` is plain ESM outside the TS build (see api/health.mjs); jest
// resolves it by relative path, as the other api specs do.
import handler from "../../../api/agent.mjs";
import { jsonBody, makeReq, makeRes, postJson } from "../../test/api-handler";

/**
 * The default-backend rail, pinned against the real handler.
 *
 * A body that is not a JSON object is refused with a 400 on both
 * delivery paths -- a raw stream and a body the platform pre-parsed.
 * The guard is `readJson` (`src/features/api/server/read-json.mjs`),
 * shared with `/api/mcp`; this spec proves the rail goes through it.
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
    it(`refuses a streamed body that is ${label}`, async () => {
      const res = await postJson(handler, raw);
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  // A pre-parsed string is the one shape that stays ambiguous: the
  // platform hands raw text over that way too, so it is parsed rather
  // than refused, and lands on the malformed-JSON 400 below.
  for (const [label, raw] of notObjects.filter(([l]) => l !== "a string")) {
    it(`refuses a pre-parsed body that is ${label}`, async () => {
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

  it("passes an upstream error's own status through", async () => {
    const res = makeRes();
    await call(res, {
      ok: false,
      status: 429,
      text: async () => "slow down",
    } as never);

    expect(res.statusCode).toBe(429);
    expect(jsonBody(res).error).toMatch(/^Upstream 429: slow down/);
  });

  it("answers 502 to a success that has nothing to stream", async () => {
    const res = makeRes();
    await call(res, { ok: true, status: 204, body: null } as never);

    // Relaying the 204 would send a body on a status that cannot have one
    expect(res.statusCode).toBe(502);
    expect(jsonBody(res).error).toMatch(/204.*no body/);
  });

  it("streams the upstream's events through byte for byte", async () => {
    const res = makeRes();
    await call(res, upstream(["data: a\n\n", "data: [DONE]\n\n"]));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/event-stream");
    expect(res.body()).toBe("data: a\n\ndata: [DONE]\n\n");
    expect(res.ended).toBe(true);
  });

  it("starts the error on a fresh event when the upstream drops mid-frame", async () => {
    const res = makeRes();
    await call(res, upstream(['data: {"choices":[{"del'], "fail"));

    // Glued onto the unfinished frame, the error would be one malformed
    // line the panel skips, and the cut answer would pass for a whole one
    const events = res
      .body()
      .split("\n\n")
      .filter((e) => e.startsWith("data: "));
    const last = JSON.parse(events[events.length - 1].slice(6));
    expect(last.error.message).toMatch(/connection reset/);
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

  it("stops waiting for drain once the client is gone", async () => {
    // A full write buffer, so the loop parks on `drain` -- and a client
    // that leaves instead. Without `close` ending that wait the
    // invocation would park here until the platform's duration cap.
    let parked!: () => void;
    const firstWrite = new Promise<void>((resolve) => (parked = resolve));
    const res = makeRes({
      write: (c) => {
        res.chunks.push(Buffer.from(c as Uint8Array));
        parked();
        return false;
      },
    });
    const pending = call(res, upstream(["data: a\n\n", "data: b\n\n"]));

    // Only now is the handler past `readJson` and inside the drain wait
    await firstWrite;
    res.destroyed = true;
    res.emit("close");
    await pending;

    const init = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect((init.signal as AbortSignal).aborted).toBe(true);
    expect(res.body()).toBe("data: a\n\n");
    expect(res.ended).toBe(true);
  });
});
