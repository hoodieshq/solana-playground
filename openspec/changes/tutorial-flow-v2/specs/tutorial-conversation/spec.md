# Spec Delta

## Purpose

The lesson as one conversation: the chat column a conversation tutorial opens
in, its cards, the step bar, the composer, and how the lesson's scripted turns
and the live assistant share one thread. Visual values (sizes, tokens, motion)
follow Almaz's `SPEC.md` sections 6 and 12; the requirements below are the
behaviour.

## ADDED Requirements

### Requirement: A tutorial opens on its intro card

Opening a conversation tutorial SHALL show its chat column with one intro
card, and the workspace SHALL show the finished program, read only. The intro
card SHALL show:

- the thumbnail, the name and the meta line;
- "What you'll build": the definition's promise line, with the log line the
  finished program prints;
- "How it goes": the four-beat loop "I explain a piece, you pick an answer, I
  write the code, you build and run it";
- one primary button "Start step 1".

The words "start", "begin" or "go" typed in the composer SHALL start as well.
On Start the intro SHALL leave the feed, and the first step's divider SHALL
appear. The workspace SHALL swap the preview for the step's start files.
There SHALL be no separate About page, Lesson tab or Assistant tab.

#### Scenario: Starting Hello Anchor

- **WHEN** the learner opens Hello Anchor for the first time and presses
  "Start step 1"
- **THEN** the intro leaves the feed and the "Step 1 of 4" divider appears
- **AND** `lib.rs` holds the step's start content

### Requirement: Only the latest card acts

Every action the learner takes in a tutorial SHALL sit on the latest card that
asks for it: Start, a question's options, Build, Deploy, Run, Call, Explain
the error and Next. A resolved card SHALL become a record: one line, no
primary button. Navigation links in a record ("Show in lib.rs", "Open Call")
SHALL stay live. The ring and the shadow SHALL mark at most one card on screen:
the live question, the live win or the finish. A click that speaks for the
learner (a right pick, "Explain the error", a chip) SHALL be echoed as the
learner's pill. Build, Deploy, Run, Call, Send and Next SHALL not be echoed.

#### Scenario: Records keep no buttons

- **WHEN** step 1 has passed and the learner scrolls back to it
- **THEN** its act cards read "Built in <n> s" with no button
- **AND** its wrote card's "Show in lib.rs" opens the lines

### Requirement: Each step opens with a divider and the step bar jumps to it

Each step SHALL open with a divider in the feed. The divider reads the kicker
"Step n of m", the title and the objective; once the step has passed, it also
shows a check and the step's time. A step bar SHALL sit under the chat head:
`nav` with `aria-label="Tutorial steps"`, one button per step labelled with
the step's short label, and a progress hairline on its bottom edge. The
segments' states:

- not reached: disabled;
- current: `aria-current="step"`;
- done: a check;
- viewing (the feed is scrolled into another step): `aria-current="location"`.

A click on a done or current segment SHALL scroll its divider to 12 px under
the bar and flash it once. It SHALL open that step's main file in the
workspace, scrolled to the top, and reset nothing. ⌥↑ and ⌥↓ SHALL move to
the previous and next divider, up to the live step. A segment lights when its
step is entered. Each segment's `aria-label` reads "Step n of m, <title>,
done" or "…, current". Under 24rem of chat width, the bar SHALL become one
button, "Step n of m · <short label>", that opens a menu of the steps marked
Done and Now.

While the live card is off screen, a pill SHALL float above the composer. It
reads "Back to step n", or "Back to the start" before Start, with an arrow
toward the card. A click SHALL scroll to the live card and focus its first
control. After the finish there SHALL be no pill.

#### Scenario: Jumping back from step 3

- **WHEN** the learner is on step 3 and clicks the step bar's first segment
- **THEN** the feed lands on the "Step 1 of 4" divider, `lib.rs` opens at the
  top, segment 1 has `aria-current="location"` and segment 3
  `aria-current="step"`
- **AND** a "Back to step 3" pill shows, and nothing in step 1 can be run
  again

### Requirement: A question writes the code on a right pick

An `ask` beat SHALL render as a question card: a `section` labelled by its
question, holding the question, three option buttons in a group, and the foot
buttons "Hint", "Type it myself" and "Skip". The card SHALL take focus on
arrival without scrolling.

Keys, when no text field has focus:

- 1, 2 and 3 pick an option;
- ↑ and ↓ move between rows;
- Enter or Space picks the focused row;
- H shows the hint;
- S skips.

Outcomes:

- **Right pick:**
  - the row turns green;
  - the card collapses to its record after 500 ms;
  - the pick is echoed as a pill, and the assistant's line follows;
  - the definition's block is written into the file, with a wrote card in
    the feed.
- **Wrong pick:**
  - the row turns red, shakes once, and becomes `aria-disabled`;
  - it shows "Not quite." and its reason, linked by `aria-describedby`;
  - focus moves to the next pickable row;
  - after two wrong picks, the last row is outlined.
