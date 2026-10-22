# Mobile tutorial flow: clickable prototype

Author: Almaz Zaripov · 10/20/2026 · tickets DES-139 (Full tutorial pass) and DES-122 (The assistant in use)

## Why

A demo for Kat this week: show how someone goes through a tutorial on a phone, from the gallery to the finish, when they can't type code. Per the dev release (Rev 2, F) the editor is read only below 600 px, so on the phone a step is done through the assistant's patch. If Kat approves, the flow becomes the basis for DES-139 and the mobile part of DES-122.

The prototype is not production. It should look and behave as close to the product as possible, and once it's approved, a developer rebuilds the screens and logic.

## Decisions

| Question | Decision |
| --- | --- |
| How a step is done on the phone | The assistant proposes the step's patch, the user applies or rejects it. The code doesn't change without a tap |
| Demo format | A clickable prototype on the design system, opened from a phone by link |
| Where we build it | A separate entry point in `design-system/`, URL `/prototype/tutorial` |
| Step screen | Instructions on top, code below (option A) |
| Where to show the patch | Right on the step screen, with no sheet and no card above the code: the file as an inline diff, the assistant's sentence in the status line of the bottom zone, line notes behind dots. First there was a sheet, then a card above the code, and both were dropped: the sheet duplicated the file, the card made the top heavy. Decision based on the research in research/2026-10-20-ai-code-in-learning.md |
| Finish | A separate screen |
| Error branch | Scripted: the first step 1 patch is incomplete |

## Scope

In: 9 screens of the main chain, "Continue where you left off", undoing a patch.

Postponed to the next iteration: the hint ladder (Hint 1 of 3), the assistant being unavailable or out of quota, streaming an answer with a Stop button. Also out: backend, real build and deploy, free chat with the assistant, light theme, tablet.

## Flow

```
Gallery ─► Overview ─► Step ─► Patch ─► Check ─► Passed ─► next step ... ─► Finish
                                      │
                                      └─► Failed ─► Explain ─► Fix patch ─► Check
```

There are two ways from the gallery to the overview: the tutorial card and the "Continue" card. "Passed" and "Failed" both have "Undo", which returns the code to its state before the patch and clears the step's mark.

## Screens

### 1. Gallery
Option A, inspired by the Discover page in Claude (Connectors and Plugins). We took the header with tabs next to the heading, the filter behind a square button, sections with a count and Show all, large cards with an action in the corner, and the green check for completed ones. We didn't take the Add button in the header (there's no such action), the verified badges next to names, or Claude's colors: everything is on DS surfaces and tokens.

