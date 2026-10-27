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
card and the workspace showing the finished program, read only. The intro
card SHALL show:

- the thumbnail, the name and the meta line (level, framework, minutes,
  authors);
- the lead text;
- one row per step with its number, title and objective;
- a primary "Start" button with its ↵ key cap, and a ghost "Ask me anything
  first" that focuses the composer.

Enter SHALL start when no text field has focus. On Start, the intro SHALL
become its one-line record and the first step's divider SHALL appear. The
workspace SHALL swap the preview for the step's start files. There SHALL be no
separate About page, Lesson tab or Assistant tab.

#### Scenario: Starting Hello Anchor

- **WHEN** the learner opens Hello Anchor for the first time and presses Enter
- **THEN** the intro collapses to "Hello Anchor · 4 steps · 10 min"
- **AND** the "Step 1 of 4" divider appears and `lib.rs` holds the step's
  start content

### Requirement: Only the latest card acts

Every action the learner takes in a tutorial SHALL sit on the latest card that
asks for it: Start, a question's options, Build, Deploy, Run, Call, Explain
the error and Next. A resolved card SHALL become a record: one line, no
primary button. Navigation links in a record ("Show in lib.rs", "Open Test")
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
the previous and next divider. Under 380 px of chat width the labels SHALL
hide and each segment SHALL keep a tooltip "Step n · <title>". While the live
card is off screen, a "Back to step n" pill SHALL float above the composer,
and a click SHALL scroll to the live card and focus its first control.

#### Scenario: Jumping back from step 3

- **WHEN** the learner is on step 3 and clicks the step bar's first segment
- **THEN** the feed lands on the "Step 1 of 4" divider, `lib.rs` opens at the
  top, segment 1 has `aria-current="location"` and segment 3
  `aria-current="step"`
- **AND** a "Back to step 3" pill shows, and nothing in step 1 can be run
  again

### Requirement: A question writes the code on a right pick

An `ask` beat SHALL render as a question card: `section` labelled by its
question, a "Question" tag ("Fix it" after a planned failure), its place
("1 of 4"), the question, and three option buttons in a group, then "Type it
myself" and "Skip". The card SHALL take focus on arrival without scrolling.
Picking:

- **Keys:** 1, 2 and 3 pick when no text field has focus; ↑ and ↓ move
  between rows; Enter or Space picks the focused row; S skips.
- **Right pick:**
  - the row turns green;
  - the card collapses to its record after 500 ms;
  - the pick is echoed as a pill, and the assistant's line follows;
  - the definition's block is written into the file, with a wrote card in
    the feed.
- **Wrong pick:**
  - the row turns amber, shakes once, becomes `aria-disabled`, and shows its
    reason, linked by `aria-describedby`;
  - focus moves to the next pickable row;
  - after two wrong picks, the last row is outlined, with "That leaves one.
    Pick it and I'll write the code."
- **Skip:** writes the block and records "· skipped".
- **Type it myself:** focuses the editor at the line where the answer lands.
- **Typed by hand:** once the file holds the block (whitespace aside), the
  question resolves "· typed by you" and the assistant says "You beat me to
  it. That's exactly it."

The record SHALL read the right option and its qualifier: "· first try",
"· 2nd try", "· 3rd try", "· typed by you" or "· skipped".

#### Scenario: A wrong pick, then the right one

- **WHEN** on Hello Anchor's first question the learner presses 2, then 1
- **THEN** option 2 shows "`println!` prints to a terminal, and a program on
  Solana has none. On chain, a program talks through `msg!`."
- **AND** after the right pick, `lib.rs` gains lines 5 to 13, the wrote card
  reads "src/lib.rs · lines 5 to 13 · +9", and the record ends "· 2nd try"

### Requirement: The wrote card and the editor show what the assistant wrote

A write SHALL post a wrote card. The card is a button with
`aria-label="Show lines <a> to <b> in <file>"`, holding the path, the range,
the added count and the first three written lines. Pressing it SHALL open the
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
- **THEN** the card shows the deploy's stages in order with "1 of 3" to
  "3 of 3"
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

