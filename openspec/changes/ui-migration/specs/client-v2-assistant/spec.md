# Spec Delta

## Purpose

How the assistant's composer names the model it talks to, how a turn is
sent and stopped, and how a model is connected.

## ADDED Requirements

### Requirement: The composer names the model it talks to

The composer SHALL name the model the next message goes to, from what the
deployment or the connection reports, and SHALL offer an effort control only
for a backend that takes one.

#### Scenario: The hosted default

- **WHEN** the deployment serves a default backend and nothing is connected
- **THEN** the composer names the default backend's model and shows no
  effort control

#### Scenario: A backend with an effort ladder

- **WHEN** a user connects a backend whose models take an effort setting
- **THEN** the composer names the picked model and shows its effort

### Requirement: The composer works without a key

On a deployment that serves a default backend, the composer SHALL send a
message with no key and no connect step first.

#### Scenario: The first message on the hosted default

- **WHEN** nothing is connected and a user types a message and sends it
- **THEN** the message goes to the default backend and its answer appears

#### Scenario: No default backend

- **WHEN** the deployment serves no default backend and a user sends a
  message
- **THEN** Connect a model opens and the message stays in the composer

### Requirement: Send turns to Stop

While an answer is coming, the composer's Send SHALL be a Stop that ends the
turn.

#### Scenario: Stopping an answer

- **WHEN** a user sends a message and presses Stop while the answer streams
- **THEN** the turn ends, the thread says it was stopped, and Send is back

### Requirement: Connect a model fits the screen

Connect a model SHALL be a dialog on a desktop and a page of its own on a
phone.

#### Scenario: Connecting on a desktop

- **WHEN** a user opens Connect a model at 1280 px wide
- **THEN** a dialog opens over the app and closes once a backend is
  connected

#### Scenario: Connecting on a phone

- **WHEN** a user opens Connect a model at 390 px wide
- **THEN** it fills the screen, with its connect button in reach at the
  bottom
