# Tool calls kept in the agent's history: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Store every finished tool call with its thread and replay it to a provider rebuilt for that thread.

**Architecture:** `runTurn` reports tool results. The provider writes each one
as a `tool` item carrying a `call` record (capped, redacted). `toReplayMessages`
turns records into tool-call and tool-result pairs. The thread draws nothing for
a record.

**Tech Stack:** TypeScript, ai SDK 7 (`streamText` parts `tool-result`, `tool-error`), vitest.

**Spec:** `openspec/changes/assistant-tool-history/specs/assistant-conversation-history/spec.md`, `design.md` beside it.

**Ticket:** HOO-2425. **Success metric** (from the ticket): a reopened thread's
next request carries every earlier tool call that finished, with its result
(capped in size), right after the turn that made it: 0 stored calls missing from
the replayed history. It is checked by a test that stores a thread with calls,
reads it back the way a reload and a pull from another device do, and inspects
the messages the next request sends.

## Global Constraints

- Result cap 4,000 characters; input string cap 1,000; serialised input cap 4,000. The marker is ` … [<n> characters cut]`.
- No new item kind, no server, API or migration change.
- Replayed ids are `call_<n>`, from 1, numbered through one replay.
- In-source tests for single-module units (`AGENTS.md`); no spreads in test fixtures.
- Comments say why; no nested ternaries; no empty `catch`.

## Review Focus

- A tool returning a non-string (MCP JSON) → stored as `JSON.stringify` text. Test in Task 1.
- A preliminary (streaming) tool result → not reported; only the final one is. Test in Task 1.
- A stored `call` with a wrong shape (hand-edited storage) → the decoder drops the record and keeps the item as a plain marker. Test in Task 2.
- A turn cut by a backend switch (`_dropsCut`) → no record is written, as no marker is. Test in Task 2.
- A record whose result contains the key → redacted. Test in Task 2.

---

### Task 1: `runTurn` reports tool results

**Files:** Modify `src/shared/lib/ai/run-turn.ts`. Test: `src/shared/lib/ai/run-turn.test.ts`.

**Produces:** `export interface ToolResultEvent { toolCallId: string; toolName: string; input: unknown; output: string; failed: boolean }` and `RunTurnOptions.onToolResult?: (result: ToolResultEvent) => void`.

- [ ] Test `reports each tool's result after it runs`: `openAiToolCall("c1","echo",{})` then `openAiText("ok")`; expect `onToolResult` called once with `{ toolCallId: "c1", toolName: "echo", input: {}, output: "echoed", failed: false }`.
- [ ] Test `reports a tool that throws as failed`: a tool whose `run` throws `new Error("Not found")`; expect `{ output: "Not found", failed: true }`.
- [ ] Test `reports a non-text result as JSON`: a tool returning `{ a: 1 }` (cast); expect `output: '{"a":1}'`.
- [ ] Run `yarn test-unit src/shared/lib/ai/run-turn.test.ts`; expect the three to fail.
- [ ] Implement the `tool-result` case (skip `part.preliminary`) and the `tool-error` case (`messageOf(part.error)`), with the output as text: a string as is, anything else `JSON.stringify`.
- [ ] Run again; expect pass. Commit `feat(client-v2): runTurn reports each tool's result`.

### Task 2: the `call` record on a `tool` item

**Files:** Create `src/views/sidebar/assistant/model/tool-call.ts` (type, caps, `isToolCallRecord`, `toToolCallRecord`: a leaf, so replay can import it without a cycle through the store). Modify `src/views/sidebar/assistant/store.ts` (`addToolResult`, in-source tests), `src/features/persistence/model/chat-codec.ts` (decode + its block).