Top to bottom:
1. Header "What do you want to build?" and close, as in the current product.
2. Tutorials / Programs tabs, with two 44 px square buttons on the right: search and filter. If there isn't enough room (320 px, large font), the buttons move to their own row and nothing overlaps. Search expands to the full row, with Cancel next to it. Filter opens the Framework menu: All, Anchor, Seahorse, Native. When a filter is on, the button gets a purple dot, and the search field placeholder says "Search Seahorse tutorials". Search looks inside the selected framework, by title, description, level and framework.
3. The Start here banner for Hello Anchor (`StartHereBanner`, done by a separate designer): new, started and completed tutorial in one banner. While someone searches or filters, the banner collapses and results start right under the row.
4. Beginner, Intermediate, Advanced sections. The heading has a count in a pill, and Show all on the right if the section has more than three cards. Show all expands the section in place (chevron down, then Show less), so there's no right arrow. In search all matches are shown.
5. Card: 56 px cover, title up to two lines, the tutorial's real description up to two lines, and below that "by author · N parts". Descriptions and authors come from `client/public/tutorials/<slug>/data.json`, the number of parts from the files in `pages`. The three hello tutorials have no data.json, so their descriptions come from upstream's `client/src/tutorials/<slug>/<slug>.ts`. Only Hello Anchor has minutes: "by acheron · 10 min · 4 steps"; nobody has timed the others. The metadata is in `ui/catalog.ts`.
6. In the top right corner of the card is a 36 px square (44 hit area): Play for new, "2 of 4" for started, a green check on a green backing for completed. The button has its own screen reader name ("Start Hello Anchor", "Continue Hello Anchor, 2 of 4 steps passed"). The whole card opens the tutorial overview. Only Hello Anchor is clickable; the rest show the toast "Only Hello Anchor is in this prototype" on tap.
7. On a narrow card (under 18rem, i.e. 320 px or a large font) the description and meta drop below the cover and title at full width, otherwise the text column is three words wide.
8. All covers are in the same frame: rounded corners, a thin line over the image (so white covers don't blend into the edge), the image filling the whole frame. Size in px, not rem: a large font needs room for text, not for the image.

On desktop it's the same: the heading and tabs in one row, a 256 px search and the filter button on the right, and on a narrow window they move to their own row. Cards are always in two columns, four per section before Show all.

### 2. Tutorial overview
The header only has "‹" back: the large heading below names the screen. The cover is to the left of the title, and under the title is one line of meta: "Beginner · Anchor · 10 min · by acheron". Below that, the goal in one sentence and, if the tutorial has been started, the same progress bar with the "3 of 4" label as on Continue and on the step. Steps use the `StepRail` pattern from the DS, without numbers or dividers: a vertical line connects the icons, and it's green up to the current step. Passed: green check; current: purple dot with a halo; ahead: empty circle. The icon is centered on the step title line. Passed steps and the current one are tappable and open that step; future ones are disabled. At the bottom is one 56 px main button: "Start", "Continue from step N", or "Start again" after the finish. "Start over" is a quiet button at the end of the list, away from the main one, and asks for confirmation with a dialog: "Start Hello Anchor over? Your N passed steps and the code you applied will be cleared.", buttons "Cancel" and "Start over".

Step 4 is called "Test UI" in the original tutorial; in the prototype it's renamed "Name argument" so the title matches the task.

### 3. Step
Top to bottom:
1. A one row header: back to the overview, progress bar, close. The tutorial title was removed from here: on a small phone the row given to code is two or three lines of code, and the title is one tap away, in the overview.
2. Progress as one solid bar (`ObjectiveMeter` from the DS, the product gradient), filled by the share of passed steps, with "1 of 4" on the right.
3. The line "Step 1 of 4 · Program", as on desktop, with an outlined chip "Read the lesson · 1 min" on the right (36 px, 44 hit area). If the row is narrow (320 px or a large font), the chip shrinks to the book icon and "1 min". Under the row is the task, no longer than two lines. Reading time is computed from the lesson text, 200 words per minute. The lesson opens in a sheet, and the code under it doesn't move.
4. The `lib.rs` and "Output" tabs. Output, not Build: it holds the build, the deploy and the client run.
5. The code is read only. The places the patch will touch are highlighted.
6. The bottom zone (inspired by Mimo): the step status line, with 56 px tall buttons under it. Details in "Bottom zone".

The main button depends on the step, see "Scenario". We remove the back and forward arrows from the current panel: you move between steps by tapping the bar (it's split into equal invisible zones per step, only reached ones are open) and through the overview. The "I'm stuck" button is replaced by "Ask", which opens Explain in a sheet and doesn't switch to the Chat tab. The user doesn't see the system prompt.

### 4. Step patch
Tapping "Write with assistant" switches the step screen into suggestion mode. Nothing appears above the code. The file is shown as an inline diff: additions in green, removals in red and struck through. Lines the assistant explains have a purple dot in the margin; tapping the line expands a note of 1 or 2 sentences right under it. On the right of the tab row, "Show notes" / "Hide notes" expands or hides all notes at once. The status line of the bottom zone has one sentence in one color: what the assistant changes (typed out), and after the question, the feedback instead. There are no "how to use this" hints in the status: on the first suggestion of a session the first note expands on its own, which shows that the dots are tappable. Buttons "Don't apply" and "Apply and build" ("Apply and run" on the client step). Don't apply returns the code to how it was. Apply applies the patch and starts the check right away. If the button row is narrow, Don't apply becomes a square with an X (the screen reader name stays), the main button takes the rest, and a long label wraps to a second line instead of an ellipsis. The patch and the fix are always viewed in the file tab: Write with assistant and Review the fix switch to it on their own. The suggestion never appears on its own when you enter a step.

**A question before the reveal (only steps with a new idea: 1 and 4).** Before the diff, the bottom zone shows the label "Quick check" (no icon: it's the lesson asking, not the assistant), a 17 px question, for example "Where does the hello instruction go?", three options and "Skip and show the code". The options are in regular type with code in chips, the same length and shape, so the right one can't be guessed by its look: "Inside the `#[program]` module" / "Inside the `Hello` struct" / "Inside `declare_id!`"; the places in the code the change will touch are highlighted. After an answer the verdict shows in place, on the options themselves: the correct one green with a check, a wrong pick amber, the rest dimmer, and a sentence under them. The code appears on the "Show the code" button, with the note on the line the question was about already expanded. On a small screen the question area doesn't push the screen, it scrolls. The status line shows the same sentence instead of the assistant's: for a right answer "Right." and why, with a green check; for a wrong one "Not quite." and the right answer stated plainly, with an amber light bulb (a hint, not an error). The verdict in the status lives only with the patch it was answered for: after Don't apply or a rollback the assistant speaks again, and the old "Not quite" doesn't come back. You can't change your answer and don't need to: the point of the question is to think before the reveal, not to guess. The assistant icon, until Sole has its own mark (DES-134): an eight ray star from the center, stroke 2 (Almaz's call, 10/21/2026, replacing the chat bubble). 20 px next to the "Assistant" label. The same mark is on the Ask button, in purple. The question is asked once per step, and not for the fix after an error. Rationale: Lead-and-Reveal from Kazemitabaar et al. 2025 brings perceived and actual skill in line; it nearly doubles the time per step, so it's only on steps with a new idea.

### 5. Check in progress
The code already has the changes. The main button is disabled and says what's happening: "Building...", "Running..." or "Deploying...". The status line above it gives the detail: "Compiling hello_anchor on the build server" or the deploy stage "Writing buffer (1/3)", as in the Deploy and interact spec. A build takes 2 to 3 seconds.

### 6. Passed
There's no separate sheet. The status line turns green with a check circle and one sentence about what was checked, for example "The build passed and the interface shows a hello instruction". On steps that produce a result rather than change code (deploy, client run and the call with a name), after success the step opens the Output tab on its own: that's where the program id or the transaction is, the main result of the step. After the client and the call, the log has the transaction logs, and the line written by `msg!` ("Program log: Hello, World!", with the name on step 4) is highlighted purple, with the caption "↳ from msg! · src/lib.rs:10" under it. Tapping the caption opens a read only peek of `lib.rs` with that line, the same as on desktop. Under the log is a transaction receipt instead of a bare caption (details in the desktop spec, section 11): on a narrow card (320 px or a large font) each row's label sits above its value, keys don't break in the middle, and Copy and Explorer stay icons in 44 px squares. Receipt rows print one at a time when the transaction arrives. The log and the receipt scroll together, and the receipt doesn't squeeze the log. On a pass the status icon draws itself (circle, then check), and the step's segment in the bar catches a short glint; with reduced motion everything appears at once. The bottom zone has no small links: actions on the code and the log live in the tab row, next to what they act on. The main button turns green: "Next: Build & Deploy →", or "Finish tutorial →" on the last step. The progress bar fills.

### 7. Failed
There's no separate sheet. The error line is highlighted red in the code, and the status line is red with the reason in plain words. Buttons: "Ask" on the left and the main "Explain the error". Once the sheet has explained the error, the main button becomes "Review the fix", as on desktop. "Try again" was removed: it rebuilt the same code and got the same error, which is a dead end for learning. Rollback is through "Undo the patch" in the tab row. In Output on the phone, log lines don't wrap (so a key doesn't lose its last character to a new line), except the `error[...]` line: it wraps in full, because it has to be read.

### 8. Explain
A sheet at roughly 80% of the height: it's a conversation and needs its own space. In error mode the top has a quote of the error line, below it an explanation in 2 or 3 sentences, and the chips "Why is this needed", "Show in docs", "Ask something else". The chips lead to canned answers, and "Ask something else" opens an input field that doesn't send. Buttons "Close" and "Review the fix". After a chip the sheet scrolls to the question on its own and follows the answer while it types out. Error questions also show in the step sheet if the step's build has already failed (`failedOnce`; the planned step 1 error counts too). The "Ask something else" field answers "Free chat isn't connected in this prototype. Try a suggestion." The fix is shown the same way as the step patch: in the code, as an inline diff, with "Don't apply" and "Apply and build". Don't apply on the fix returns to the "failed" state. From "Ask" on the step screen the sheet explains the task itself, with no fix, and a "Got it" button.

### 9. Finish
A separate screen without the bottom panel; with the receipt it already scrolls. The achievement (the Anchor mark in a ring of the brand gradient) appears once with a soft glow on the `ease-pop` curve from the DS, about 440 ms; with reduced motion it just appears. The screen heading is what the program said: `Hello, Almaz!` in monospace, with "from transaction 3vZp8L…qPzLyM" under it; without a name (old progress) `Hello, World!`. Below that, the line "Tutorial complete. Your program is live on devnet." Under the stats, "Your last transaction" as a printed receipt with a torn edge and "Copy as text"; at 320 with a large font the receipt rows stack. The achievement name "First Anchor program" is in the badge's screen reader label; on screen the badge itself shows it. The stats are one card with three columns separated by thin lines: 22 px numbers and small labels, "4/4 steps", "3/4 first try", "N min to finish". The "What you learned" list by step in the secondary color with green checks. A separate "Up next" section: the next tutorial's card (Counter PDA) is tappable as a whole, with a play ring, like Continue in the gallery. At the end, a 56 px secondary "Back to tutorials" button.

### Step screen details
- An empty file before the first patch shows the line "The assistant will write this step here." under the code. It wraps: at 320 with a large font it ran off the edge and caused horizontal scroll.
- On a small screen a patch or fix opens scrolled to the first changed line, which sits at a third of the height (the step 1 fix from line 14, step 4 from line 9).
- After Apply the added lines are lightly highlighted green during the check and in the result, until the next action: you can see exactly what's being checked.
- The "Read the lesson" chip is outlined so it doesn't repeat the active tab's backing next to it.
- All assistant, note, lesson and feedback text shows code in chips: in the data, code is marked with backticks.
- The Explain sheet fits its content (no taller than 82%), chips are 44 px.

### Undoing a patch
The button with the ↶ icon sits on the right of the tab row, next to the code it rolls back and far from the main button. 44 px hit area. It shows only after a failed build: after a pass there's nothing to roll back. If it rolls back the assistant's patch or fix, it's "Undo the patch"; if it's your own code, "Restore my code". On a narrow row, "Undo" and "Restore". It returns the files to their state before the step started (undoing both the step patch and the fix), clears the step's mark and opens the file tab. A toast "Patch undone" or "File restored" for 4 seconds.

### Continue where you left off
Progress is stored in the browser. After a reload the gallery shows the "Continue" card, the overview marks passed steps, and the button goes to the current step.

### Bottom zone
On a short screen (under 44rem tall: 320×640 at any font size, 390×844 at 130%) the status is one line, and a chevron on the right expands the rest. Every new status starts collapsed again. On taller screens the full line shows.

Why not a square with a check, like Mimo: in Mimo each screen has one action, "check", so an unlabeled icon is learned right away. Ours changes from step to step (write the step, deploy, run the client), and deploying is an action with consequences, so the main button is always labeled with a verb. From Mimo we took the large zone, the status inside it, and a button that doubles as an indicator: "Deploy to devnet", then "Deploying...", then the green "Next: Client →". The "Done when …" line lives in the status while the step waits, so it isn't in the header. Every signal is shown once: the status icon (dashed circle, spinner, check, "!") is only in the status line, and the button carries the action and the color, with no spinner or check of its own.

### Deliberate decisions

- **The assistant's model isn't named in the tutorial.** Sheet headers say only "Assistant". The model ("· Claude", "· Codex") is shown only if the user connected their own (DES-138): then it changes the answers and limits. This conflicts with the requirement in The assistant across the IDE spec, "Every AI surface shows which model it uses", and needs to be agreed with Nikita.
- **On the phone the assistant writes the code, not the user.** Reasons: per release Rev 2 (F) the editor is already read only below 600 px; the Mobile without code spec says outright that typing Rust on a phone is awkward and unnecessary. Learning rests on the lesson, the diff with explanations, the Apply or Discard decision, and Explain on error. Risk: someone finishes the tutorial without writing a single line. What the prototype does: on the right of the tab row, while the step waits for a patch, there's "Write it yourself" ("Type it" on a narrow row). It opens the "Write it yourself on a computer" sheet with a link to this same step. The link is shown in full and wraps after a slash. "Copy link" becomes "Copied" with a check for two seconds, and next to it is "Share" through `navigator.share`, where available, to send the link to your computer. The sheet body scrolls, and the "Stay on the phone" footer stays put. The line "Your progress comes with you" requires GitHub sign in in the product (history per DES-119 and DES-138). Later, as a separate task: controls for key values from the Mobile without code spec and Mimo style "fill in the missing part" steps.
- The step header has two buttons: "‹" goes to the tutorial overview, "✕" closes the tutorial and returns to the gallery. Both are kept on purpose, with the progress bar between them.
- Toasts on the phone come out under the screen header, not over the back and close buttons.
- In the program id card at narrow widths, Copy and Explorer stay icons, but each in a 44 px square, and the label sits above the key. The transaction is shown by the receipt, see section 6.
- In the gallery, the Tutorials / Programs tabs, the search field and the search button are pills (fully rounded), even though `Segmented` and `Input` have radius `lg` in the DS. This is a deliberate deviation; regular buttons keep the `control` radius (8 px).

## Hello Anchor scenario

Steps and check conditions are taken from `client-v2/src/views/flow/lessons/paths/hello-anchor.ts`, the code from `tutorials/hello-anchor`.

| Step | Task | Main button | What happens | Check |
| --- | --- | --- | --- | --- |
| 1 Program | Define the hello instruction and log a message | Write with assistant | The first patch lacks `#[derive(Accounts)] pub struct Hello {}`. The build fails. Explain offers a 2 line fix, and after it the build passes | the built interface shows a hello instruction |
| 2 Build & Deploy | Deploy the program to devnet | Deploy to devnet | No patch. Deploy through Kora with 0 SOL. Result: program id, an Explorer link, a note about 7 days | the program is live on devnet |
| 3 Client | Call the instruction from the TypeScript client | Write with assistant | A patch to `client/client.ts`; after Apply the client runs, and the Output tab shows the transaction logs with "Hello, World!" and the receipt | the client log is received (in the product this is currently a "read" step, see questions) |
| 4 Name argument | Give hello a name argument and log it | Write with assistant, Call hello after the build | The patch adds a `name: String` argument and logs it. The build passes, but the step still waits: above the buttons in the bottom zone there's a "Your name" field (up to 32 characters, any text works), the main button is "Call hello", and Go on the keyboard does the same. After the call, Output with "Program log: Hello, Almaz!" and the receipt | hello says your name back |

Scenario result: 4 of 4 steps on the first try; the planned step 1 error doesn't spoil the first try (`failedOnce` is separate from `firstTry`). An error in your own code on desktop does count.

## How the prototype is built

- Entry point `design-system/prototype/tutorial`, a separate Vite HTML page next to the main DS page.
- Only components from `design-system/src/components/ui` and the `tokens.css` tokens, dark theme (`dark` on `html`). The main ones: `diff`, `sheet`, `drawer`, `objective-band`, `step-rail`, `stepper`, `code-block`, `message`, `composer`, `achievement`, `button`, `tabs`, `sonner`. If a component is missing, I build it from these same parts and note it in the spec for development.
- Copy in English, as in the product.
- States are driven by one scenario (a state machine per step). The build and the assistant's answers are simulated with a pause and typed out text.
- Progress in `localStorage`, with a fallback when it isn't available.
- Up to 600 px wide the prototype is full screen; on desktop it's centered in a phone frame.

## Testing

I go through the whole scenario by hand in the browser at 320, 390 and 430 px and on desktop in the frame. I check: undo on "Passed" and "Failed", a reload mid tutorial, a repeated "Try again", closing sheets with a swipe and a tap outside. Text contrast to WCAG AA, tap targets no smaller than 44 px.

## Showing it to the client

A separate project on Vercel in the hoodies account. Access through basic auth in edge middleware, the password in the project environment variables, `X-Robots-Tag: noindex` on every response through environment settings, not in code. After a deploy I check the root, a deep path, a static file and a 404 with anonymous requests. Deploy only after Almaz's ok.

## Metrics

For the demo: Kat goes through the whole scenario on a phone without hints. For the product, from the Q4 plan: 7 of 8 participants finish Hello Anchor in the second usability test, and it takes under 5 minutes from start to the first green build. For mobile I add: the share of assistant patches applied out of those proposed, and the share of steps passed on the first try.

## Open questions

1. In the product step 3 is checked with a "read" mark. In the prototype the check is on the client log. Whether the product needs this kind of check, we decide with development (Slava).
2. Which changes the assistant can apply right away, and which only after the diff is reviewed (an open question from the Mobile without code spec).
3. Where "Show in docs" leads: to the lesson page or to the external Anchor docs.
4. How to show the assistant limit in the tutorial. Postponed together with states C, D, E.
