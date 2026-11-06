# Spec Delta

## ADDED Requirements

### Requirement: Buffer writes are paced

A deploy SHALL send its buffer writes at one pace shared by all its workers. The pace SHALL start at 4 writes per
second, or at the cluster's send cap when that is lower. Each rate limit the RPC answers SHALL halve the pace, to no
less than 1 write per second unless a cap holds it lower, and end the round; the next round SHALL wait 10 seconds, after the terminal prints
"Warning: Reached rate-limits ({provider}: {reason}), waiting …". Every 10 accepted writes in a row SHALL raise the
pace by 1 write per second.

#### Scenario: A rate-limited write slows the deploy (manual)

- **WHEN** a deploy on devnet sends buffer writes faster than its RPC allows and the RPC answers 429
- **THEN** the terminal prints "Warning: Reached rate-limits" with the provider and its message, the deploy waits
  10 seconds, and the next round sends at half the pace

### Requirement: The send cap comes from the env per cluster

The pace SHALL never rise above the cluster's send cap: `REACT_APP_DEVNET_SEND_TX_PER_SECOND`,
`REACT_APP_TESTNET_SEND_TX_PER_SECOND` or `REACT_APP_MAINNET_SEND_TX_PER_SECOND`, in writes per second. The cap SHALL
apply to every RPC of that cluster: the platform RPC, the public one, and a custom RPC whose genesis hash names the
cluster. A cap that is unset, not a number, or not above 0 SHALL cap nothing, and the pace then rises to at most 20
writes per second.

#### Scenario: A capped cluster never sends faster than its cap (manual)

- **WHEN** `REACT_APP_DEVNET_SEND_TX_PER_SECOND` is `4` and a program of a few hundred chunks deploys to devnet
  with no rate limit
- **THEN** no second of the write sends more than 4 buffer writes

### Requirement: A load that lands no chunk fails

After each round of writes the deploy SHALL read the buffer and send again only the chunks that are missing or
differ. When 5 rounds in a row leave no fewer chunks missing than the round before, the load SHALL fail with "The RPC
kept refusing buffer writes: no chunk landed in 5 rounds in a row", followed by "(last rate limit: {provider}:
{reason})" when a rate limit was answered. A deploy typed in the terminal SHALL then ask "Writing the program failed.
Would you like to close the buffer account and reclaim SOL?", yes by default.

#### Scenario: An RPC that refuses every write (manual)

- **WHEN** a deploy typed in the terminal writes to an RPC that refuses every buffer write
- **THEN** after 5 rounds the terminal asks whether to close the buffer account and reclaim SOL, and a yes prints
  "Reclaim successful." and the load's error

### Requirement: A stage deploy closes its buffer without asking

When a deploy the Deploy stage started fails while it writes its buffer, the deploy SHALL close the buffer and return
its SOL to the paying wallet without a question in the terminal, and the stage SHALL show the load's failure. A
deploy typed in the terminal SHALL keep its question.

#### Scenario: A stage deploy whose write fails (manual)

- **WHEN** a deploy started from the Deploy stage fails after 5 rounds in which no chunk lands
- **THEN** the terminal asks nothing, the buffer account no longer exists, and the stage shows the failure

### Requirement: Buffer accounts are read through the read-buffer RPC

Every read of a deploy's buffer account SHALL go through the cluster's read-buffer RPC when the env sets one:
`REACT_APP_DEVNET_READ_BUFFER_RPC_URL`, `REACT_APP_TESTNET_READ_BUFFER_RPC_URL` or
`REACT_APP_MAINNET_READ_BUFFER_RPC_URL`. This covers deploys typed in the terminal, started from the Deploy stage,
and run by a tutorial. Sends and every other read SHALL stay on the selected RPC. An unset or empty value SHALL read
the buffer through the selected RPC.

#### Scenario: A platform RPC that lags on fresh buffers (manual)

- **WHEN** `REACT_APP_DEVNET_READ_BUFFER_RPC_URL` is `https://api.devnet.solana.com` and a program deploys to devnet
  through a platform RPC that does not return an account written seconds before
- **THEN** each round sends only the chunks the buffer lacks, and the deploy finishes

### Requirement: The Deploy stage's faucet link names the wallet

The "Open faucet" link of the Deploy stage's "Not enough SOL" card SHALL open `https://faucet.solana.com` in a new tab
with the paying wallet's address and the cluster filled in, on a cluster the faucet serves. On any other cluster the
card SHALL show no faucet link.

#### Scenario: A devnet deploy without enough SOL

- **WHEN** a deploy started from the Deploy stage on devnet stops because the wallet holds too little SOL
- **THEN** its "Open faucet" link is `https://faucet.solana.com/?walletAddress=<address>&cluster=devnet`
