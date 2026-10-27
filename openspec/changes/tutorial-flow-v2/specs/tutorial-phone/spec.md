# Spec Delta

## Purpose

A conversation tutorial on a phone: the same thread, cards and copy as on
the desktop, with the workspace moved into tabs and the Test form into a
drawer. Visual values follow Almaz's `SPEC.md` section 11.

## ADDED Requirements

### Requirement: The phone shows the same conversation

On a phone viewport a conversation tutorial SHALL render the same turns,
cards, copy and order as on the desktop, from the same saved progress. A step
started on one device SHALL continue on the other. The header SHALL show:

- back;
- "Step n of m · <title>";
- a track of the steps that opens a drawer with one row per step (a tap
  scrolls the chat to that divider);
- close.

Back and close SHALL return to the tutorials list with progress kept.

#### Scenario: Same path, same messages

- **WHEN** Hello Anchor runs to step 3 on a 390 px phone and on a 1440 px
  desktop
- **THEN** both feeds hold the same turns in the same order
- **AND** both show the same four questions with the same options

### Requirement: Chat, Code and Output are tabs

Under the header, a segmented control SHALL switch between three tabs:

- **Chat** (the default): the feed, the chips and the composer.
- **Code:** the files read only, with the written, landing and error line
  states, and a file switcher that opens the tree in a drawer.
- **Output:** the terminal log, the program id and the last receipt, with
  "Open Test" once deployed.

A dot SHALL mark Code when the assistant wrote since it was last viewed, and
Output when a result arrived. "Show in <file>" on a wrote card SHALL switch to
Code with the lines lit.

Other differences from the desktop:

- act buttons sit full width under their text;
- option rows are at least 48 px with no key hints;
- chips scroll sideways and hide while the keyboard is up;
- the composer grows to four lines;
- every touch target is at least 44 px.

#### Scenario: The assistant wrote, seen from Chat

- **WHEN** a right pick writes lines while the Chat tab is open
- **THEN** the wrote card shows the first lines in the feed and Code gets its
  dot
- **AND** "Show in lib.rs" switches to Code with the lines lit

### Requirement: The Test form is a drawer

The Test form SHALL open in a drawer from "Open Test" in the chat or in
Output. It SHALL be the same form, with the same results and the same step
passing, as the desktop's Test tab. "Type it myself" SHALL open a sheet with
the file and the landing line.

#### Scenario: Passing step 3 on a phone

- **WHEN** after the deploy the learner opens Test from Output and sends
  `hello`
- **THEN** the drawer shows the result and the chat's step 3 win follows
