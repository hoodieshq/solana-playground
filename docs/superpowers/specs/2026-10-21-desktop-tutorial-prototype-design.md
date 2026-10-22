# Desktop tutorial flow: clickable prototype

Author: Almaz Zaripov · 10/21/2026 · tickets DES-139 (Full tutorial pass) and DES-122 (The assistant in use)

Based on the mobile prototype, spec `2026-10-20-mobile-tutorial-prototype-design.md`. Every decision there applies here too unless stated otherwise below. The discussion mockups are in `Playground/.superpowers/brainstorm/85477-1792567819/content/` (`step-1.html`, `step-2.html`, `screens-v2.html`).

## Why

Show Kat the same Hello Anchor flow on a 1440 screen: from the gallery to the finish, with the check, the error and Explain. On desktop the editor is live, so people can write the code themselves, and the assistant's patch stays as a second path with the same walkthrough as on the phone. Mobile and desktop should read as one product.

The prototype is not production. Once it's approved, a developer rebuilds the screens and logic.

## Decisions

| Question | Decision |
| --- | --- |
| How a step is completed | Both paths. The editor is open, and Build builds whatever was typed by hand. Next to it is Write with assistant: the same patch as on mobile, right in the editor, with notes and Quick check. An error leads to Explain and Review the fix. Mobile stays a special case without the first path |
| Step layout | The product shell: navigation, the editor with the action bar and terminal, and on the right the assistant column, which becomes the lesson column for the duration of the tutorial. Same order as in the product, and the same in the DOM. While a step is open, navigation is collapsed to a 56 px rail at any width (after the usability review on 10/21/2026; the column used to be on the left) |
| Scope | The whole flow: gallery, tutorial page, the step in every state, finish |
| How it's built | Same prototype and URL, shared `data.ts` and `store.tsx`, its own screens in `desktop/`, a Phone and Desktop switcher |

## Scope

In: gallery, tutorial page, step screen (start, patch, Quick check, build, error, Explain, fix, success, deploy, client), finish, undoing a patch, resuming where you left off, the view switcher.

Out: Open on phone (the reverse of Continue on desktop), light theme, contents of the Programs tab, a real chat with a model, backend, real build and deploy, the hint ladder, the assistant limit.

## Flow

```
Gallery → Tutorial page → Step → (writes it themselves | Write with assistant → Patch → Quick check) → Build → Passed → next step ... → Finish
                                                                                     │
                                                                                     └→ Failed → Explain → Review the fix → Build
```

## Shell

- On the left is the product navigation, as in client-v2: Home, New project, Tutorials, Programs, the project list. Below 1280 px it collapses to an icon rail. While a step is open it is a rail at any width: the editor and the lesson need the room. The gallery, the tutorial page and the finish behave as before.
- The menu toggle works like the one in the Gemini sidebar. In the collapsed 56 px rail, the top slot with the logo is the "Open sidebar" button: on hover or keyboard focus the logo fades into a PanelLeft icon, and a tooltip "Open sidebar ⌘B" appears to the right of the slot. In the expanded menu the logo and "Solana Playground" are on the left, and at the end of the same row is a button with the same PanelLeft icon, "Close sidebar", tooltip "Close sidebar ⌘B". The icon is the same in both states, with no arrow: the tooltip and the name say what the button does. The button at the bottom of the rail is gone. ⌘B and Ctrl+B work as before. The expanded menu is 232 px so the title and the button fit on one row. With a mouse the menu pushes the screen over and the choice is remembered (`pg-proto-nav-open`). On a tablet, as in Gemini, the gallery and the tutorial page open with the menu expanded at any width, it pushes the screen over, and the tablet keeps its own choice (`pg-proto-nav-open-tablet`). Tablet means touch (`pointer: coarse`) and the Tablet frame, even on a Mac with a mouse: the frame stands in for a tablet. During a step on a tablet there is nowhere to push: the menu opens over the code with a scrim and closes when you pick an item, tap outside or press Esc. On the next step it is a rail again, and the choice is not saved. On touch the logo doesn't turn into the icon, and tapping it opens the menu right away.
- The lesson column is on the right, with its border on the left. Default width depends on the window: 440 px from 1440, 400 px from 1280, 360 px below that. The left edge can be dragged with the mouse from 280 (as in the product) to 560 px. When focused, the arrow keys move it (larger steps with Shift, Home and End go to the limits), and focus shows as a line and a handle in the middle. A double click or double tap on the edge resets the width to the window default. The chosen width is remembered in `localStorage` (`pg-proto-column-width`), and until someone changes it, it follows the window. The tutorial page lives in the same right column, so Start doesn't flip it to the other side.
- Above the workspace is the project header with its name. There's no Write, Build, Deploy, Interact stepper during the tutorial (Almaz's call, 10/21/2026): the tutorial drives the stages itself, the stepper can't be switched by hand even though it looks like tabs, and progress is already shown in the lesson column, the build in the status line and the terminal. In a regular project the stepper stays as in the product.
- I design for 1440×900 and check on 1280×800.

