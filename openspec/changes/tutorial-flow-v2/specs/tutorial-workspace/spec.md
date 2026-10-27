# Spec Delta

## Purpose

The frame a conversation tutorial runs in: the navigation folded to its rail,
the chat column and the workspace beside it, the editor's written and landing
lines, the file tree, the terminal, and the Call panel built from the deployed
IDL. Visual values follow Almaz's `SPEC.md` sections 4, 5 and 8.

## ADDED Requirements

### Requirement: Rail, chat, workspace, in that order

On a desktop from 1152 px wide, a conversation tutorial SHALL lay out the
navigation rail, the chat column and the workspace, left to right, with no
horizontal scroll. Their heads SHALL share one 44 px line. The chat head holds
a back button "Tutorials", the tutorial's name and a ⋯ menu with "Start
over…" and "Keyboard shortcuts". The chat column SHALL default to
`clamp(360px, 400px + (W − 1280px) × 0.134, 480px)` (420 at 1440). It SHALL
be resizable from 340 to 560 px by a handle on its right edge, never leaving
the workspace under 560 px; a double click resets it. The column order SHALL
not be swappable.

#### Scenario: Widths at 1440

- **WHEN** a tutorial is open in a 1440 × 900 window
- **THEN** the rail is 52 px, the chat column 420 px and the workspace fills
  the rest
- **AND** the page has no horizontal scroll

### Requirement: The navigation folds to its rail in a tutorial

Entering a tutorial (Start, Continue or a card) SHALL fold the navigation to
its icon rail, whatever was saved. In a tutorial:

- **Open:** the mark's button or ⌘B SHALL open the navigation as an overlay
  over the chat with a scrim.
- **Close:** a pick, a scrim click, Esc or ⌘B SHALL close the overlay and
  return focus.
- **Pin:** a pin in the overlay's head SHALL dock it open until the learner
  leaves the tutorial. Its tooltip reads "Keep open"; once pinned, "Fold
  while I learn".
- **Leaving:** the navigation SHALL return to its usual behaviour.

On the first fold only, a one-line hint "The menu is folded to icons while you
learn" with ⌘B SHALL show beside the mark for 6 s, or until a pointer down or
a key.

#### Scenario: Opening the menu in a tutorial

- **WHEN** the learner presses ⌘B on step 2
- **THEN** the navigation covers the chat with a scrim and the live card keeps
  its state
- **AND** Esc closes it and focus returns where it was

### Requirement: The workspace head holds tabs, Files and Terminal only

The workspace head SHALL hold:

- the file tabs, which never close;
- once the program is deployed, a "Call" button that opens the Call panel,
  set apart by a rule;
- the icon buttons Files (⌘E) and Terminal (⌘J), with tooltips, both
  `aria-pressed` while their panel is open.

It SHALL hold no Build, Deploy or Run. The active file tab SHALL carry a tree
toggle, a chevron button with `aria-label="Files"` and `aria-expanded`. The
Call button SHALL carry a dot on its first appearance, and again once when the
IDL changes.

#### Scenario: The head after step 3

- **WHEN** step 3 has started
- **THEN** the head shows the tabs `lib.rs` and `client.ts`, then Call, Files
  and Terminal
- **AND** no tab has a close button

### Requirement: The editor shows written, landing, error and busy lines

The editor SHALL mark lines by state:

- **Written:** the lines the assistant wrote this beat: a quiet grey left
  border, until the next action or an edit of those lines.
- **Arriving:** the same lines flash green on arrival, settling over 1.4 s,
  40 ms apart.
- **Landing:** where an open question's block will go: a dashed grey left
  border. On an empty line it shows the ghost text "Your answer lands here",
  `aria-hidden` and not part of the file.
- **Error:** a red line with a wavy underline under the failing token.
- **Busy:** dimmed and read only while an act runs.

