import type { ModelMessage } from "ai";

import {
  isToolCallRecord,
  type ChatItem,
} from "../../../views/sidebar/assistant/store";

/** One message of a rehydrated conversation, as the SDK sends it to any backend */
export type ReplayMessage = ModelMessage;

/**
 * Rebuild the model's history from a stored thread: what was said, and every
 * tool call that finished with what it returned (HOO-2425), each in its place.
 *
 * A call is replayed from its stored record (`ToolCallRecord`), never from
 * the marker a tool draws, and only with its result: a model shown a call
 * with no result will often repeat it. Each pair gets a fresh id, `call_<n>`,
 * because the SDK's ids from one backend are not valid on another, and a
 * thread is replayed to whichever backend is connected now. Approvals, errors
 * and notices stay out: the result of the tool behind an approval card is in
 * its record.
 *
 * Provider-only parts (reasoning signatures, Gemini's thought signatures)
 * were never stored, so a restored thread is honest history rather than a
 * resumed session. Results are cut (`RESULT_CAP` in the store); the live
 * project goes with every turn anyway (`describeProject`), so a file the model
 * read is in front of it again.
 */
export const toReplayMessages = (
  items: readonly ChatItem[]
): ReplayMessage[] => {
  let calls = 0;
  return items.flatMap((item): ReplayMessage[] => {
    if (isToolCallRecord(item)) {
      const toolCallId = `call_${++calls}`;
      const { name: toolName, input, output, failed } = item.call;
      return [
        {
          role: "assistant",
          content: [{ type: "tool-call", toolCallId, toolName, input }],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: failed
                ? { type: "error-text", value: output }
                : { type: "text", value: output },
            },
          ],
        },
      ];
    }
    if (
      (item.kind === "user" || item.kind === "assistant") &&
      item.text.trim()
    ) {
      return [{ role: item.kind, content: item.text }];
    }
    return [];
  });
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/persistence/model/replay", () => {
    const base = { id: "a", createdAt: "2026-01-01T00:00:00.000Z" };

    describe("toReplayMessages", () => {
      it("keeps user and assistant text in order", () => {
        const items: ChatItem[] = [
          { ...base, kind: "user", text: "hi" },
          { ...base, kind: "assistant", text: "hello" },
        ];

        expect(toReplayMessages(items)).toEqual([
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ]);
      });

      it("drops tool, approval, error and notice items", () => {
        const items: ChatItem[] = [
          { ...base, kind: "tool", label: "read src/lib.rs" },
          {
            ...base,
            kind: "approval",
            status: "allowed",
            request: { type: "command", name: "build", effect: "x" },
          },
          { ...base, kind: "error", text: "boom" },
          { ...base, kind: "notice", text: "stopped" },
        ];

        expect(toReplayMessages(items)).toEqual([]);
      });

      it("drops empty text, which a stopped turn leaves behind", () => {
        const items: ChatItem[] = [
          { ...base, kind: "assistant", text: "  " },
          { ...base, kind: "user", text: "" },
        ];

        expect(toReplayMessages(items)).toEqual([]);
      });

      it("keeps the conversation readable around dropped items", () => {
        const items: ChatItem[] = [
          { ...base, kind: "user", text: "add a log" },
          { ...base, kind: "tool", label: "write src/lib.rs" },
          {
            ...base,
            kind: "approval",
            status: "allowed",
            request: {
              type: "patch",
              path: "src/lib.rs",
              before: "a",
              after: "b",
            },
          },
          { ...base, kind: "assistant", text: "Added it." },
        ];

        expect(toReplayMessages(items)).toEqual([
          { role: "user", content: "add a log" },
          { role: "assistant", content: "Added it." },
        ]);
      });

      const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
      const said = (
        n: number,
        kind: "user" | "assistant",
        text: string
      ): ChatItem => ({
        id: id(n),
        createdAt: base.createdAt,
        kind,
        text,
      });
      const record = (
        n: number,
        name: string,
        output: string,
        failed?: true
      ): ChatItem => ({
        id: id(n),
        createdAt: base.createdAt,
        kind: "tool",
        label: name,
        call: failed
          ? { name, input: { path: "src/lib.rs" }, output, failed }
          : { name, input: { path: "src/lib.rs" }, output },
      });

      it("replays a stored call as a tool call and its result, in place", () => {
        const items: ChatItem[] = [
          said(1, "user", "read lib.rs"),
          {
            id: id(2),
            createdAt: base.createdAt,
            kind: "tool",
            label: "read src/lib.rs",
          },
          record(3, "read_file", "fn main() {}"),
          said(4, "assistant", "It has one function."),
        ];

        expect(toReplayMessages(items)).toEqual([
          { role: "user", content: "read lib.rs" },
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "call_1",
                toolName: "read_file",
                input: { path: "src/lib.rs" },
              },
            ],
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "call_1",
                toolName: "read_file",
                output: { type: "text", value: "fn main() {}" },
              },
            ],
          },
          { role: "assistant", content: "It has one function." },
        ]);
      });

      it("replays a failed call as an error result", () => {
        const [, result] = toReplayMessages([
          record(1, "read_file", "Not found", true),
        ]);

        expect(result).toEqual({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_1",
              toolName: "read_file",
              output: { type: "error-text", value: "Not found" },
            },
          ],
        });
      });

      it("numbers two calls in order, each result naming its own call", () => {
        const ids = toReplayMessages([
          record(1, "list_files", "a"),
          record(2, "read_file", "b"),
        ]).map(
          (message) =>
            (message.content as { toolCallId: string }[])[0].toolCallId
        );

        expect(ids).toEqual(["call_1", "call_1", "call_2", "call_2"]);
      });

      it("is empty for an empty thread", () => {
        expect(toReplayMessages([])).toEqual([]);
      });
    });
  });
}
