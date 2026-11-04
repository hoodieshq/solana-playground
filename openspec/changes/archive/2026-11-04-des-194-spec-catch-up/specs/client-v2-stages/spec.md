# Spec Delta

## Purpose

What the Build, Deploy and Interact stages show and offer, in each state.

## ADDED Requirements

### Requirement: An Interact instruction card groups its inputs

Each instruction card on the Interact stage SHALL show, beside the
instruction's name, how many inputs it takes as "n args · n accounts"
(singular for one, a kind with none left out, nothing for an instruction that
takes none). Its inputs SHALL sit under two fixed headings, "Arguments" and
"Accounts", each shown only when the instruction has inputs of that kind,
never folded away. An input's label SHALL be its name, then its type in quiet
mono, then `mut` and `signer` as neutral tags with no colour of their own.

#### Scenario: An instruction with one argument and two accounts

- **WHEN** the Interact stage shows an instruction with one argument and two
  accounts
- **THEN** its card's head reads "1 arg · 2 accounts"
- **AND** the argument sits under "Arguments" and the accounts under
  "Accounts", both shown without a click

#### Scenario: An instruction that takes nothing

- **WHEN** the Interact stage shows an instruction with no arguments and no
  accounts
- **THEN** its card's head shows no count and neither heading is drawn

### Requirement: An Interact card's Test says what it waits for

An instruction card SHALL end in one row with Test, the card's only primary
action, and, for an instruction that has inputs, "Fill with Random" and
"Reset" beside it as quiet buttons. While Test is held, the row SHALL say why:
"Connect a wallet to test" with no wallet, else "Fill every field to test"
while a field is empty or invalid; nothing once Test can run.

#### Scenario: Test held for a wallet

- **WHEN** no wallet is connected and the user opens an instruction card
- **THEN** Test is disabled and the row reads "Connect a wallet to test"

#### Scenario: Test held for a field

- **WHEN** a wallet is connected and an argument of the instruction is empty
- **THEN** Test is disabled and the row reads "Fill every field to test"
- **AND** after "Fill with Random" fills the empty fields, the line is gone and
  Test is enabled

### Requirement: Copy sits inside an Interact field

An Interact input that holds a value SHALL offer its Copy button
(`data-slot="copy-button"`) inside the field, at its end, and none while the
field is empty.

#### Scenario: Copy appears with a value

- **WHEN** the user types a value into an Interact argument
- **THEN** a Copy button shows inside that field and copies the value

### Requirement: The Deploy stage names its cluster and what holds it

The Deploy stage SHALL show the selected cluster over its title, capitalised
("Devnet"), after a status dot, before and after the first deploy. Before a
build, its description SHALL read "Build the program first. Deploy opens once
the build passes." A failed deploy SHALL show an error callout (`role="alert"`)
reading "Deploy failed. The terminal has the details." Upload IDL SHALL be a
link, not a button: under the Deploy pill before the first deploy on a desk,
above it on a phone, and beside it after one. The stage keeps
`flow-stage-panel-deploy`.

#### Scenario: Deploy before a build

- **WHEN** a project that has never been built opens the Deploy stage on devnet
- **THEN** the stage shows "Devnet" over "Nothing deployed yet"
- **AND** reads "Build the program first. Deploy opens once the build passes."
- **AND** Deploy is disabled and Upload IDL is a link under it

#### Scenario: A failed deploy

- **WHEN** a deploy fails
- **THEN** the stage shows "Deploy failed. The terminal has the details." in
  an alert