- **Hint:** echoes "I'm stuck" as a pill and posts the hint once. The hint
  is the definition's text, so it works with no model connected. "I'm stuck"
  typed in the composer posts the same hint (see the composer's tools).
- **Skip:** writes the block and records "· skipped".
- **Type it myself:** focuses the editor at the line where the answer lands.
- **Typed by hand:**
  - once the file holds the question's key line, the question resolves
    "· typed by you";
  - the assistant writes the rest of the block and says so;
  - typing the whole block resolves it the same way.

The record SHALL read the right option and its qualifier: "· first try",
"· 2nd try", "· 3rd try", "· typed by you" or "· skipped". A click on it
SHALL expand the three rows in their final states, with their reasons.

#### Scenario: A wrong pick, then the right one

- **WHEN** on Hello Anchor's first question the learner presses 2, then 1
- **THEN** option 2 shows "Not quite." and "`println!` prints to a terminal,
  and a program on Solana has none. On chain, a program talks through `msg!`."
- **AND** after the right pick, `lib.rs` gains lines 5 to 13, the wrote card
  reads "src/lib.rs · lines 5 to 13", and the record ends "· 2nd try"

### Requirement: The wrote card and the editor show what the assistant wrote

A write SHALL post a wrote card. The card is a button with
`aria-label="Show lines <a> to <b> in <file>"`, holding the path, the range
("line n" for one line) and the first three written lines. Pressing it SHALL open the
file's tab and scroll the first line to a third of the editor's height, then
light the lines again. A write that creates a file SHALL show "Created
<path>" with a "New file" tag. A block that cannot land in place (the learner
changed the code around it) SHALL be appended at the end. Its card then reads
"I put it at the end: your own lines are kept." and offers "Reset <file> to
this step's start".

#### Scenario: Created client.ts

- **WHEN** Hello Anchor's step 3 starts
- **THEN** a wrote card reads "Created client/client.ts"
- **AND** the workspace opens the `client.ts` tab

### Requirement: Act cards run one thing and show its stages

An `act` beat SHALL render as an act card with an icon tile, a title, a
context line and a primary button carrying ⌘↵. While the act runs:

- the button SHALL give way to a spinner, the stage label and "n of m";
- a bar on the card's bottom edge SHALL grow per stage;
- every other act and every question row SHALL be disabled, and the composer
  SHALL stay usable.

A call act with arguments SHALL show one field per argument and keep its
button disabled while a required field is empty; a string field stops at 32
characters, and Enter sends. When the act ends, the card SHALL become its
record and a result card SHALL follow. A deploy act SHALL read "Build and
deploy" and build first when the main file changed since the last build.

#### Scenario: Deploy stages

- **WHEN** the learner presses ⌘↵ on "Deploy to devnet"
- **THEN** the card shows the deploy's stages in order with "1 of 4" to
  "4 of 4"
- **AND** a result card follows when the deploy lands or fails

### Requirement: A failed build explains itself

A failed build SHALL post a red result card with the error code and the line,
the compiler line, and the location as a link. The link jumps to the line in
the editor and lights it on hover. The card SHALL offer a primary "Explain the
error ⌘↵" and a ghost "I'll fix it myself".

For a failure the definition plans:

- the card SHALL carry the definition's line;
- Explain SHALL post the definition's explanation with the error line quoted,
  then its fixing question;
- "I'll fix it myself" SHALL focus the editor where the fix lands and still
  post the fixing question, which a passing build resolves as "typed by you".

For a failure the definition does not plan:

- Explain SHALL ask the live assistant about this error with the build log;
- after its answer, a "Show me the fix" outline button SHALL write the step's
  target lines.

#### Scenario: The planned E0412

- **WHEN** the learner builds Hello Anchor after the first question
- **THEN** the card reads "Build failed" with "E0412 · line 9", `lib.rs` line 9
  is marked red, and the terminal opens
- **AND** Explain posts the explanation with line 9 quoted, then the "Fix it ·
  2 of 4" question

### Requirement: Each step ends on a win card

A step's goal (see `tutorial-runs`) passing SHALL post the step's win card:

- a drawn check, the tag "Step n done", and the headline and line from the
  definition;
- a primary "Next: <next step>";
- on the desktop, an outline "Open Call" once the program is deployed, or
  "Write it in client.ts" when the step passed from the Call panel.

At the same moment the step bar segment SHALL turn done and the divider SHALL
get its check and time. Enter SHALL go Next while the win is live. The last
step's win SHALL have no Next. The finish card SHALL follow 400 ms later with:

- the headline and line;
- a collapsed "Transaction details" row holding the last call's receipt, with
  Copy receipt as an icon button on the row;
- "What you learned";
- the meta line "<n> steps · <time> · devnet only, nothing real spent";
- a primary "Next: <tutorial>" and "All tutorials", and no "See summary".

Neither the win card nor the finish card SHALL show stat pills, and the
definition SHALL carry none.

#### Scenario: Finishing Hello Anchor

- **WHEN** step 4's call lands with the name "Alex"
- **THEN** the win reads "hello knows your name." with no Next
- **AND** the finish card follows with the receipt whose log reads "Program
  log: Hello, Alex!"