**Produces:**
- `export interface ToolCallRecord { name: string; input: unknown; output: string; failed?: true }`.
- `ChatItem` `tool` variant: `{ kind: "tool"; label: string; call?: ToolCallRecord }`.
- `static addToolResult(result: { toolName: string; input: unknown; output: string; failed: boolean }): void`: pushes `{ kind: "tool", label: toolName, call }`; capped by `capCall`, key redacted with `redactKey`, skipped by `_dropsCut`.
- `export const isToolCallRecord = (item: ChatItem): item is ChatItem & { kind: "tool"; call: ToolCallRecord }`, declared once, so the renderer and replay agree.

- [ ] Tests in `store.test.ts`: `stores a tool's result as a record` (exact item shape); `cuts a 10,000-character result to 4,000 and says 6,000 were cut`; `cuts a long input string and keeps the other fields`; `replaces an input over 4,000 characters serialised with a note`; `redacts the key from a stored result`; `writes no record while a cut turn unwinds`.
- [ ] Tests in the codec block: `keeps a tool item's call record`; `drops a malformed call record and keeps the marker` (`call: { name: 1 }`).
- [ ] Run both; expect failures. Implement `capCall` (module-private in store.ts), `addToolResult`, `isToolCallRecord`, and `withValidCall` in the codec (a `call` must have a string `name`, a string `output`, `failed` absent or `true`).
- [ ] Run; pass. Commit `feat(client-v2): store each finished tool call with its thread`.

### Task 3: replay records

**Files:** Modify `src/features/persistence/model/replay.ts` (its block), `src/features/persistence/index.ts` if the type export changes.

**Consumes:** `isToolCallRecord`, `ToolCallRecord`. **Produces:** `toReplayMessages(items): ModelMessage[]` (`ReplayMessage` becomes `= ModelMessage`).

- [ ] Tests: `replays a stored call as a tool call and its result, in place` (user, record, assistant → user, assistant `tool-call` `call_1`, tool `tool-result` `call_1` output `{ type: "text", value }`, assistant text); `replays a failed call as an error result` (`{ type: "error-text" }`); `numbers two calls in order, each result naming its own call`; `leaves out a marker with no record`; existing text-only tests stay.
- [ ] Run; fail. Implement. Update the module comment: records are stored now, so the "only what was said" rationale changes to "what was said and what the tools returned".
- [ ] Run; pass. Commit `feat(client-v2): replay stored tool calls to a reopened thread`.

### Task 4: provider and thread

**Files:** Modify `src/views/sidebar/assistant/model/provider.ts`, `src/widgets/assistant/ui/BaseThreadItem.tsx`, `src/views/sidebar/assistant/model/provider.test.ts`, and the BaseThreadItem test if one exists.

- [ ] Test (provider.test.ts): `stores the tool's result after the tool's own items`: the existing write_file stream; expect items `assistant`, `tool: wrote src/lib.rs`, a record with name `write_file`, `assistant`. Fix `rendered()` to skip records so existing expectations stay.
- [ ] Test: `sends a seeded tool call and its result before the input` (seed from `toReplayMessages` of a thread with a record; assert the chat-completions body has `tool_calls` with id `call_1` and a `tool` message with `tool_call_id: "call_1"`).
- [ ] Test (round trip, provider.test.ts): `a thread's calls survive storage and a pull`: build items with a record via `addToolResult`, `encode`/`decodeThread` (and `mergeThreads` with an empty remote), `toReplayMessages`, `createProvider(...).send("next")`; assert the body carries the call and result. This is the success metric's test.
- [ ] Implement: `createProvider(connection, seed: readonly ModelMessage[] = [])`, `history = [...seed]`; `onToolResult: (r) => PgAssistant.addToolResult(r)`. `BaseThreadItem`: `case "tool"` returns `null` when `item.call` is set.
- [ ] Run `yarn test-unit src/views/sidebar/assistant src/widgets/assistant src/features/persistence src/shared/lib/ai`; pass. Commit `feat(client-v2): seed a rebuilt provider with the thread's tool calls`.

### Task 5: gate

- [ ] `yarn run check` green (lint, format, types, unit, spec validate).
- [ ] Tick tasks 1.1–1.6 in `tasks.md`; the OpenSpec close question goes before `gh pr create` (method phase 6).
