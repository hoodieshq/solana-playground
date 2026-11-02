// A leaf: replay (features/persistence) reads it, and the store imports
// persistence, so importing the store from there would close a cycle.
import { redactKey } from "@/shared/lib/ai";
import type { ChatItem } from "../store";

/**
 * One tool call as a later turn needs it: name, input and result, cut to
 * `RESULT_CAP` and `INPUT_STRING_CAP`. The SDK's call id is not kept: a
 * replay mints its own, since one backend's ids are not valid on another.
 */
export interface ToolCallRecord {
  name: string;
  input: unknown;
  /** What the model read: the tool's text, or its message when it threw */
  output: string;
  failed?: true;
}

/**
 * Caps on what a stored call keeps. The server takes at most 2 MB a batch and
 * a thread keeps its newest 200 items, so 200 records at their caps still fit
 * beside the text. A file the model read is sent again with every turn
 * (`describeProject`), so a cut result costs little.
 */
const RESULT_CAP = 4_000;
const INPUT_STRING_CAP = 1_000;
const INPUT_CAP = 4_000;

/** `text` cut to `cap`, ending with how much was cut, so the model knows */
const cut = (text: string, cap: number) =>
  text.length <= cap
    ? text
    : `${text.slice(0, cap)} … [${text.length - cap} characters cut]`;

/** Every string in a call's input, redacted and cut; the shape is kept */
const capInputValue = (value: unknown, apiKey?: string): unknown => {
  if (typeof value === "string") {
    return cut(redactKey(value, apiKey), INPUT_STRING_CAP);
  }
  if (Array.isArray(value)) return value.map((v) => capInputValue(v, apiKey));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, capInputValue(v, apiKey)])
    );
  }
  return value;
};

/** A call's input as stored: its strings cut, or a note when still too long */
const capInput = (input: unknown, apiKey?: string): unknown => {
  const capped = capInputValue(input, apiKey);
  const size = JSON.stringify(capped)?.length ?? 0;
  return size > INPUT_CAP ? { omitted: `${size} characters of input` } : capped;
};

/** Whether an item is a stored call rather than a marker the thread draws */
export const isToolCallRecord = (
  item: ChatItem
): item is ChatItem & { kind: "tool"; call: ToolCallRecord } =>
  item.kind === "tool" && item.call !== undefined;

/** A tool's finished call as the thread stores it: redacted, then cut */
export const toToolCallRecord = (
  result: { toolName: string; input: unknown; output: string; failed: boolean },
  apiKey?: string
): ToolCallRecord => {
  const call: ToolCallRecord = {
    name: result.toolName,
    input: capInput(result.input, apiKey),
    output: cut(redactKey(result.output, apiKey), RESULT_CAP),
  };
  if (result.failed) call.failed = true;
  return call;
};
