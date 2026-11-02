# Design

## Context

See proposal.md, Why. Three facts shape the approach:

- `createProvider` keeps the SDK's `ModelMessage[]` for the life of one
  provider. `use-turn` rebuilds the provider whenever the connection object,
  the thread or `PgAssistant.conversation` changes, and seeds it from
  `toReplayMessages(PgAssistant.items)`.
- A `tool` item is written by each tool's own `run` (`addToolCall(label)`),
  without the SDK's `toolCallId`. Write tools leave an approval card instead,
  and some tools write nothing at all, so no item maps one-to-one onto a call.
- The item kinds are fixed in three places: `KINDS` in `chat-codec.ts`, `KINDS`
  in `api/conversations.mjs`, and the `messages_kind_check` constraint in the
  database. An unknown kind fails the whole push on the server.

## Goals / Non-Goals

**Goals:**

- The model's history after a rebuild is the history it had before, minus
  provider-only parts and with long values cut.
- No change that has to ship in a set order with a migration.

**Non-Goals:**

- Replaying provider-native records byte for byte (reasoning, signatures).
- Changing when `use-turn` rebuilds a provider (HOO-1752).

## Decisions

### A stored call is a `tool` item with a `call` field

`{ kind: "tool", label: <tool name>, call: { name, input, output, failed? } }`,
written by the provider when the SDK reports the tool's result.

- Over a new kind (`"call"`): a new kind needs a migration of
  `messages_kind_check` and a change to the server's `KINDS`. A deploy that
  reaches users before the migration fails the push of every thread that
  holds a call. The `tool` kind is accepted everywhere today.
- Over attaching `call` to the marker a tool writes: the marker is written
  inside `run` with no call id, write tools leave an approval card instead, and
  parallel calls interleave, so matching a result to its marker would be a
  guess. A record of its own is written where the result is known.
- `label` is the tool's name, so a tab still running the previous code draws
  a plain marker rather than an empty one.
- The record's type, its caps and `isToolCallRecord` live in a leaf module,
  `views/sidebar/assistant/model/tool-call.ts`. Replay in `features/persistence`
  needs the predicate at runtime, and the store imports persistence, so taking
  it from the store would close an import cycle that the dev build's
  `CircularDependencyPlugin` refuses.

### `runTurn` reports results through `onToolResult`

It already reads every stream part, so it reports `tool-result` (skipping
`preliminary` ones) and `tool-error` with `{ toolCallId, toolName, input,
output, failed }`. The provider turns each into a stored call. Recording from
the stream rather than from `result.responseMessages` keeps the calls of a turn
that fails or is stopped after its tools ran. Those calls ran, and the model
must not run them again.

### Replay mints its own call ids

Each replayed pair gets `call_<n>`, numbered through the replay. Ids from one
backend are not valid on another (Anthropic accepts `[a-zA-Z0-9_-]+`, OpenAI
caps the length), and a provider rebuilt after a backend switch replays
another backend's calls. The pair is self-contained, so the original id is not
needed and is not stored.

### Replay sends each call as its own pair

`assistant { tool-call }` then `tool { tool-result }`, rather than grouping a
step's parallel calls into one assistant message. Both chat-completions and
Anthropic accept consecutive pairs. Grouping would need the step boundary,
which the thread does not keep.

### `toReplayMessages` returns `ModelMessage[]`

The seed gains tool messages, so the replay's type becomes the SDK's
`ModelMessage` (a type-only import), and the provider uses it as is.

### Caps: 4,000 characters per result, 1,000 per input string

The server takes at most 2 MB per batch, and a thread keeps its newest 200
items. 200 records at their cap stay under the limit together with the text.
`describeProject` sends the live project with every turn, so a file the model
read is in front of it again anyway, and a cut result loses little. The caps
are constants beside the writer.

## Risks / Trade-offs

- [Records count towards the 200-item thread cap] → a tool-heavy thread drops
  its oldest items sooner. The cap is a bound on what is rendered and synced,
  and the dropped items are the oldest.
- [A model shown a cut result may read it again] → the marker says the value
  was cut, which is the cue to read it again if it matters.
- [Gemini 3 wants thought signatures on function calls] → only for the
  current turn's calls, which come from the in-memory history, never from the
  replay.
- [A stored result holds project content on the server] → the thread already
  stores patch bodies (`PatchApproval.before`/`after`) the same way, and the
  key is redacted.

## Migration Plan

None. Threads stored before this change carry no `call` field and replay as
before. Rollback: the previous code ignores the field and draws each record as
a marker with the tool's name.
