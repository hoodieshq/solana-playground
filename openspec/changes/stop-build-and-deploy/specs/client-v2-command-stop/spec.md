# Spec Delta

## Purpose

How a person stops a build or a deploy that is running, from the terminal or
from the console strip, and what the terminal says a stop left behind.

## ADDED Requirements

### Requirement: The strip offers Stop while a build or a deploy runs

While a build or a deploy runs, the console strip SHALL show a button named
"Stop build" or "Stop deploy" (its `aria-label`; its text is "Stop") in place
of Clear, whether the console is folded or open. Pressing it SHALL stop the
run. When nothing runs, the button SHALL not be there.

#### Scenario: Stop shows while a build runs

- **WHEN** a build is running
- **THEN** the strip shows a button labelled "Stop build" and no Clear button

#### Scenario: Stop leaves when the run ends

- **WHEN** a build that was running finishes
- **THEN** the strip shows no "Stop build" button

### Requirement: A stopped build leaves nothing behind

Stopping a build SHALL abort its request to the build server. A reply that
arrives after the stop SHALL be dropped: the project's build state, its IDL
and its build output stay as they were before the run. The terminal SHALL
print `^C` and "Stopped. Nothing was built.", and return the prompt. The
Build stage SHALL return to what it showed before the run, and the strip SHALL
read "Build stopped". No failure message or toast SHALL appear.

#### Scenario: Stop during a build

- **WHEN** a build is waiting on the build server and the person presses
  "Stop build"
- **THEN** the terminal prints "Stopped. Nothing was built.", the strip reads
  "Build stopped", and no build output or error is shown

#### Scenario: Ctrl+C during a build

- **WHEN** a build is waiting on the build server and the person presses
  Ctrl+C in the terminal
- **THEN** the terminal prints `^C` and "Stopped. Nothing was built.", and the
  prompt returns

### Requirement: A stopped deploy stops between chunks and says what is left

Stopping a deploy SHALL take effect at the next safe point: before the buffer
account is created, or between chunks of the write step. It SHALL ask no
question. The terminal SHALL print `^C` and one line:

- before the buffer exists: "Stopped. The program was not deployed."
- after: "Stopped. The program was not deployed. The buffer account
  <address> still holds its SOL; run `solana program close --buffers` to
  reclaim it."

The program on chain SHALL stay as it was. The final deploy or upgrade
transaction SHALL not be interrupted; a stop that arrives during it lets it
finish. The Deploy stage SHALL return to its built state, and the strip SHALL
read "Deploy stopped". No deploy is recorded in the history.

#### Scenario: Stop during the write step (manual)

- **WHEN** a deploy is writing chunks to its buffer on devnet and the person
  presses "Stop deploy"
- **THEN** the write ends at the next chunk, the terminal names the buffer
  account and how to reclaim its SOL, the strip reads "Deploy stopped", and
  the program on chain is unchanged

#### Scenario: Stop before the buffer exists (manual)

- **WHEN** a deploy is fetching its program binary and the person presses
  "Stop deploy"
- **THEN** no transaction is sent and the terminal prints "Stopped. The
  program was not deployed."

### Requirement: A command that cannot stop says so

Ctrl+C while a command that does not honour a stop is running SHALL print
`^C` and "`<command>` can't be stopped. Wait for it to finish.", and the
command SHALL go on.

#### Scenario: Ctrl+C during a command that cannot stop (manual)

- **WHEN** `airdrop` is running and the person presses Ctrl+C
- **THEN** the terminal says `airdrop` can't be stopped, and the airdrop goes
  on to its own result