- a drawn check, the tag "Step n done", the headline and line from the
  definition;
- three stat pills, whose values come from the real result (build time,
  compute units, confirmation time, the step's own time);
- a primary "Next: <next step> ↵" and the definition's optional outline link.

At the same moment the step bar segment SHALL turn done, the hairline SHALL
grow, and the divider SHALL get its check and time. Enter SHALL go Next while
the win is live. The last step's win SHALL have no Next. The finish card SHALL
follow 400 ms later with:

- the headline and line;
- the receipt of the last call;
- "What you learned";
- the time from Start to the finish;
- "Next: <tutorial>", "Copy receipt", "See summary" and "Back to tutorials".

#### Scenario: Finishing Hello Anchor

- **WHEN** step 4's call lands with the name "Alex"
- **THEN** the win reads "hello knows your name." with no Next
- **AND** the finish card follows with the receipt whose log reads "Program
  log: Hello, Alex!"

### Requirement: One composer; free questions go to the live assistant

The chat column SHALL have one composer at its foot, never disabled; Enter
sends and Shift+Enter breaks the line. Above it, a chips row SHALL show the
step's chips, then "Explain this step", with "I'm stuck" always last. Chips
that do not fit fold into "More". There are no chips while an act runs or a
win is live. A chip already asked in a step is not offered again. What the
composer does with a message, in this order:

1. A message that is only a live action's word ("build", "deploy", "run",
   "call", "send", "next", "explain", alone or with "please") SHALL run that
   action and be echoed as a pill.
2. A chip, or a message that matches a chip's label or a step's scripted
   match, SHALL get the definition's answer.
3. "I'm stuck" SHALL get the live question's hint plus "Or press Skip and
   I'll write it.". On a failed build it gets "Press Explain the error and
   I'll walk you through it.". Otherwise it gets the step's "Explain this
   step".
4. Anything else SHALL go to the product's assistant, with the tutorial, the
   step, its objective, the open files and the last result as its context.
   Its answer SHALL post in the feed as the assistant's turn.

In a tutorial the assistant SHALL not write files, build, deploy or send
transactions. A change it proposes SHALL post as a card with the changed
line's diff and two outline buttons, "Apply to <file>" and "Keep it". Applying
SHALL write the line with a wrote card. A deployed file changed this way SHALL
get the redeploy nudge of `tutorial-runs`. The feed SHALL be `role="log"` with
`aria-live="polite"`.

#### Scenario: A scripted chip and a free question

- **WHEN** in step 1 the learner presses "What does msg! do?", then types
  "how is this different from Ethereum?"
- **THEN** the first gets the definition's answer with no model call
- **AND** the second is answered by the assistant in the feed, and no file
  changes

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
- the open tab, the docked tree, whether the terminal is open, and the Test
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
- **AND** `client.ts`, the Test tab and the terminal state are as they were

### Requirement: The conversation is measured

The tutorial slice SHALL emit:

- `tutorial_started` on Start, with:
  - `tutorial`: the slug;
  - `resumed`: `false` (a returning learner does not fire it again).
- `tutorial_question_answered` when a question resolves, with:
  - `tutorial`;
  - `question`: the beat id;
  - `result`: `first_try`, `retry`, `typed`, `skipped` or `test`;
  - `attempts`: 1 to 3.
- `tutorial_step_passed` when a step's goal passes, with:
  - `tutorial`;
  - `step`: 1 to 6;
  - `via`: `chat`, `client`, `test` or `typed`;
  - `seconds`: the step's time.
- `tutorial_finished` when the finish card shows, with:
  - `tutorial`;
  - `seconds`: the time from Start.
- `tutorial_question_asked` when a composer message goes to the live
  assistant, with:
  - `tutorial`;
  - `step`;
  - `source`: `typed` or `chip`.

The text of the question is never sent.

#### Scenario: Counting a retry

- **WHEN** the learner picks a wrong option, then the right one
- **THEN** one `tutorial_question_answered` reaches the memory provider with
  `result: "retry"` and `attempts: 2`