## Screens

### 1. Gallery
Heading "What do you want to build?". If a tutorial has been started, "Pick up where you left off" is at the top with a card like on mobile: cover, title, "Next: …", a progress bar with "1 of 4", a Play ring. The card is at most 620 px wide. Below that, in one row, the Tutorials and Programs tabs (pills) and a 280 px search field on the right. Search is always open, with no expand animation. Programs switches over and shows the empty state from mobile. Tutorials are in a three column grid: cover, title, "level · framework", status "In progress" or "✓ Completed". No descriptions and no Open button; the whole card is clickable. Only Hello Anchor is clickable, the rest show a toast.

### 2. Tutorial page
Lives in the lesson column, with the project editor already on the right. "← Tutorials" at the top. Cover and title, meta "Beginner · Anchor · 10 min · by acheron", the goal in one sentence, and a progress bar if the tutorial has been started. The step list uses the `StepRail` pattern, as on mobile: passed steps and the current one open on click, future ones wait. At the bottom of the column is the main button "Start", "Continue from step N" or "Start again", and under it a quiet "Start over" with the same confirmation dialog. The editor on the right shows the project code the way it was left, dimmed and read only, with "Start to edit" in the file header, and "Continue to edit" once started. Start and Continue change only the column contents, and the layout doesn't jump.

### 3. Step: start
The lesson column, top to bottom: a progress bar with the number of passed steps ("0 of 4"), an exit ✕ (to the tutorial page); small "Step 1 of 4 · Program"; the step goal at 20 px; the lesson or the "Read the lesson · N min" chip. There's no Your task card: the step state is shown in one place, the action bar. At the bottom of the column is a one line "Ask about this step" field, which expands into the full composer on focus or when it has text. Above the field the chips sit in one row: whatever doesn't fit the width waits until the questions ahead of it are asked. Until the step's first error the chips are about the lesson ("What is a Context?", "What does msg! do?"), followed by "Explain this step". Chips about `#[derive(Accounts)]` ("Why does hello need a struct?", "Where is this in the docs?") appear only after the step's first failed build (the planned one on step 1 counts too), and they go first. Every chip is phrased as a question with a question mark: "Why 7 days?", "What is devnet?", "What is pg?", "Which types work?". Questions are longer, so the row often fits just one chip and the rest wait.

