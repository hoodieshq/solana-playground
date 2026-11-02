## ADDED Requirements

### Requirement: Every admitted turn is recorded

`/api/agent` SHALL write one `agent_turn` row for every turn the spend ledger
admitted, in the statement that settles its charge: `user_id`, `day` (the UTC
day it was reserved on), `at`, `tier`, `outcome` (the turn's end:
`completed`, `unfinished`, `refused`, `abandoned`), `prompt_tokens`,
`completion_tokens` and `charged` in micro-USD. Tokens are those the upstream
reported for a `completed` turn, and null otherwise or when the reported count
is not a non-negative integer that fits a Postgres `integer`. A turn refused
before the ledger (signed out, cross-origin, malformed, too large, ledger down)
writes nothing. A settle that fails is logged as
`agent: settling a turn failed` and leaves no row.

#### Scenario: A completed turn
- **WHEN** a signed-in user's turn streams to its end and the upstream reports
  100 prompt and 20 completion tokens
- **THEN** one `agent_turn` row holds outcome `completed`, those token counts,
  the user's tier, the reserve's day and a `charged` equal to what
  `agent_spend.spent` grew by

#### Scenario: A token count the table cannot hold
- **WHEN** the upstream reports `prompt_tokens` as `2.5`, `"12"`, `-1` or
  `2^31`
- **THEN** the turn is still settled and recorded, with `prompt_tokens` null

#### Scenario: No extra round trip for an admitted turn
- **WHEN** an admitted turn ends
- **THEN** the route issues the same number of queries as before this change

### Requirement: Turns the daily cap refuses are counted

A turn refused with 429 `daily-cap` SHALL add one to `agent_spend.capped` on
the user's row for that UTC day, inserting the row when there is none, and
SHALL write no `agent_turn` row. A count that fails is logged as
`agent: counting a capped turn failed` and the caller still gets the 429.

#### Scenario: A turn the cap refuses
- **WHEN** a turn is refused with 429 `daily-cap`
- **THEN** the day's `capped` grows by one, no `agent_turn` row is written and
  no upstream call is made

### Requirement: The hosted keys never leave the route's own text

No response body the route writes itself, no error frame it adds to a stream,
and no server log line it writes SHALL contain a hosted key
(`AGENT_API_KEY`, `AGENT_NEWCOMER_API_KEY`) or any run of 8 or more
consecutive characters of one. Text that came from the upstream or from a
thrown error is cut to 300 characters and then redacted before it is relayed
or logged. The upstream's own 200 event stream is forwarded as it comes and is
outside this requirement.

#### Scenario: The upstream quotes the key in an error
- **WHEN** the upstream answers 500, 401, 402, 403 or 429 with a body
  containing the key, whole or with its middle masked
- **THEN** neither the response the caller gets nor any `console` line
  contains an 8-character run of the key, and a 402 pool refusal or a 403
  cause is still recognised

#### Scenario: A failure message quotes the key
- **WHEN** the upstream fetch throws, or its stream breaks, with an error
  whose message contains the key
- **THEN** the `Upstream unreachable` answer or the stream's error frame does
  not contain it
