## ADDED Requirements

### Requirement: The airdrop act funds the wallet for the deploy

An airdrop act card SHALL be titled by its beat ("Get devnet SOL"), with the
context line "{short address} · {balance} SOL" and one primary button, its
beat's `button` ("Request airdrop"). It needs no sign-in. A press SHALL
request one devnet airdrop of the shortfall against the next deploy's cost,
plus fee headroom, capped at the faucet's amount. It SHALL wait for the
balance to show it, and land with the record "Added {amount} SOL". The
terminal SHALL print "Airdropping {amount} SOL...".

When the lesson reaches the card and the wallet already holds the deploy's
cost, the card SHALL land without a press and without an airdrop, with the
record "Your wallet has {balance} SOL", and the lesson flows on. A reload
that reaches the card again checks the balance again.

With no wallet in the browser, the context line SHALL read "A new Playground
wallet, made in this browser", and the same press SHALL make the Playground
wallet, then airdrop, landing with the record "Made a wallet and added {amount}
SOL". The lesson never shows the deploy's "No wallet" card when it reaches the
airdrop card first; that card stays for the deploy as a fallback.

A refused or rate-limited airdrop, or one whose balance never moved, SHALL
post the red result card "Not enough devnet SOL" (`aria-label="Not enough
SOL"`), with the line "Your wallet has {balance} SOL, and this deploy needs
about {cost} SOL. The devnet faucet is at its limit for now: try again in a
minute, or top the wallet up yourself." Under it sit "Your wallet" with the
short address and Copy, and "Open faucet" (`https://faucet.solana.com`, new
tab). A live airdrop card follows it, with the line "Asks the faucet again"
and the button "Try again".

The run SHALL report `tutorial_action_run` with `action: "airdrop"` and the
outcome `ok`, `no_wallet`, `no_funds`, `failed` or `interrupted`, like any act.

#### Scenario: A fresh wallet presses Request airdrop

- **WHEN** a learner with 0 SOL presses "Request airdrop" on Hello Anchor's
  airdrop card, and the faucet answers
- **THEN** the terminal prints "Airdropping 2 SOL...", the card lands with
  "Added 2 SOL", and the deploy card follows

#### Scenario: A funded wallet passes on its own

- **WHEN** the lesson reaches the airdrop card with 3.2 SOL in the wallet and
  the deploy costs about 1.9 SOL
- **THEN** no airdrop is requested, the card lands with "Your wallet has 3.2
  SOL", and the deploy card follows with no press

#### Scenario: No wallet yet

- **WHEN** a fresh browser with no Playground wallet reaches the airdrop card
- **THEN** the context reads "A new Playground wallet, made in this browser",
  and one press of "Request airdrop" makes the wallet and lands with "Made a
  wallet and added 2 SOL"

#### Scenario: The faucet refuses

- **WHEN** the faucet answers 429 to a press
- **THEN** the red "Not enough devnet SOL" card posts with the balance and the
  cost, and a live card "Asks the faucet again" with "Try again" follows it

### Requirement: The deploy does not fund the wallet

A tutorial deploy SHALL NOT request an airdrop. It SHALL check the wallet's
balance against the deploy's cost, on the estimate before the build and again
on the real binary. When the balance is short, it SHALL stop before writing
the buffer and post the red "Not enough devnet SOL" card, with the same line,
wallet row and "Open faucet". The live deploy card that follows reads "Checks
your balance again, then deploys", with "Try again". The deploy card's stages
SHALL be Building (when stale), Writing buffer, Deploying and Confirming: there
is no "Funding your wallet" stage.

#### Scenario: A short wallet reaches the deploy

- **WHEN** a learner's wallet holds 0.4 SOL at the deploy, and the deploy
  costs about 1.9 SOL
- **THEN** no airdrop is requested, and the "Not enough devnet SOL" card posts,
  followed by "Checks your balance again, then deploys"

#### Scenario: A learner tops up from the faucet site and retries

- **WHEN** the learner funds the wallet at faucet.solana.com and presses "Try
  again"
- **THEN** the deploy checks the balance, finds it enough, and deploys
