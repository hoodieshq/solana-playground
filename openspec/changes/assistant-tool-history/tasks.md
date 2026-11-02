# Tasks

## 1. Tool calls kept in the agent's history (HOO-2425)

One PR. [Plan](plans/1-tool-history.md).

- [x] 1.1 `runTurn` reports each tool result and failure (`onToolResult`), skipping preliminary results
- [x] 1.2 `tool` items carry an optional `call` record; `PgAssistant.addToolResult` writes it capped and redacted; `chat-codec` keeps a valid record and drops a malformed one
- [x] 1.3 The provider records each result and is seeded with `ModelMessage[]`
- [x] 1.4 `toReplayMessages` replays stored calls as tool-call and tool-result pairs with fresh ids
- [x] 1.5 `BaseThreadItem` draws nothing for a stored call
- [x] 1.6 Round-trip test: write, read, merge and decode a thread with calls, then replay it
