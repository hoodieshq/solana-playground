## ADDED Requirements

### Requirement: Every turn that reaches the ledger is recorded

`/api/agent` SHALL write exactly one `agent_turn` row for every turn that
reaches the spend ledger: `user_id`, `at`, `tier`, `outcome`,
`prompt_tokens`, `completion_tokens` and `charged` in micro-USD. `outcome` is
the turn's end (`completed`, `unfinished`, `refused`, `abandoned`) for an
admitted turn, and `capped` for one the daily cap refused. Tokens are those
the upstream reported for a `completed` turn and null otherwise. A turn
refused before the ledger (signed out, cross-origin, malformed, too large,
ledger down) writes no row.

#### Scenario: A completed turn
- **WHEN** a signed-in user's turn streams to its end and the upstream reports
  100 prompt and 20 completion tokens
- **THEN** one `agent_turn` row holds outcome `completed`, those token counts,
  the user's tier and a `charged` equal to what `agent_spend.spent` grew by

#### Scenario: A turn the cap refuses
- **WHEN** a turn is refused with 429 `daily-cap`
- **THEN** one row holds outcome `capped`, `charged` 0 and null tokens, and no
  upstream call is made

#### Scenario: No extra round trip for an admitted turn
- **WHEN** an admitted turn ends
- **THEN** the route issues the same number of queries as before this change:
  the row is written by the statement that settles the turn

### Requirement: The hosted keys never leave the route

No response body, stream error frame or server log line written by
`/api/agent` SHALL contain a hosted key (`AGENT_API_KEY`,
`AGENT_NEWCOMER_API_KEY`) or any run of 8 or more consecutive characters of
one. Text that came from the upstream or from a thrown error is redacted
before it is relayed or logged.

#### Scenario: The upstream quotes the key in an error
- **WHEN** the upstream answers 500, 401 or 402 with a body containing the key
- **THEN** neither the response the caller gets nor any `console` line
  contains the key or an 8-character run of it

#### Scenario: A failure message quotes the key
- **WHEN** the upstream fetch throws, or its stream breaks, with an error
  whose message contains the key
- **THEN** the `Upstream unreachable` answer or the stream's error frame does
  not contain it
