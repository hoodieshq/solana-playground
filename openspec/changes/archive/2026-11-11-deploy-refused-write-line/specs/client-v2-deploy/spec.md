# Spec Delta

## ADDED Requirements

### Requirement: A refused buffer write shows in the terminal

While a deploy writes its buffer, the first write in each round that the cluster refuses SHALL print one warning line:
"Warning: The cluster refused a buffer write ({message}), sending it again...". {message} is the first line of the
cluster's message for the refusal, or of the error's message when the cluster sent none. Further refusals in the same
round SHALL print nothing more. This holds for the Deploy stage, the terminal and a tutorial's deploy.

#### Scenario: A round of refused writes prints one line (manual)

- **WHEN** a deploy writes its buffer and the cluster refuses several writes in one round with "Transaction simulation
  failed: Blockhash not found"
- **THEN** the terminal prints "Warning: The cluster refused a buffer write (Transaction simulation failed: Blockhash
  not found), sending it again..." once for that round, and the refused chunks are sent again in the next round

#### Scenario: Each round that refuses a write prints its own line (manual)

- **WHEN** two rounds of a buffer write each land some chunks and have others refused
- **THEN** the terminal prints the refusal line twice, once per round

### Requirement: A write the browser could not send counts as refused

A buffer write the browser could not send at all SHALL print the refusal line with "Failed to fetch" as its message.
The browser reports an RPC that is down, and a 429 sent without CORS headers, this way.

#### Scenario: A stopped validator prints a refusal line (manual)

- **WHEN** a deploy to Localnet is writing its buffer and the local validator stops
- **THEN** the terminal prints "Warning: The cluster refused a buffer write (Failed to fetch), sending it again..."

### Requirement: A rate-limited write prints no refusal line

A buffer write the RPC answers with a rate limit it names (an HTTP 429 or a provider's rate-limit error) SHALL print
the "Reached rate-limits" line only, and no refusal line.

#### Scenario: A rate limit prints no refusal line (manual)

- **WHEN** the RPC answers a buffer write with a rate limit
- **THEN** the terminal prints "Warning: Reached rate-limits" and no refusal line
