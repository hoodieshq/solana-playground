# Spec Delta

## ADDED Requirements

### Requirement: A refused buffer write shows in the terminal

While a deploy writes its buffer, the first write in each round that the cluster refuses SHALL print one warning line:
"Warning: The cluster refused a buffer write ({message}), sending it again...". {message} is the first line of the
cluster's message for the refusal, or of the error's message when the cluster sent none. Further refusals in the same
round SHALL print nothing more. This holds for the Deploy stage, the terminal and a tutorial's deploy.

#### Scenario: A round of refused writes prints one line

- **WHEN** a deploy writes its buffer and the cluster refuses several writes in one round with "Transaction simulation
  failed: Blockhash not found"
- **THEN** the terminal prints "Warning: The cluster refused a buffer write (Transaction simulation failed: Blockhash
  not found), sending it again..." once for that round, and the refused chunks are sent again in the next round

#### Scenario: Each round that refuses a write prints its own line

- **WHEN** two rounds of a buffer write each land some chunks and have others refused
- **THEN** the terminal prints the refusal line twice, once per round

### Requirement: A rate-limited write prints no refusal line

A buffer write the RPC answers with a rate limit SHALL print the "Reached rate-limits" line only, and no refusal line.

#### Scenario: A rate limit prints no refusal line

- **WHEN** the RPC answers a buffer write with a rate limit
- **THEN** the terminal prints "Warning: Reached rate-limits" and no refusal line
