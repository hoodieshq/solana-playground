# Spec Delta

## ADDED Requirements

### Requirement: The faucet opens with the wallet filled in

The "Open faucet" link of a tutorial's "Not enough devnet SOL" card SHALL open `https://faucet.solana.com` in a new
tab with the learner's wallet address and the devnet cluster filled in
(`https://faucet.solana.com/?walletAddress=<address>&cluster=devnet`). On the card a deploy posts, the link SHALL also
ask for 5 SOL (`&amount=5`), the most the devnet faucet gives in one request.

#### Scenario: The deploy's faucet link (manual)

- **WHEN** a tutorial deploy's airdrop is refused and the "Not enough devnet SOL" card shows
- **THEN** its "Open faucet" link is `https://faucet.solana.com/?walletAddress=<address>&cluster=devnet&amount=5`
  with the learner's wallet address

#### Scenario: A run's faucet link (manual)

- **WHEN** a tutorial run or call posts the "Not enough devnet SOL" card
- **THEN** its "Open faucet" link is `https://faucet.solana.com/?walletAddress=<address>&cluster=devnet`

### Requirement: The Writing buffer stage counts transactions

While a tutorial deploy writes its buffer, its act card SHALL read "Writing buffer", the stage count, and
"· N of M transactions", where M is the number of write transactions the program needs and N the number written so
far, as each write lands.

#### Scenario: The count rises during the write (manual)

- **WHEN** Hello Anchor's step 2 deploys
- **THEN** the act card reads "Writing buffer" with "· N of M transactions", and N rises to M before "Deploying"