Every file SHALL stay editable, except the intro preview and the files the
definition marks read only. Under reduced motion the lines SHALL show at their
resting state with no animation.

#### Scenario: The landing line

- **WHEN** Hello Anchor's first question is open
- **THEN** `lib.rs` line 5 shows "Your answer lands here" with the landing
  border
- **AND** the ghost text is not in the file's content

### Requirement: The file tree opens from the active tab and can dock

The tree toggle or ⌘E SHALL open a 240 px popover under the active tab,
showing the tutorial's files in their folders (`src`, `client`):

- the open file is marked;
- the live step's file carries a dot;
- a file a later step creates is disabled, with "Created in step n".

In the popover, arrows move, Enter opens the file as a tab and closes the
popover, and Esc closes it and returns focus to the toggle. A pin SHALL dock
the tree as a 220 px column left of the editor. The pin is hidden under
1100 px of workspace, and the docked state is saved with the tutorial.

#### Scenario: From client.ts back to lib.rs

- **WHEN** on step 3 the learner opens the tree from `client.ts` and picks
  `lib.rs`
- **THEN** `lib.rs` opens and the popover closes
- **AND** the `client.ts` tab is still one click away

### Requirement: The terminal bar is always on screen

A 28 px terminal bar SHALL stay at the workspace's foot with:

- a status dot: idle, busy, ok or failed;
- the last status text: "Ready", "Build successful · IDL: 1 instruction ·
  hello", "Deploying · <stage>", or in amber "<file> changed since the last
  deploy";
- ⌘J.

Before anything has run, the drawer SHALL read "Nothing run yet. Builds,
deploys and calls print here." A click on the bar or ⌘J SHALL open a drawer, 240 px by default, resizable
from 120 px to 60 % of the workspace. The drawer SHALL open by itself on a
failed build, the first deploy and the first client run, and otherwise stay as
the learner left it.

#### Scenario: The first deploy opens the terminal

- **WHEN** the first deploy of a tutorial lands
- **THEN** the drawer opens with the deploy's log
- **AND** a later deploy does not open it if the learner closed it

### Requirement: The Call panel is built from the deployed IDL

The Call button SHALL open the Call panel over the editor area. The panel
holds a Form | IDL switch:

- **Form:**
  - the program's name and id, with Copy and an Explorer link;
  - one card per instruction, with typed fields for its arguments;
  - a primary button "Call <instruction>". Enter in a field calls.
- **IDL:** the deployed IDL's JSON, read only, with a copy button.

The panel SHALL read the IDL of the last deployed build, never the live file.
An argument added by an upgrade SHALL carry a "New" tag on its first view. A
call SHALL be disabled while a required field is empty and while a call runs.
A string field stops at 32 characters.

The latest result SHALL show under the form as the conversation's result
card, and the log SHALL go to the terminal. A result SHALL not post its own
card in the feed: the step's win follows when the call passes a goal. A result
SHALL hide once the IDL's shape changes. Before any deploy there SHALL be no
Call button.

#### Scenario: The upgrade adds a field

- **WHEN** step 4's build and deploy lands
- **THEN** the `hello` card shows `name  string` with "New", and the Call
  button's dot shows once
- **AND** typing `name: String` in `lib.rs` before that upgrade adds no field

### Requirement: Keyboard paths are listed

"Keyboard shortcuts" in the ⋯ menu SHALL list every key:

- ⌘↵ runs the live action, except from the composer;
- ↵ Start or Next;
- 1 2 3 pick;
- H shows the question's hint;
- S skips the question;
- ⌘B the menu;
- ⌘E the files;
- ⌘J the terminal;
- ⌥↑ ⌥↓ the previous and next step.

None of them SHALL fire while focus is in a text field, except ⌘B, ⌘E and
⌘J.

#### Scenario: Typing a digit in the composer

- **WHEN** a question is open and the learner types "1" in the composer
- **THEN** the composer holds "1" and no option is picked
