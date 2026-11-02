// A leaf at runtime: it imports the store by type only, and must stay so.
// The store imports this slice, so a value import from the store here would
// close an import cycle the dev build refuses (`CircularDependencyPlugin`).
import { redactKey } from "@/shared/lib/ai";
import type { ToolResultEvent } from "@/shared/lib/ai";
import type { ChatItem } from "../../../views/sidebar/assistant/store";

/**
 * One finished tool call as a later turn needs it (HOO-2425), written by
 * `toToolCallRecord`: the key redacted, every string of the input and the
 * result cut, an input that is not an object wrapped in one, and an input
 * still too long replaced by a note of its size. The SDK's call id is not
 * kept: a replay mints its own, since one backend's ids are not valid on
 * another.
 */
export interface ToolCallRecord {
  name: string;
  /** Always a plain object: Anthropic refuses a `tool_use` whose input is not one */
  input: Record<string, unknown>;
  /** What the model read: the tool's text, or its message when it threw */
  output: string;
  failed?: true;
}

/**
 * Caps on what one record keeps. A result is what costs: a file read whole.
 * The live project goes with every turn anyway (`describeProject`), so a cut
 * result loses little. How many records a replay sends is bounded separately
 * (`REPLAY_CALL_BUDGET` in `replay.ts`).
 */
const RESULT_CAP = 4_000;
const INPUT_STRING_CAP = 1_000;
const INPUT_CAP = 4_000;

/** Said in place of an empty result: Anthropic refuses an empty text block */
export const NO_OUTPUT = "(no output)";

/** `text` cut to `cap`, ending with how much was cut, so the model knows */
const cut = (text: string, cap: number) =>
  text.length <= cap
    ? text
    : `${text.slice(0, cap)} … [${text.length - cap} characters cut]`;

/**
 * Every string in a call's input redacted and cut, the shape kept. Values
 * JSON cannot hold become text, and a cycle is cut where it closes, so
 * storing the record never throws on what a tool was called with.
 */
const capInputValue = (
  value: unknown,
  apiKey: string | undefined,
  seen: WeakSet<object>
): unknown => {
  if (typeof value === "string") {
    return cut(redactKey(value, apiKey), INPUT_STRING_CAP);
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((v) => capInputValue(v, apiKey, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, capInputValue(v, apiKey, seen)])
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A call's input as stored. An input that is not an object (the raw text of
 * arguments the model got wrong) is wrapped as `{ value }`, so the replayed
 * call stays one Anthropic accepts.
 */
const capInput = (
  input: unknown,
  apiKey: string | undefined
): Record<string, unknown> => {
  const capped = capInputValue(input, apiKey, new WeakSet());
  let object: Record<string, unknown> = {};
  if (isPlainObject(capped)) object = capped;
  else if (capped !== undefined) object = { value: capped };
  const size = JSON.stringify(object).length;
  return size > INPUT_CAP ? { omitted: `${size} characters of input` } : object;
};

/** Whether an item is a stored call rather than a marker the thread draws */
export const isToolCallRecord = (
  item: ChatItem
): item is ChatItem & { kind: "tool"; call: ToolCallRecord } =>
  item.kind === "tool" && item.call !== undefined;

/** A tool's finished call as the thread stores it */
export const toToolCallRecord = (
  result: Pick<ToolResultEvent, "toolName" | "input" | "output" | "failed">,
  apiKey: string | undefined
): ToolCallRecord => {
  const output = cut(redactKey(result.output, apiKey), RESULT_CAP);
  const call: ToolCallRecord = {
    name: result.toolName,
    input: capInput(result.input, apiKey),
    output: output.trim() ? output : NO_OUTPUT,
  };
  if (result.failed) call.failed = true;
  return call;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/persistence/model/tool-call", () => {
    const record = (input: unknown, output = "ok") =>
      toToolCallRecord(
        { toolName: "probe", input, output, failed: false },
        undefined
      );

    it("wraps an input that is not an object, so Anthropic takes the replay", () => {
      expect(record('{"path": "src/li').input).toEqual({
        value: '{"path": "src/li',
      });
      expect(record(undefined).input).toEqual({});
    });

    it("stores an input holding a BigInt or a cycle instead of throwing", () => {
      const cyclic: Record<string, unknown> = { n: BigInt(7) };
      cyclic.self = cyclic;

      expect(record(cyclic).input).toEqual({ n: "7", self: "[circular]" });
    });

    it("says there was no output rather than storing an empty one", () => {
      expect(record({}, "").output).toBe(NO_OUTPUT);
      expect(record({}, "  ").output).toBe(NO_OUTPUT);
    });

    it("cuts nothing at exactly the cap", () => {
      expect(record({}, "x".repeat(4_000)).output).toBe("x".repeat(4_000));
      expect(record({ s: "y".repeat(1_000) }).input).toEqual({
        s: "y".repeat(1_000),
      });
    });

    it("redacts the key inside a nested input", () => {
      const key = "sk-test-nested-0123456789";
      const { input } = toToolCallRecord(
        {
          toolName: "probe",
          input: { headers: [{ auth: `Bearer ${key}` }] },
          output: "ok",
          failed: false,
        },
        key
      );

      expect(JSON.stringify(input)).not.toContain(key);
    });
  });
}