### Requirement: One composer; free questions go to the live assistant

The chat column SHALL have one composer at its foot, never disabled. Enter
sends and Shift+Enter breaks the line. ⌘↵ in the composer SHALL do nothing.
The placeholder SHALL follow the moment: "Ask about this step", "Ask while it
builds" while an act runs, and "Ask anything" after the finish. During the
lesson there SHALL be no chips row. After the finish, the definition's finish
chips SHALL show above the composer. What the composer does with a message,
in this order:

1. A message that is only a live action's word ("build", "deploy", "run",
   "call", "next", "explain", alone or with "please") SHALL run that action
   and be echoed as a pill. While a question is open, the answer is instead
   "Pick an answer above first, or press Skip. Then the button's yours."
2. A finish chip SHALL get the definition's answer, with no model call.
3. Anything else SHALL go to the product's assistant, with the tutorial, the
   step, its objective, the open files, the last result and the tutorial's
   doc list as its context. Its answer SHALL post in the feed as the
   assistant's turn. With no model connected, the message SHALL route to
   connecting a model.

There SHALL be no scripted answers matched from typed text: the assistant
answers every free message. What does something in the interface SHALL be one
of four tools the assistant calls in a tutorial, never canned text:

- **Open the menu** ("show me the menu"): opens the navigation overlay.
- **Hint** ("I'm stuck"): posts the live question's hint.
- **Skip** ("do it for me"): skips the live question, as its Skip button
  does.
- **Propose a change** ("change what hello says"): posts the apply card below.

In a tutorial the assistant SHALL not write files, build, deploy or send
transactions; Skip writes the lesson's own block, as the button would. A
change it proposes SHALL post as a card with the changed line's diff and two
outline buttons, "Apply to <file>" and "Keep it". It SHALL never apply by
itself. Applying SHALL write the line with a wrote card. A deployed file
changed this way SHALL get the redeploy nudge of `tutorial-runs`. The
assistant MAY link one of the tutorial's doc pages in its answer (see
`tutorial-workspace`). The feed SHALL be `role="log"` with
`aria-live="polite"`.

#### Scenario: A free question

- **WHEN** in step 1 the learner types "what does declare_id do?"
- **THEN** the assistant answers in the feed, and no file changes

#### Scenario: Typed "I'm stuck"

- **WHEN** a question is open and the learner types "I'm stuck"
- **THEN** the assistant calls its Hint tool and the question's hint posts
- **AND** the question stays open

#### Scenario: Change what hello says

- **WHEN** after the finish the learner asks to make hello say "Once upon a
  time on devnet"
- **THEN** a card shows line 10's diff with "Apply to lib.rs"
- **AND** applying it posts a wrote card and the nudge "You changed lib.rs
  after deploying. Devnet still runs the old version." with "Build and deploy"

### Requirement: The lesson and the assistant share one thread

The feed SHALL show the lesson's scripted turns and the assistant exchanges
of that tutorial's workspace in one order, by time. Progress SHALL be saved
in the workspace's `.workspace/tutorial-storage.json`:

- the step;
- the resolved state of every beat;
- the picks;
- the results with their signatures and program id;
- the open tab, the docked tree, whether the terminal is open, and the Call
  form's values.

Project sync SHALL carry it to another device. The assistant exchanges SHALL
live in the assistant's thread for that workspace. A reload SHALL restore the
feed scrolled to the live card, render turns whole with no typing or rise
animation, and restore the files and the workspace state. "Start over" in the
chat head's ⋯ menu SHALL confirm, then return to the intro card and the
preview.

#### Scenario: Reload in step 3

- **WHEN** the learner reloads on step 3 with the question open
- **THEN** the feed opens on that question with every earlier card as its
  record
- **AND** `client.ts`, the Call panel and the terminal state are as they were

### Requirement: The conversation is measured

The tutorial slice SHALL emit:

- `tutorial_started` on Start, with:
  - `tutorial`: the slug;
  - `resumed`: `false` (a returning learner does not fire it again).
- `tutorial_question_answered` when a question resolves, with:
  - `tutorial`;
  - `question`: the beat id;
  - `result`: `first_try`, `retry`, `typed`, `skipped` or `call_panel`;
  - `attempts`: 1 to 3.
- `tutorial_step_passed` when a step's goal passes, with:
  - `tutorial`;
  - `step`: 1 to 6;
  - `via`: `chat`, `client`, `call_panel` or `typed`;
  - `seconds`: the step's time.
- `tutorial_finished` when the finish card shows, with:
  - `tutorial`;
  - `seconds`: the time from Start.
- `tutorial_question_asked` when a composer message goes to the live
  assistant, with:
  - `tutorial`;
  - `step`;
  - `source`: `typed` or `chip` (a finish chip).

The text of the question is never sent.

#### Scenario: Counting a retry

- **WHEN** the learner picks a wrong option, then the right one
- **THEN** one `tutorial_question_answered` reaches the memory provider with
  `result: "retry"` and `attempts: 2`
