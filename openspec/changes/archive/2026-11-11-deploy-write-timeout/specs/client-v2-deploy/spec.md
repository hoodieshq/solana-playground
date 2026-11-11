# Spec Delta

## MODIFIED Requirements

### Requirement: A write the browser could not send counts as refused

A buffer write the browser could not send at all, or whose blockhash it could not fetch, SHALL print the refusal line with "Failed to fetch" as its message,
in every browser, whatever the browser's own words for it ("Load failed" in Safari, a "NetworkError" in Firefox). The
browser reports an RPC that is down, and a 429 sent without CORS headers, this way. A buffer write with no answer
within 20 seconds SHALL count as refused, with "No answer in 20 s" as its message, and SHALL end its round: no
further chunk is sent in that round, and the stalled-round limit counts the round as any other. A write answered
within 20 seconds SHALL land as before.

#### Scenario: A stopped validator prints a refusal line (manual)

- **WHEN** a deploy to Localnet is writing its buffer and the local validator stops
- **THEN** the terminal prints "Warning: The cluster refused a buffer write (Failed to fetch), sending it again..."

#### Scenario: A write with no answer prints a refusal line (manual)

- **WHEN** a deploy to Localnet is writing its buffer and the local validator is paused, so a write gets no answer
- **THEN** within 20 seconds of that write the terminal prints "Warning: The cluster refused a buffer write (No answer
  in 20 s), sending it again...", and the round sends no further chunk

#### Scenario: Writes that never answer end the deploy (manual)

- **WHEN** an RPC answers reads of the buffer but never answers its writes
- **THEN** each round prints the refusal line once, and after 5 rounds that land nothing the deploy fails with "The RPC
  kept refusing buffer writes: no chunk landed in 5 rounds in a row (last refusal: No answer in 20 s)"
