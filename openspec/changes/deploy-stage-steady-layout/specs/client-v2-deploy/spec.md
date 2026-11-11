## MODIFIED Requirements

### Requirement: The stage shows the run as steps

While a deploy started from the stage or the terminal runs, the stage SHALL
show a progress region (`role="status"`, `aria-label="Deploy progress"`)
listing the steps in order: "Funding wallet" (only when the run funds the
wallet), "Preparing buffer", "Writing program, {percent}%" and "Deploying"
("Upgrading" when the program exists). Before the first deploy on the network
picked, the region SHALL sit in the facts card, in the who-pays row of "The
facts of a first deploy sit in one card"; after one, above the held deploy
action. Each step SHALL read as done, running or waiting. The terminal SHALL
keep printing its own lines.

#### Scenario: Steps of a first deploy (manual)

- **WHEN** a funded wallet deploys a program for the first time on devnet
- **THEN** the progress region shows "Preparing buffer", then "Writing
  program" with a rising percent, then "Deploying", and no "Funding wallet"

#### Scenario: A first deploy starts in place

- **WHEN** a funded Playground wallet presses "Deploy to devnet" on a built
  program with no deployment on devnet
- **THEN** the progress region shows three steps in the facts card, and on
  every frame until the result shows, the stage's title and the deploy action
  stay where they were before the press

#### Scenario: A first deploy that funds the wallet starts in place

- **WHEN** a signed-in user with automatic airdrop on and no wallet presses
  "Deploy to devnet" on a built program with no deployment on devnet
- **THEN** the progress region shows four steps, "Funding wallet" first, and
  on every frame until the result shows, the stage's title and the deploy
  action stay where they were before the press

### Requirement: The facts of a first deploy sit in one card

Before the first deploy on the network picked (Spec 08's EMPTY-03), the Deploy
stage SHALL show the deploy's facts as rows of one card, under the title and
its line: a row named "Network" with the network's name and a "Change" link
that opens the settings on the network choice; a row named "IDL" with the
loaded IDL's program name, only while an IDL is loaded; once the program is
built or while a deploy runs, the who-pays row, which holds the who-pays line of "The stage names who
pays" while no deploy runs and the progress region while one does, at the
height of the four-step list either way; and last, the program id, which
unfolds into its keypair. The card SHALL leave out
the Network row while the cluster is unknown. After a deploy on the network
picked, the stage SHALL keep a card under the history with the IDL row, when an
IDL is loaded, and the program id.

#### Scenario: A built program before its first deploy (manual)

- **WHEN** a built project with a loaded IDL named "counter" opens the Deploy
  stage on devnet with no deployment there
- **THEN** one card lists Network "Devnet" with Change, IDL "counter", the
  who-pays line and the program id, in that order

#### Scenario: Change opens the network choice (manual)

- **WHEN** the user presses Change in the card's Network row
- **THEN** the settings open with focus on the network choice
