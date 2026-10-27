# Spec Delta

## Purpose

What a conversation tutorial's act cards and Test form actually do. They
build on Playground's build server, deploy and upgrade from the learner's
wallet on devnet, run the client, and call the program, with Explorer links on
every result. What happened decides when a step passes.

## ADDED Requirements

### Requirement: Build runs on Playground's build server

A build act SHALL send the workspace's program files to the build server the
learner's settings name, the same way the editor's Build does. Its stages:

- "Building" while the server compiles;
- on success, a result card "Build successful" with the IDL's instruction
  count and names and the real build time;
- on failure, the failed card of `tutorial-conversation` with the first
  compiler error's code, file, line and column, read from the server's log.

An unreachable server SHALL post a failed card "Build server unreachable",
which offers "Try again". A failure the server's output cannot place on a
line SHALL show the log, with no line link.

#### Scenario: The planned failure is a real compiler error

- **WHEN** Hello Anchor's step 1 builds before the fixing question
- **THEN** the build server answers with `error[E0412]: cannot find type
  `Hello` in this scope` at `src/lib.rs:9:32`
- **AND** the card reads "E0412 · line 9" and line 9 is marked

### Requirement: Deploy goes from the learner's wallet on devnet

A deploy act SHALL deploy the last successful build to devnet through the BPF
upgradeable loader, paid by the learner's Playground wallet. Its stages are
"Writing buffer", "Deploying" and "Confirming", each with "n of 3". Before
the first deploy:

- **No wallet:** the act card SHALL offer to create or connect one in place,
  and run nothing until there is one.
- **Too little balance:** the deploy SHALL top up the wallet by airdrop, the
  way the editor's deploy does. The stage reads "Funding your wallet".
- **Airdrop refused or rate limited:** a failed card "Not enough devnet SOL"
  SHALL post. It names the amount needed, offers "Try again", and links the
  devnet faucet with the wallet's address to copy.

A deploy SHALL keep the program's keypair in the workspace, so the program
keeps its address. Every later deploy of that tutorial's program SHALL upgrade
it in place. The result card SHALL read "Deployed" (or "Upgraded <short id>")
with:

- the SOL the deploy spent;
- the program id with Copy and an Explorer link;
- the deploy transaction with an Explorer link;
- the IDL's instructions and their arguments.

Every Explorer link SHALL open Solana Explorer on the devnet cluster in a new
tab.

#### Scenario: First deploy with an empty wallet

- **WHEN** a learner with a new wallet and 0 SOL presses Deploy on Hello
  Anchor's step 2
- **THEN** the card shows "Funding your wallet", then the three deploy stages
- **AND** the result shows the program id and the deploy transaction, each
  linking to `https://explorer.solana.com/...?cluster=devnet`

#### Scenario: The upgrade keeps the address

- **WHEN** step 4's build and deploy lands
- **THEN** the result reads "Upgraded" with the same program id as step 2
- **AND** its IDL line reads `hello(name: string)`

### Requirement: Client runs and calls send real transactions

A run act SHALL run the client file with Playground's client runner, the
program and the wallet bound as the editor's Run binds them. The terminal
SHALL show the runner's output. The result card SHALL show:

- the transactions the run sent and their confirmation;
- the program's log line the definition names (for Hello Anchor, the first
  line starting `Program log: Hello`), as the card's large line;
- the signature with Copy and an Explorer link, the compute units, the fee and
  the confirmation time.

A call act and a Test Send SHALL send the instruction with the given arguments
from the wallet, and post the same card with "Sent from the chat" or "Sent
from the Test form". A transaction that fails SHALL post a failed card with
its error and its log, and the step SHALL not pass.

#### Scenario: Hello from devnet

- **WHEN** the learner runs `client.ts` on step 3 with the picked line
- **THEN** the result reads "Confirmed · Sent from client.ts" with "Program
  log: Hello, World!"
- **AND** its signature opens the transaction in Explorer on devnet

### Requirement: A step passes on what happened

Each step's goal in the definition SHALL be checked against a real result:

- **`build`:** a build of the step's main file succeeds and its IDL holds the
  instructions the step's target defines.
- **`deploy`:** a deploy lands.
- **`call`:** a transaction calling the named instruction confirms on the
  deployed program. Its log holds the named line. Every argument the goal
  requires is non-empty, and the call is made on the program built from the
  target, so a call before the upgrade does not pass an argument goal.

A call from the client run, the call act or the Test form SHALL pass the same
goal. A Send outside a step's goal (on a win, after the finish) SHALL post its
card and pass nothing. A passed step SHALL stay passed. No step SHALL pass on
the learner's word alone.

#### Scenario: Passing step 3 from the Test tab

- **WHEN** with Hello Anchor's step 3 question still open the learner sends
  `hello` from the Test tab
- **THEN** the result posts at the live point with "Sent from the Test form"
  and step 3's win follows with the definition's Test line
- **AND** the open question's record reads "· skipped, called from Test"
  after Next

### Requirement: A changed deployed file asks for a redeploy

When a file of a deployed program changes (whitespace aside) after its last
deploy, a nudge SHALL post at the live point: "You changed <file> after
deploying. Devnet still runs the old version." The nudge comes with a "Build
and deploy" act, and the deploy step's segment gets an amber dot until a
deploy lands. Further edits SHALL update that one nudge, never add another.
The current step's goal SHALL stay as it is.

#### Scenario: Editing lib.rs after the deploy

- **WHEN** after step 2 the learner changes the `msg!` text in `lib.rs`
- **THEN** one nudge with "Build and deploy" posts at the live point
- **AND** the next call's log shows the new text only after that deploy lands

### Requirement: A reload interrupts a run, never repeats it

A run in flight at a reload SHALL not resume. Its act card SHALL come back
idle with "Interrupted by a reload. Run it again.". A deploy whose transaction
confirmed before the reload SHALL be recognised from the chain. Its result
then posts instead, so pressing Deploy again never deploys a second program
for the same tutorial.

#### Scenario: Reload mid-deploy

- **WHEN** the learner reloads during "Deploying"
- **THEN** the act card shows "Interrupted by a reload. Run it again."
- **AND** running it again upgrades the same program id

### Requirement: Runs are measured

The tutorial slice SHALL emit `tutorial_action_run` when an act or a Test Send
ends. Its parameters:

- `tutorial`: the slug;
- `step`: 1 to 6;
- `action`: `build`, `deploy`, `build_deploy`, `run`, `call` or `send`;
- `outcome`: `ok`, `failed`, `interrupted`, `no_wallet` or `no_funds`;
- `seconds`: the run's duration.

Failures SHALL also be logged through the logger with the error, never with a
key or the wallet's secret.

#### Scenario: A refused airdrop

- **WHEN** a deploy stops because the airdrop was refused
- **THEN** `tutorial_action_run` reaches the memory provider with `action:
  "deploy"` and `outcome: "no_funds"`
