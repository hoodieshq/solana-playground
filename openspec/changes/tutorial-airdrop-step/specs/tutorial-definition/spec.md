## ADDED Requirements

### Requirement: An act can be an airdrop

An act beat MAY be `act: "airdrop"`. It names no instruction and no account.
A lesson whose steps deploy a program SHALL carry an airdrop act before its
first `deploy` or `buildDeploy` act, in the same step or an earlier one. The
definition check SHALL refuse a lesson whose first deploy act has no airdrop
act before it, naming that act's id.

#### Scenario: Hello Anchor funds before it deploys

- **WHEN** the definition check reads Hello Anchor
- **THEN** the act `s2.airdrop` comes before the act `s2.deploy`, and the check
  passes

#### Scenario: A deploy with no airdrop before it

- **WHEN** a lesson's first deploy act `s2.deploy` has no airdrop act before it
- **THEN** the check fails with an error that names `s2.deploy`

#### Scenario: An airdrop act names an instruction

- **WHEN** an airdrop act carries `call`
- **THEN** the check fails, as it does for every act other than `call`
