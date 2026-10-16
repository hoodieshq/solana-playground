// SPIKE (HOO-1753): throwaway probe, never merged.
import { createAiSdkProvider } from "./ai-sdk";
import { PgAssistant, type ChatItem } from "../store";

/** Resolves the pending approval from the test, the way a click would */
let approve: (() => void) | null = null;
const runs: unknown[] = [];

vi.mock("./prompt", () => ({
  systemPrompt: () => "system",
  describeProject: () => "project",
}));

vi.mock("./tools", () => ({
  createTools: () => [
    {
      name: "write_file",
      description: "Write a file",
      schema: {
        type: "object",
        properties: { path: { type: "string" } },
        additionalProperties: false,
      },
      // The gate lives inside `run`, as in `tools.ts`: it does not return
      // until the user answers
      run: async (input: unknown) => {
        runs.push(input);
        await new Promise<void>((resolve) => (approve = resolve));
        return "Wrote src/lib.rs.";
      },
    },
  ],
}));

const sse = (...frames: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const f of frames) controller.enqueue(new TextEncoder().encode(f));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } }
  );

const data = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const DONE = "data: [DONE]\n\n";
const text = (content: string) =>
  data({ id: "c", choices: [{ index: 0, delta: { content } }] });
const finish = (reason: string) =>
  data({ id: "c", choices: [{ index: 0, delta: {}, finish_reason: reason }] });
const toolCall = (extra?: unknown, index: number | undefined = 0) =>
  data({
    id: "c",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              ...(index === undefined ? {} : { index }),
              id: "call_1",
              type: "function",
              function: { name: "write_file", arguments: '{"path":"a.rs"}' },
              ...(extra ? { extra_content: extra } : {}),
            },
          ],
        },
      },
    ],
  });

const bodies: any[] = [];
const respondWith = (...responses: Array<() => Response>) => {
  const queue = [...responses];
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    const next = queue.shift();
    if (!next) throw new Error("unexpected request");
    return next();
  });
};

const items = <K extends ChatItem["kind"]>(kind: K) =>
  PgAssistant.items.filter(
    (i): i is Extract<ChatItem, { kind: K }> => i.kind === kind
  );

const provider = () => createAiSdkProvider({ id: "default", url: "/api/agent" });

beforeEach(() => {
  PgAssistant.clear();
  bodies.length = 0;
  runs.length = 0;
  approve = null;
  vi.restoreAllMocks();
});

describe("ai SDK probe: the turn loop on streamText", () => {
  it("streams text into one assistant bubble", async () => {
    respondWith(() => sse(text("Hel"), text("lo"), finish("stop"), DONE));

    await provider().send("hi");

    expect(items("assistant").map((i) => i.text)).toEqual(["Hello"]);
    expect(bodies[0].messages.at(-1)).toEqual({ role: "user", content: "hi" });
    expect(bodies[0].tools[0].function.name).toBe("write_file");
  });

  it("holds the loop on the approval inside run, then feeds the result back", async () => {
    respondWith(
      () => sse(toolCall(), finish("tool_calls"), DONE),
      () => sse(text("Done."), finish("stop"), DONE)
    );

    const turn = provider().send("make the change");
    await vi.waitFor(() => expect(approve).not.toBeNull());
    // Waiting on the user: no second request yet
    expect(bodies).toHaveLength(1);
    approve!();
    await turn;

    expect(runs).toEqual([{ path: "a.rs" }]);
    expect(bodies).toHaveLength(2);
    expect(bodies[1].messages.at(-1)).toMatchObject({
      role: "tool",
      tool_call_id: "call_1",
      content: "Wrote src/lib.rs.",
    });
  });

  it("Stop while an approval waits ends the turn with no further request", async () => {
    respondWith(() => sse(toolCall(), finish("tool_calls"), DONE));
    const controller = new AbortController();

    const turn = provider().send("make the change", controller.signal);
    await vi.waitFor(() => expect(approve).not.toBeNull());
    controller.abort(new Error("stopped"));
    approve!();

    await expect(turn).rejects.toThrow();
    expect(bodies).toHaveLength(1);
  });

  it("surfaces an error the upstream sends mid-stream", async () => {
    respondWith(() =>
      sse(text("par"), `\n\ndata: ${JSON.stringify({ error: { message: "upstream exploded" } })}\n\n`)
    );

    await expect(provider().send("hi")).rejects.toThrow(/upstream exploded/);
  });

  it("does not retry a 429 behind our back (the cost gate's answer)", async () => {
    const fetch = respondWith(
      () => new Response(JSON.stringify({ error: "cap" }), { status: 429 }),
      () => new Response(JSON.stringify({ error: "cap" }), { status: 429 }),
      () => new Response(JSON.stringify({ error: "cap" }), { status: 429 })
    );

    await expect(provider().send("hi")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("echoes Gemini's extra_content on the tool call it sends back", async () => {
    const signature = { google: { thought_signature: "sig" } };
    respondWith(
      () => sse(toolCall(signature), finish("tool_calls"), DONE),
      () => sse(text("ok"), finish("stop"), DONE)
    );

    const turn = provider().send("go");
    await vi.waitFor(() => expect(approve).not.toBeNull());
    approve!();
    await turn;

    const assistant = bodies[1].messages.find(
      (m: any) => m.role === "assistant"
    );
    expect(assistant.tool_calls[0].extra_content).toEqual(signature);
  });

  it("takes Gemini's indexless tool-call deltas", async () => {
    respondWith(
      () => sse(toolCall(undefined, undefined), finish("tool_calls"), DONE),
      () => sse(text("ok"), finish("stop"), DONE)
    );

    const turn = provider().send("go");
    await vi.waitFor(() => expect(approve).not.toBeNull());
    approve!();
    await turn;

    expect(runs).toEqual([{ path: "a.rs" }]);
  });
});

describe("ai SDK probe: observations", () => {
  it("with the SDK's default retries, a 429 is sent three times", async () => {
    const fetch = respondWith(
      ...[1, 2, 3].map(
        () => () =>
          new Response(JSON.stringify({ error: "cap" }), {
            status: 429,
            headers: { "retry-after-ms": "1" },
          })
      )
    );
    await expect(
      createAiSdkProvider({ id: "default", url: "/api/agent", maxRetries: 2 }).send("hi")
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("a mid-stream drop after text is not retried", async () => {
    const fetch = respondWith(() => {
      let n = 0;
      return new Response(
        new ReadableStream({
          pull(c) {
            if (n++ === 0) c.enqueue(new TextEncoder().encode(text("par")));
            else c.error(new TypeError("network lost"));
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } }
      );
    });
    await expect(
      createAiSdkProvider({ id: "default", url: "/api/agent", maxRetries: 2 }).send("hi")
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