Workspace: the `lib.rs` file tab. The files for steps 1 and 3 start empty: the old `// Import anchor` comment was real text, and code typed after it ended up inside the comment. An empty editor shows the placeholder "Type the code from the lesson here, or press Write with assistant", which disappears with the first character. Mobile has its own hint under the empty file. At the start of a step with a mouse, focus is already in the editor, with the cursor at the start of the first line from the step's `focus`. On touch, focus isn't set, otherwise the keyboard pops up: the `focus` lines are only highlighted, and the cursor appears on tap. The input covers the whole editor, so a click anywhere, line numbers included, places the cursor. Under the editor is the action bar: on the left the step status, as on mobile, with a dashed circle "Done when the build lists the hello instruction" (the step's `checkedBy`); on the right "Write with assistant" (secondary) and "Build ⌘↵" (primary). Under the bar is the collapsed terminal.

### 4. Lesson
The lesson is open in the column under the step goal while the step waits, and every code block has a Copy button. During Quick check and after success it collapses into the "Read the lesson · N min" chip. The code on the left stays visible. At the end of the step 1 lesson is the line "The first build fails on purpose, so you see how Anchor reports a missing piece.", which works on both phone and desktop, and `declare_id!` is described without contradiction: you write the line as is, and Playground fills in the real id at build time.

### 5. Patch and Quick check
"Write with assistant" shows the patch in the editor as an inline diff: green lines, a purple dot on lines with a note. The button is just the dot together with the line number (56 px wide, 44 px tall on touch), and a click on it opens and closes the note. The first one opens on its own once per session. The code in the diff stays text, so it can be selected and copied. The file header has "Show notes" and "Hide notes". While the walkthrough is on, the editor is read only. On steps 1 and 4 Quick check arrives as a message in the lesson column under the step goal: the "Quick check" label, a question, three options of the same shape, "Skip". Meanwhile the action bar only has the label "Answer the quick check to see the code, or skip it". The question takes focus to the first option by itself. After an answer the feedback ("Right." or "Not quite.") stays under the question in the column, the note on the line the question was about opens, and "Don't apply" and "Apply and build ⌘↵" appear. The assistant says what the patch changes in a message in the column, and on step 1 it says outright that it left one part out on purpose. The assistant speaks only in the column; the bar has a short status "Read the change in lib.rs, then apply it". The field at the bottom of the column becomes "Ask about this patch" for this stretch.

### 6. Build
The main button is disabled and reads "Building...", and the status gives the detail. The terminal expands on its own to the Build tab and shows the log. On mobile this was the Build tab next to the code.

### 7. Failed
The error line is highlighted red in the editor, as on mobile. A squiggle is drawn under the token the compiler points at: on step 1 that's `Hello` on line 9, column 32 (that's how rustc counts; the data used to say 30). The squiggle doesn't appear all at once, it draws left to right over 240 ms, at the moment the error arrives. If the compiler didn't name a token (errors in the user's own code other than E0412), the whole line is underlined from the first character. Hovering the `--> src/lib.rs:9:32` line in the terminal highlights the line in the editor more brightly, and hovering the error line in the editor highlights the compiler line in the terminal: it's one error in two places. In the product Monaco draws the squiggle, and the hover link has to be built on top. The status carries the reason from the step data, including the line number, with a "!" icon. On step 1 the first build through the assistant fails on purpose, the lesson warns about it, and the status says exactly that: "Build failed, as expected: `Context<Hello>` on line 9 needs a `Hello` struct." The main and only button is "Explain the error ⌘↵". I removed "Build again" after three reviews: the same build of the same code fails the same way. Editing the code brings Build back to the bar. The full error text is in the terminal. "Restore my code" appears in the file header if a patch was already applied on this step (see section 9).

### 8. Explain
The answer arrives in the lesson column as an "Assistant" message: a quote of the error, an explanation in 2 or 3 sentences with code in chips, and chips for follow up questions. There's no sheet, and the code isn't covered. After Explain the main button is "Review the fix", which shows the fix with the same patch as in section 5, with "Don't apply" and "Apply and build". People can also fix the code themselves and press ⌘↵. Whether the error has already been explained is kept in the store (`explained`): switching views doesn't ask for Explain again, and the explanation comes back to the column as a message. The flag is reset by a new build, a code edit and a step change.

### 9. Passed
The status shows a green check and the sentence from the step data, as on mobile ("The build passed and the interface shows a hello instruction."), and the bar has a single green button "Next: Build & Deploy ⌘↵", or "Finish tutorial ⌘↵" on the last step, and focus moves to it by itself. Enter outside the editor also moves on. Enter in the editor inserts a line and doesn't reset the success: a whitespace only edit doesn't count as a change. Any other edit on a passed step clears the pass until the next build (`changedSincePass` in the store): the status reads "Changed since the last build. Build to check it again." (run instead of build for the client), and an old result is never shown for code nobody built. The step's check in the progress bar stays until the next result. The progress bar fills.

"Restore my code" in the file header shows only after a failed build. It isn't there on success: there's nothing to roll back, and a rollback would clear the pass. If it rolls back the assistant's patch or fix, the button is called "Undo the patch". Tooltip and screen reader description: "Puts the file back as it was before the first change applied on this step", and after a press, a "File restored" toast.

### 10. Deploy (step 2)
The main button is "Deploy to devnet". During the deploy there's a spinner in the status and three stages in the terminal one after another, the same as on mobile: Writing buffer, Deploying, Confirming. After success the program id is in the terminal with "Copy" and "Explorer". It isn't written into `declare_id!`, because that would break the step 4 diff. Status "Live on devnet".

### 11. Client (step 3)
The `client/client.ts` file. Same path as step 1: write it yourself or take the patch. For your own code the main button is "Run the client", for the patch "Apply and run".

First signature moment: your hello comes back from the network. After the run, the log first shows the client output (the line "Use 'solana confirm -v …' to see the logs" stays, the code itself prints it), then the prototype runs that command for the user and shows the transaction logs:

```
$ solana confirm -v 4sGjMW…
Program 9hJqVk…zWxCvB invoke [1]
Program log: Instruction: Hello
Program log: Hello, World!
Program 9hJqVk…zWxCvB consumed 1,042 of 200,000 compute units
Program 9hJqVk…zWxCvB success
```

The line written by `msg!` is highlighted purple with a bar on the left, with the caption "↳ from msg! · src/lib.rs:10" under it. The line text comes from the `msg!` in the file (`helloSays` in `check.ts`), so your own code speaks in its own words, and the line number comes from the file too. The open file on step 3 is `client.ts`, so the caption opens a peek of `lib.rs`: lines 9, 10 and 11 without the common indent, line 10 highlighted, "src/lib.rs · Read only" on top, and one sentence at the bottom: "`msg!` wrote this line to the program log, and the transaction brought it back.". With a mouse the peek opens on hover after 150 ms and goes away with the cursor, and a click pins it. On touch and on the phone it's a tap. The peek opens above the line and the caption together, so it doesn't cover the line it explains, and it doesn't take focus.

Second signature moment: instead of a bare caption under the log, a transaction receipt. Rows are grouped with thin dividers: Program (hello_anchor · 9hJqVk…zWxCvB) and Instruction (`hello`), then Fee payer (Kora · signer), You (0 SOL), Fee (0.000005 SOL · paid by Kora), Compute (1,042 CU) and Confirmed (~0.4 s), then Log (the hello line in monospace), then Signature with Copy. The header reads "Transaction · example values" with Explorer, which stays a stub with a toast. The example values note is small in the header: honest, without the weight of a warning. On a wide terminal the receipt sits to the right of the log (21rem), on a narrow one under it. The terminal with the receipt is taller: 288 px, 320 on windows 860 px tall or more.

### 11a. Name (step 4)
The step 4 build isn't the pass yet: the step passes when hello says the name back. After a successful build the store is in the `call` phase, the status has a dashed circle "The build passed. Now call hello with a name, any text works.", and the right side of the action bar has "Call hello", a "Your name" field (up to 32 characters, no check for a real name) and "Run ⌘↵". With a mouse focus moves to the field by itself, on touch it doesn't, otherwise the keyboard pops up. Enter in the field and ⌘Enter anywhere start the call; with an empty field nothing happens. During the call the phase is `calling`, the button reads "Calling...", the status reads "Sending hello to devnet", and the terminal expands on its own and prints `$ pg.program.methods.hello("Almaz").rpc()`, like the step 3 client. After 1.6 s comes the transaction log with the highlighted line "Program log: Hello, Almaz!", the same caption and peek, and under it the receipt with `hello(name)`, its own transaction signature and 1,187 CU. Status "Your name came back in the transaction's logs.", then the green "Finish tutorial ⌘↵". While the step waits, the line reads "Done when hello says your name back" (`checkedBy`). The name is kept in the store (`name`, the field text in `draft`), on this device only. Editing the code after the build goes back to Build; a whitespace only edit doesn't.

### 12. Finish
A separate screen: the lesson column and the editor make way for it, the navigation stays. A 520 px column in the center: the achievement with the animation from mobile, under it the screen heading, which is what the program said: `Hello, Almaz!` in 28 px monospace, and under it small "from transaction 3vZp8L…qPzLyM". For screen readers the heading reads "Tutorial complete. Your program said Hello, Almaz!". If there's no name (progress saved before this version), the heading is `Hello, World!` with the step 3 transaction signature. Below that, "Tutorial complete. Your program is live on devnet.", the stats in one card with three columns, then "Your last transaction" as a printed receipt: monospace, "hello_anchor · devnet" and the date on top, groups separated by dashed lines, a torn edge at the bottom (a mask with 12 px teeth), "Example values in this prototype", "Copy as text" and "Explorer". Copy as text copies a text version with full keys, for pasting into a chat; if the Clipboard API doesn't grant write access, it copies through a selection, all inside the click. Then "What you learned". Below that, the "Up next" card (Counter PDA) with a Play ring, the main accent. At the end, two secondary buttons: "Back to tutorials" and "Open the project" (go back to the project without the tutorial; in the prototype it shows a toast, since there's no project outside the tutorial here).

## Microinteractions

General rules: motion explains cause and effect, 150 to 250 ms per motion, easing curves from the DS tokens (`ease-standard`, `ease-out`, `ease-pop`), and animation never delays the next action or moves text someone is reading. With `prefers-reduced-motion` the end state appears right away. No confetti. Everything not marked otherwise works on desktop and in the tablet frame. The CSS is in `prototype.css`, classes `pg-*`.

1. **The lesson notices the code.** While someone types, every code block in the lesson that's already in the file gets a quiet check in the top right corner and a green block border. The comparison is the same as the build's (`holds` in `check.ts`): ignoring whitespace, blank lines and comments, curly quotes treated as straight, any text in `msg!`, the block's lines consecutive. Remove the code and the check goes away. The check sits on a backing in the block color so a long line of code underneath doesn't show through. With a mouse, on hover the check gives way to Copy; without hover it sits to the left of Copy. For screen readers there's hidden text "This code is in your file". The step 3 block `console.log(pg.PROGRAM_ID.toString());` isn't in the assistant's patch, so it only gets checked for someone who typed it.
2. **The pass gesture.** When a step passes in front of you (after a build, deploy or call), the circle in the status draws itself clockwise from the top over 220 ms, followed by the check over 140 ms. The step's segment in the progress bar catches a short glint while it fills (260 ms with a 160 delay). A step that's already passed plays nothing when opened. The status and the bar are shared, so the phone gets the same.
3. **The error draws itself and is linked.** See section 7.
4. **A chip becomes a question.** A tapped chip flies into the feed: the question bubble starts from the chip's position and shape (FLIP, 240 ms) and settles into place, and the answer starts typing once it lands. The remaining chips slide into the freed space over 200 ms. How many chips fit in the row is computed from the layout, not the screen, otherwise the row disappeared mid animation. Desktop and tablet only; in the phone sheet the chips are as before.
5. **The receipt prints.** Receipt rows come out one at a time every 60 ms, each dropping into place over 200 ms, when the transaction arrives: on steps 3 and 4, and once when the finish opens. Come back to the step or switch views and the receipt is already in place. On the phone too: the Output tab opens a moment after the transaction arrives, and the receipt is still printing.
6. **The key responds.** ⌘Enter lights up the ⌘↵ on the button it pressed: the hint brightens to full and back over 260 ms. If the press turned the button into "Building...", the hint stays on it only to flash and fade, and screen readers don't read it. ⌘J lights up its own hint in the terminal bar. The ⌘B hint lives in a tooltip that the key doesn't open, so the menu button itself, visible after the press, gets a short press state. Only where hints are shown (`desktop/pointer.ts`). With reduced motion the hint just gets brighter, without scaling.

More from the review: the hint under the empty file on the phone wraps (at 320 with a large font it caused horizontal scroll), and on a small screen the diff scrolls on open to the first changed line and puts it at a third of the height (the step 1 fix from line 14, step 4 from line 9).

## How hand typed code is checked

There's no build in the prototype, so Build compares the file with the step's reference, ignoring whitespace and blank lines.

The comparison forgives what the compiler would let through or what doesn't matter for the step: comments, `pub mod` instead of `mod`, any text in `msg!` as long as it has as many `{}` as values.

- Match: the step passes.
- No `pub struct Hello`: error `E0412 cannot find type Hello` with the same Explain as in the mobile scenario. A commented out struct counts as missing.
- No `Ok(())`: error `E0308 mismatched types, expected Result<()>, found ()`, with its own Explain text.
- Empty file: "Build failed: the file is empty, so there is nothing to build."
- A line that isn't in the step: the error names it ("Build failed: line 11 isn't part of this step (`let x = 1;`).") and colors it in the editor.
- All lines belong, but one is missing: "Build failed: a line this step needs is missing (`use super::*;`)."
- Every reason starts the same way: "Build failed: …", or "Run failed: …" for the client. The only exception is the planned error on step 1, "Build failed, as expected: …". Explanations never ask you to type anything, since there's nothing to type with on the phone: "Compare it with the lesson, or review the fix".
- Curly quotes (“ ” ‘ ’) become straight before the check: a tablet keyboard inserts them on its own, and that isn't the mistake the step is teaching.
- In the log every error has a link to the line, and a click goes to the editor.

In every case "Review the fix" shows a diff from the typed code to the reference.

The assistant path follows the mobile scenario: the first step 1 patch lacks `struct Hello`, the build fails, Explain, fix, the build passes.

If someone has already typed something and then presses Write with assistant, the patch is shown against what's in the editor now: the typed code shows in red as what the patch will replace. Silently wiping someone's code isn't allowed, and it can be brought back with Restore my code.

## The question field for the assistant

Chips give canned answers; which ones and when, see section 3. On mobile, Explain for an error shows chips about the error, and Explain for a step shows chips about the lesson. To free text the assistant answers with one sentence: "Free chat isn't connected in this prototype. Try a suggestion." The field placeholders have no ellipsis, and the return key on the on screen keyboard is labeled Send (`enterkeyhint`). Answers type out, as on mobile. The model isn't named, only "Assistant".

The conversation in the column is kept per step while the page is open: come back to a step and its messages are there, and answers already typed out don't type out again. Start over starts every step with a clean column.

## Keys

- ⌘Enter (Ctrl+Enter off the Mac) presses the main button of the action bar in any state, including from the editor: that's the whole point of the key. Build, Deploy to devnet, Run the client, Apply and build or Apply and run, Explain the error after an error, Review the fix after the explanation, Run on step 4 after the build (calling hello with the name, nothing with an empty field), Next or Finish after success. The pressed hint flashes, see "Microinteractions", item 6. The ⌘↵ hint sits on whichever button the key presses. It doesn't fire in the assistant question field.
- ⌘B and Ctrl+B collapse and expand the menu, as in the product (`client-v2`, `shared/ui/sidebar.tsx`). We don't teach ⌘B for building: in the product Ctrl+Shift+B opens Build & Deploy and Ctrl+S formats.
- ⌘J opens the terminal, and its hint also follows the platform (Ctrl J off the Mac).
- Key hints (⌘↵ on buttons, ⌘J, 1 2 3 and S in Quick check, ⌘B in the menu tooltips, "or ⌘↵" in the empty terminal) show only with `(hover: hover) and (pointer: fine)` or after the first press on a real keyboard: with a modifier or outside an input. On a tablet in hand they name keys that aren't there.
- For developers: by default Monaco binds Ctrl/⌘+Enter to "insert line below". In tutorial mode this binding has to be overridden so ⌘Enter presses the main button.
- Enter: Next after success, when focus isn't in the editor or a field.
- 1, 2, 3 and S: answering Quick check and skipping it.
- Esc: closes open notes.

## View switcher

- On a wide screen there's a thin 40 px utility bar above everything, in the same place in both views: the label "Solana Playground · tutorial flow · prototype" on the left, the Phone and Desktop switcher in the center, Reset on the right. The background is lighter than the product and the text is small so nobody mistakes it for the app header (Almaz's call, 10/21/2026; the switcher used to be under the phone frame and in a badge in the desktop corner).
- Phone: the phone in a frame, as now.
- Tablet: an iPad Air in landscape with the desktop screens inside. The iframe is always 1152 by 792, and the whole frame scales to the window, so a short window shows a smaller tablet rather than a narrow screen. The bottom 20 px of the screen are for the home indicator: the `--tablet-safe-bottom` variable applies only inside the frame, and the desktop `main` is offset by it.
- Desktop: the screen at full width under the bar, no frame.
- The choice is in the URL, `?view=desktop`, so a link can open straight into the right view. Without the parameter a wide screen shows Phone, as now.
- Below 600 px there's no switcher, always mobile.

## Tablet and touch

Everything below is turned on by `(pointer: coarse)`; nothing changes on desktop with a mouse.

- Targets of 44 px or more: menu items and the menu button, the whole terminal bar (it is the toggle), Show notes, Restore, chips, Send, the column ✕, the lesson button, the compiler line link in the terminal, the note dot in the diff. I didn't touch the key cards under the log this round.
- The column edge: a 26 px zone and a handle that's always visible, since there's no hover on touch.
- The progress bar segments in the column are visible: the bar is split into steps, with a number above each, the current one lighter.
- When the on screen keyboard eats the height, the shell fits itself to `visualViewport`, and the action bar stays above the keys. This is best effort and doesn't kick in on desktop.
- The page has `overscroll-behavior: none`, and the column, editor, diff and terminal have `contain`: pulling past the edge doesn't drag the whole app.

## Shared progress

Same key, `pg-proto-tutorial-v1`. Switching views mid step opens the same screen and step. The patch walkthrough stays open, the Quick check answer and an explained error are kept with the progress and aren't asked again, while the build and the sheets don't survive a reload and return to the step's resting state. Code typed by hand on desktop is kept in state and shown read only on mobile. A reload, as on mobile, goes to the gallery.

## How the prototype is built

- Same entry point, `design-system/prototype/tutorial`.
- Shared `data.ts` (step references and errors for the user's own code go there, transaction logs `clientLog`, `callLog` and `programLog`, a `call` field on step 4) and `store.tsx` (actions: code edit, building your own code, `explained`, `draft`, `call`, `called`; fields `changedSincePass`, `failedOnce`, `explained`, `built`, `draft`, `name`, `txAt`; phases `call` and `calling`). Step transactions are derived from state in `tx.ts`: `clientTx`, `namedTx`, `stepTx`, `lastTx`, `shownLog`. `firstTry` isn't lost on the planned step 1 error; the error chips have their own `failedOnce`.
- Desktop screens in `src/prototype/tutorial/desktop/`: shell, gallery, tutorial page, step, finish. Shared parts from `ui/` (`Prose`, `InlineDiff`, `ActionZone`, `PredictZone`, `BuildLog`) are reused where their shape fits.
- The editor in the prototype is simple: an input with a highlight layer on top. The product uses Monaco, as in client-v2.
- DS components and tokens only, dark theme, copy in English.

## Testing

I go through both paths on every step in Desktop at 1440, 1280 and 1024 and in the Tablet frame, with the lesson checks, the squiggle and the hover link, chips flying into the feed, the pass gesture, the ⌘↵ flash, the peek on step 3, the call with a name on step 4 (including a name with `$&` and emoji), the receipt printing, the finish heading and Copy as text: your own code (correct, with `pub mod` and your own text in `msg!`, without `Ok(())`, without `struct Hello`, arbitrary) and the assistant's patch. I check the column width with the mouse, the arrow keys and a double click, Enter in the editor after success, an edit after success, Restore my code and Undo the patch after an error, code with curly quotes, the menu with a mouse and on touch, switching Phone and Desktop mid step in every state, a reload, the keys, Esc. WCAG AA contrast, focus visible from the keyboard.

## Showing it to the client

Same as in the mobile spec: a separate project on Vercel in the hoodies account, basic auth in edge middleware, noindex through the environment, checked with anonymous requests. Deploy only after Almaz's ok.

## Metrics

For the demo: Kat goes through the scenario on desktop and switches to the phone mid step without losing her place. For the product, on top of the mobile ones: the share of steps passed with your own code versus steps passed with the assistant's patch.

## Open questions

1. The Write, Build, Deploy, Interact stepper is removed in the prototype for the duration of the tutorial. Confirm with Nikita that we hide it in the product too.
2. Where the regular project chat goes while the column is taken by the lesson: chat history in the same feed, or separately after leaving the tutorial.
3. Does desktop need Quick check when someone writes the code themselves, or only before the assistant's patch? In the prototype it's only before the patch.
4. Open on phone: whether to show the reverse scenario in the next iteration.
