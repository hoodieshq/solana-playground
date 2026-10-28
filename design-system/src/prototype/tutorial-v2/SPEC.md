# Tutorial flow v2: the lesson is the conversation
> Copy of the v2 design spec for the developer handoff. Client names and call quotes are paraphrased.


Author: Almaz Zaripov · 10/23/2026 · final spec for the build

Client review: Tuesday 10/27/2026.

Built as a clickable prototype in `design-system/src/prototype/tutorial-v2`, served at
`/prototype/tutorial-v2/?view=desktop` (desktop) and `/prototype/tutorial-v2/` (phone). v1 in
`src/prototype/tutorial` is frozen: nothing in it changes, it gets no link to v2, and it is what we
showed on 10/23.

Inputs this spec settles: the call transcript of 10/23, `research-market.md`, `research-product.md`,
`research-architecture.md`, `research-mobbin.md`, `ux-architecture.md` (interaction design) and the two
visual directions `ui-A.md` "Quiet IDE" and `ui-B.md` "Assistant forward" with their mockups `ui-A.png`
and `ui-B.png` (all in the session scratchpad `v2/`). Where this spec and those files disagree, this spec
wins. Everything is a prototype: no model, no devnet, canned answers, dummy transactions, example numbers.

Three tutorials run in the prototype on this one flow (10/28): Hello Anchor (Beginner), Lumberjack
(Intermediate) and Zero Copy (Advanced). This spec describes the flow and Hello Anchor's script; each
lesson's steps, questions and decisions are in `lessons/README.md`, and their scripts in `lessons/`.
Where an example below says Hello Anchor, the other two work the same way.

---

## 0. The idea in six lines

1. One layout from Start to the finish: icon rail, chat, workspace, like ChatGPT desktop or Claude for Mac
   with Playground's workspace on the right.
2. The lesson is the conversation. Each step opens with a divider in the feed; the step bar on top of
   the chat (one segment a step: 4 in Hello Anchor and Lumberjack, 3 in Zero Copy) jumps back to those
   dividers.
3. One composer. Every button the learner needs right now sits on the latest card that asks for it.
4. Question, then code: a short explanation, a question with 3 options, a right pick makes the assistant
   write that code into the file with the lines lit, a wrong pick gets one sentence and a retry.
5. Something visibly changes in the first 5 seconds, the first green build lands before 60 seconds, and
   every step ends on a win card.
6. Nothing of the IDE is gone: the nav is folded to icons, the file tree is one click from the file name,
   the terminal bar is always on screen, and deploy adds the Call panel generated from the IDL (8.6).

---

## 1. Goals and non goals

### 1.1 Goals for Tuesday

* Answer every remark from the call (listed with the scores in 2.1) on the screen, not in words.
* Desktop complete and clickable end to end on the happy path, the wrong pick path, the planned build
  failure, the hand typed path and the Test tab path.
* Phone shows the same conversation, the same cards and the same copy, so the client sees one product.
* Keep the two signature moments chosen on 10/21: your hello coming back from the network (`Hello,
  World!` in step 3, then `Hello, <name>!` in step 4 and on the finish card) and the transaction receipt
  instead of a bare key. The live wall of hellos and the share link stay the Breakpoint plan.

### 1.2 Non goals

* A real model, real builds, real deploys, a real devnet. Free questions get canned answers.
* A project generator ("create a project that does X" gets a canned answer, section 7.7).
* Light theme, the Programs page, Home, New project (stubs with the v1 toast).
* Per step reset or "Quiz me again". Going back is reading; "Start over" resets the whole tutorial.

### 1.3 Who pays

The learner's Playground wallet, a devnet key pair Playground makes in the browser, pays for everything
in free devnet SOL. The first deploy starts with the stage "Funding your wallet": an airdrop of 5 SOL
from the devnet faucet. Every cost names the wallet: "1.27 devnet SOL from your wallet" for a deploy,
"0.0002 devnet SOL" for an upgrade, "fee 0.000005 SOL from your wallet" for a transaction. The numbers
are examples (`lessons/common.ts`).

When the faucet is at its limit, the deploy fails as a red result "Not enough devnet SOL": the wallet
has 0 SOL and the deploy needs about 1.27, try again in a minute or top the wallet up; the wallet's short
address with Copy, and "Open faucet". A new deploy card follows with "Try again", which asks the faucet
again and deploys. `?demo=faucet` shows it.

Kora was the earlier direction ("0 SOL, paid by Kora"). Its default policy will not pay a learner's
deploy rent, so the copy no longer names it.

---

## 2. Direction verdict

### 2.1 Scores

1 to 5, against the requirements, the client's remarks, buildability by Tuesday and consistency with the
design system. Weight ×2 on the client's remarks and on buildability, because those decide Tuesday.

| Criterion | A "Quiet IDE" | B "Assistant forward" | Why |
|---|---|---|---|
| R1 three columns, nav as icons | 5 | 4 | B merges the anchors into the chat head and drops the labelled "Tutorials" back and the title: "how do I get out" was a v1 complaint |
| R2 lesson as conversation, anchors | 4 | 5 | B's sticky chapter header always says which step you are reading; A gets the same from the step bar's "viewing" state |
| R3 one entry point | 5 | 5 | Both: one composer, actions on the latest card only |
| R4 question, then code | 4 | 5 | B's bordered 48 px option rows are the phone mechanic the client liked (v1 phone shot); A's hairline rows read as a list |
| R5 fast wins, a win per step | 3 | 5 | B's win card (drawn check, big headline, stat pills) and the editor's "Assistant wrote" chip give the client the quick wins they asked for; A's win is quiet |
| R6 small file tree | 4 | 5 | B's filled toggle next to the file name is easier to see than A's bare caret |
| R7 IDL Test tab | 5 | 5 | Same form in both |
| R8 one product on desktop and phone | 4 | 5 | Same components in both; B's option rows already match the phone |
| R9 hidden features reachable | 4 | 4 | B labels Files ⌘E and Terminal ⌘J; A's one line hint fits the head where B's callout covers the anchors |
| Client: chat driven, one tab, steps as messages (×2) | 10 | 10 | Both |
| Client: fast wins, nav out of the way, not always Apply (×2) | 6 | 10 | B is built around the wins |
| Buildable by Tuesday (×2) | 10 | 6 | A needs 2 new keyframes and no observers; B needs 6 keyframes, sticky headers with an IntersectionObserver, a merged head, a burst |
| Design system consistency | 5 | 3 | A is client-v2's shell untouched; B mixes BrandButton ring and accent, rings on several cards, a gradient progress and blue links |
| **Total** | **69** | **72** | |

### 2.2 Decision: B is the base, A gives it the shell

B is what the client asked for in plain words (an assistant driven lesson) and what they need to feel
(small wins all the time). A is the more honest product: client-v2's heads, one primary style, and less to
build. So the look and the moments come from B, the frame and the rules come from A.

Taken from B (the moments):

1. The live question is the hero card: product gradient ring and `shadow-panel`, bordered 48 px option
   rows with a key cap, "Question 1 of 4" kicker, keys 1 to 3 shown in its top row, a small shake on a
   wrong pick.
2. The assistant visibly writes: the wrote card in the chat, a floating "Assistant wrote lines 5 to 13 +9"
   chip in the editor, the lines arriving lit one after another.
3. The win card: drawn check, "Step 1 done" tag, 28 px headline, three stat pills, one Next button.
4. The act card shape: icon tile, title, context line, the button on the right.
5. A progress hairline in the product gradient under the step bar.
6. Labelled workspace tools "Files ⌘E" and "Terminal ⌘J", and a filled tree toggle next to the file name.

Taken from A (the frame and the rules):

1. Chat head 44 (labelled "Tutorials" back, title, ⋯) plus a separate 40 px step bar under it, exactly as
   `ux-architecture.md` 2.3. No sticky chapter headers: dividers in the feed and the bar's "viewing" state.
2. One primary style on screen: DS `Button` default (`bg-primary`) for every main action, Next included.
   No `BrandButton` ring or accent in the tutorial.
3. The gradient ring marks the one card that is the moment: the live question, the live win, the finish.
   Asks resolve before acts and wins become records on Next, so there is never more than one ring on
   screen.
4. Colour means something: purple live, green written or passed, red failed, amber "not this one". Links
   are underlined foreground, not blue.
5. The one line nav hint that stays inside the 44 px head row.
6. A determinate progress bar on running acts (stages are known), not an endless gradient loop.
7. Records shrink to one line; the wrote card is a button; the wrong pick reason is
   `text-muted-foreground` for contrast.
8. Three new keyframes only: `pg-arrive` (with a per line delay), `pg-anchor-flash`, `pg-shake`.

Rejected from B, with the reason: the merged head (loses the way out and the title), sticky chapter
headers (cost, and they stack under the step bar), the ray burst (motion noise on top of the drawn
check), `pg-indeterminate` and `pg-glow` (not needed with the choices above), the ring Next button (a
second primary style), blue `text-info` links (a sixth colour meaning).

Rejected from A: hairline option rows (they read as a list, not as three buttons), the 17 px win
headline (the win is the dopamine moment), the bare caret as the only tree toggle (the client asked for an
arrow you can see).

---

## 3. Decisions

| # | Decision | Rationale (one line) |
|---|---|---|
| D1 | Columns: nav rail, chat, workspace, in that order | Agreed with the client on the call: nav, chat, results on the right; Claude, ChatGPT and Mintlify do this |
| D2 | The tutorial start is the first assistant message (intro card), the old overview page is gone | One layout for the whole tutorial fixes "where am I" and gives the composer to the learner before Start |
| D3 | Before Start the workspace shows the finished program, read only | Answers "what am I building" without a paragraph |
| D4 | Nav folds to the rail on entering a tutorial, always; opens as an overlay; a pin docks it | The client wanted it gone, the rail keeps it one click away, the overlay never moves the code |
| D5 | No Lesson or Assistant tabs; each step is a divider plus assistant messages | Client: the lesson steps as messages from the assistant, one tab only |
| D6 | The 4 step bar stays on top of the chat and scrolls to each step's divider; nothing resets | Client: the steps as points in time you can go back to |
| D7 | One composer at the bottom of the chat; Build, Deploy, Run, Call, Explain, Next only on the latest card | Client: too many entry points to the assistant; buttons at the bottom of the assistant |
| D8 | A free question never builds or applies; only the "change what hello says" intent offers "Apply to lib.rs" | Client: Apply and build should not always be the answer |
| D9 | Question, then code on 4 questions (two in step 1, one in step 3, one in step 4) | The mobile mechanic the client liked, on desktop now |
| D10 | Step 2 has no question | It is the fastest win (two clicks, about 10 s) and there is no code to write |
| D11 | The planned build failure stays in step 1, followed by Explain and a "Fix it" question | It teaches the one error every Anchor developer meets, and it is the write, fail, fix moment |
| D12 | The question card lives in the feed, not docked over the composer | The feed is the record and the composer must stay usable; auto follow puts the card right above the composer anyway |
| D13 | Wrong pick: amber row, one sentence, the question stays open; after two wrong picks the last option is outlined | Retry teaches, and nobody gets stuck |
| D14 | Step 4 ends with Build and deploy (an upgrade), then the call | Honest result: the old program would still log `Hello, World!` |
| D15 | Test tab appears in the workspace on the first deploy, generated from the deployed IDL; a Send passes steps 3 and 4 | Engineering: an IDL based form, the way Explorer does it; v1 lost it |
| D16 | The form reads the last deployed lib.rs, never the live file | Typing `name: String` must not add a field before the upgrade lands |
| D17 | File tree: a filled toggle next to the active file name opens a 240 px popover; a pin docks it at 220 px | Client: a small, simple arrow next to lib.rs |
| D18 | Tabs never close; lib.rs, client.ts and Test stay one click apart | Client: going back from client.ts to lib.rs |
| D19 | Terminal: the DS 28 px bar is always visible, ⌘J opens a 240 px drawer; it opens by itself on a failure, the first deploy and the first client run | R9, with the product's own component |
| D20 | Workspace head has no action buttons, only tabs, Files ⌘E and Terminal ⌘J | R3 |
| D21 | Phone: same conversation component; Chat, Code, Output tabs; Test as a drawer; Lesson and Explain sheets retired | Client: the phone felt like a different flow from desktop |
| D22 | Chat width `clamp(360, 400 + (W minus 1280) × 0.134, 480)`, 420 at 1440, drag 340 to 560 on its right edge | Mobbin: chat columns sit at 26 to 30 % with a workspace open |
| D23 | The assistant stays unnamed ("Assistant"), as v1's `AssistantHead` rule | A newcomer needs to know the assistant answered, not which model (DES-138 names it only for a connected model) |
| D24 | "I'm stuck" is always reachable (last chip or in More): a hint on a live question, Explain on a failure | On the design lead's must have list, and the client asked for "do this for me" |
| D25 | Column order swap is not offered | Agreed on the call; the chat column is one component, so a swap stays cheap if the client pushes back |
| D26 | R10: the canned "create a project" answer inside the tutorial is in; the field on the tutorials list is the last task, built only if every acceptance check passes by Monday 18:00 | Nice to have, not on the review path |
| D27 | "Change what hello says" (the client's story) is in, as a chip after the finish and a typed intent any time | It shows the assistant changing code on request without "Apply and build" |
| D28 | Typing animation: new assistant text types out whole in 400 to 600 ms; restored turns render whole | Reads alive without slowing the first minute |
| D29 | Build 1.6 s, deploy 3 stages × 1.1 s, run 1.6 s, call and Test Send 1.6 s | Keeps the first green build under 60 s |
| D30 | State version `v: 2`; a saved state with another version is dropped and the tutorial starts at the intro | The thread is the source of truth; old shapes would crash the feed |

---

## 4. Layout (desktop)

### 4.1 The three columns

```
┌──────┬───────────────────────────────┬──────────────────────────────────────────────────┐
│ rail │ ‹ Tutorials   Hello Anchor   ⋯│ [lib.rs +9 ▾] [client.ts] [⚗ Test •]  Files ⌘E  Terminal ⌘J │ 44
│      ├───────────────────────────────┤──────────────────────────────────────────────────┤
│ 52   │ ✓ Program ─ ● Deploy ─ ③ ─ ④  │                              ✳ Assistant wrote… │ 40 (chat only)
│      │▔▔▔▔▔▔ progress hairline       │   1  use anchor_lang::prelude::*;                │
│      │                               │   3  declare_id!("1111…");                       │
│      │  feed: dividers, messages,    │   5  #[program]            ← lit, just written   │
│      │  question, wrote, act,        │   …                                              │
│      │  result, win cards            │                                                  │
│      │           [ Back to step 3 ↓ ]│                                                  │
│      ├───────────────────────────────┤──────────────────────────────────────────────────┤
│      │ chips · More                  │ ● Build successful · IDL: 1 instruction    ⌘J ⌃  │ 28
│      │ [ Ask about this step       ↑]│   terminal drawer, 240, opens upward             │
└──────┴───────────────────────────────┴──────────────────────────────────────────────────┘
```

* Every column head is `h-11` (44) with `border-b border-border`, so the rail head, the chat head and the
  tab strip draw one line across the window (client-v2).
* Chat column `bg-surface-base border-r border-border`. Workspace `bg-surface`. Rail keeps its border.
* No horizontal scroll at 1152 and up. Under 1152 the desktop view is out of scope.

### 4.2 Widths

| Window | Rail | Chat default | Workspace | Editor with tree docked |
|---|---|---|---|---|
| 1152 (tablet frame) | 52 | 360 | 740 | tree as popover only, pin hidden |
| 1280 | 52 | 400 | 828 | 608 |
| 1440 | 52 | 420 | 968 | 748 |
| 1728 | 52 | 460 | 1216 | 996 |

* Chat drag handle on its right edge (v1 `Column` handle, sign flipped, ArrowLeft and ArrowRight swapped),
  340 to 560, stops where the workspace would drop under 560. Double click resets. Key
  `pg-proto-column-width-v2`.
* Feed text measure 66 characters (v1 `READ`); cards take the full feed width (380 at 1440).
* Nav overlay 232 over the chat with a scrim over chat and workspace; docked it pushes both, chat keeps
  its width.

### 4.3 Chat column, top to bottom

1. Head 44: back button `ChevronLeft` + "Tutorials" (client-v2 `HeadButton` shape, leaves the tutorial,
   state kept), title "Hello Anchor" `text-[0.875rem] font-medium`, ⋯ menu (DS `DropdownMenu`, `align="end"`):
   "Start over…" (v1 `StartOverDialog`), "Keyboard shortcuts" (DS `Dialog` with the key list, 9.4).
2. Step bar 40, sticky: the anchors (6.3), with the progress hairline on its bottom edge.
3. Feed, scrolls. Follows new turns unless the learner is more than 120 px up.
4. "Back to step N" pill, floating 12 px above the foot, only while the live card is off screen.
5. Foot: chips row (0 to 3 chips plus More), then the composer.

### 4.4 Z stack

Back pill `z-10` (chat), column handle `z-20`, nav scrim `z-30 bg-black/50`, nav overlay `z-40
shadow-modal`, popovers, tooltips, the nav hint and menus `z-50` (DS).

### 4.5 Mobbin references for the layout

| Decision | Reference (scratchpad `v2/mobbin/`) |
|---|---|
| Icon rail while working, expand toggle on top | `03-claude-artifact-collapsed-rail-preview.jpg`, `06-chatgpt-collapsed-rail.jpg`, `16-gemini-collapsed-rail.jpg` |
| Rail, chat, tree, editor in one window still reads clean | `09-mintlify-rail-chat-filetree-diff.jpg` |
| The chat narrows to a column of about 26 % when a workspace opens | `07-chatgpt-canvas-open-sidebar-hidden.jpg`, `01-claude-design-chat-tool-chips-canvas.jpg`, `08-chatgpt-codex-task-summary-diff.jpg`, `17-replit-chat-preview-files-panel.jpg` |
| One composer at the bottom of the chat column, full width of it | `03`, `14-ai-studio-file-explorer-file-tabs.jpg`, every app in the cross app table |
| Numbered option rows, Skip, keys, in a card | `04-claude-question-card-above-composer.jpg` (shape), `05-claude-artifact-category-cards-in-chat.jpg` (a pick echoed as a user pill), `16` as the counter example (options as plain text) |
| The main action as a button inside the latest message | `10-devin-inline-action-button-workspace-tabs.jpg` |
| A card per file the assistant touched, which is the way back to the lines | `08`, `11-cursor-files-changed-card-workspace-tabs.jpg`, `13-lovable-change-card-suggestion-chips.jpg` |
| Inserted lines green with a count | `20-v0-diff-inserted-lines.jpg`, `08` |
| Tool results as cards with a status, failure tinted red, fix button attached | `23-vapi-tool-call-failed-success.jpg`, `24-hex-error-fix-button.jpg`, `15-ai-studio-action-history-card.jpg` |
| The current step carries its own action, done steps checked | `12-cursor-setup-steps-in-progress.jpg`, `21-mistral-numbered-plan-card.jpg` |
| File tree next to the editor, collapsible, files as tabs | `14`, `19-bolt-chat-filetree-editor-terminal.jpg`, `20`; `17` (tree on the far right) as the position to avoid |
| Terminal bar always visible at the bottom of the workspace | `19`, `18-replit-preview-console-split.jpg` |
| Typed argument form with name, type and input per row | `25-cohere-typed-args-form-run.jpg` |
| Chips above the composer, one follow up at most under an answer | `13`, `14`, `22-grok-thread-side-panel-followup.jpg` |

Where we differ: Claude's question card (`04`) replaces the composer while it is open. Ours sits in the
feed and the composer stays, because R3 says the learner can always ask.

---

## 5. Nav collapse (R1, R9)

Built on `desktop/Nav.tsx` (client-v2 `NavSidebar` clone, open 232, rail 52).

| Situation | Nav state |
|---|---|
| Tutorials list, anything outside a tutorial | v1 "auto": open from 1280 up, rail below |
| Entering a tutorial (Start, Continue, a card) | Folds to the rail, always, whatever was saved |
| In a tutorial: click the mark or ⌘B | Opens as an overlay over the chat with a scrim; closes on a pick, a scrim click, Esc or ⌘B and returns focus |
| In the overlay: pin in the nav head | Docks open, pushes chat and workspace; holds until the learner leaves the tutorial. Hidden in the tablet frame |
| Leaving the tutorial (Tutorials in the nav, back in the chat head) | Back to auto |

Rail, always visible:

* Head: `ProductMark` in a `size-9 rounded-lg` button; on hover or focus it fades to `NAV_ICONS.sidebar`
  (100 ms). DS `Tooltip` `side="right"` `sideOffset={8}`: "Open menu" + `Kbd` ⌘B.
* Destinations `RailButton` `size-9`, glyph 18: Home, New project, Tutorials, Programs. Tutorials is
  current inside a tutorial: `bg-surface-hover text-brand-purple`. Each has a DS tooltip on the right
  (300 ms delay); the native `title` goes. Everything except Tutorials is the v1 toast stub.
* Foot: Devnet (green 7 px dot, tooltip "Devnet · connected"), account avatar.
* Pin (open shape only): `size-[1.875rem] rounded-lg`, lucide `Pin` 16, tooltip "Keep open"; pinned
  `PinOff`, tooltip "Fold while I learn".

First time hint (key `pg-proto-v2-nav-hint`): on the first fold only, the DS tooltip look forced open next
to the mark, one line so it stays in the head row and never covers the step bar: "The menu is folded to
icons while you learn" + `Kbd` ⌘B. The mark's button gets `ring-2 ring-brand-purple/40` while it shows.
6 s, or until any pointer down or key. `animate-menu-in` in, 120 ms fade out. The long sentence is the
canned answer to "where is the menu" (7.7).

Storage keys in the copy: `pg-proto-nav-open-v2`, `pg-proto-nav-open-tablet-v2`,
`pg-proto-column-width-v2`, `pg-proto-v2-nav-hint`, and the store's `pg-proto-tutorial-v2`.

---

## 6. Conversation

### 6.1 Rules for every message

* Assistant text has no bubble (Claude, ChatGPT, Codex): `READ` on the column ground, consecutive
  assistant turns grouped under one `AssistantHead`. Learner turns are small right aligned pills.
* 2 to 4 sentences a message, one rich block at most (code quote, question, result).
* Only the latest card of each kind is live. A resolved card becomes a record: one line or smaller, no
  primary button. Navigation links in records ("Show in lib.rs", "Open Test") stay live because they
  change nothing.
* A click that speaks for the learner is echoed as a pill (a right pick, "Explain the error", a chip).
  Pure actions (Build, Deploy, Run, Call, Send, Next) are not echoed; their card turns into a record.
* New turns enter with `animate-rise`; never on reload.
* Rhythm: 20 between turns (`gap-5`), 8 from a head to its first block, 12 between blocks of one group, a
  divider adds 4 above its hairline and 16 below it. Feed `px-5 pt-4 pb-4`.

### 6.2 Foundations used

Only existing tokens, from `styles/tokens.css` (`.dark`) and `styles/theme.css`:

* Grounds `bg-surface-base` (rail, chat, heads), `bg-surface-panel` (cards, composer, popovers),
  `bg-surface` (editor, option rows, Test pane), `bg-surface-raised` (hover, pills, key caps),
  `bg-surface-hover` (current rail item, pressed head buttons), `bg-surface-well` (terminal, code inside
  cards). Hairlines `border-border`, emphasis `border-border-strong`.
* Text `text-foreground`, assistant prose `READ` (`text-[0.9375rem] leading-[1.6] font-read
  text-foreground/70`), `text-muted-foreground`, `text-subtle` only for meta that repeats something
  visible (3.6 : 1).
* Meaning: `bg-primary` the one primary button and Send; `brand-purple` live and current; `success` written
  and passed; `error` failed; `warning` / `warning-ink` wrong pick and "deployed file changed".
* Type: `HEADING` (16 / 500) for card titles, `font-heading text-display` (28) for win and finish
  headlines only, `text-caption` (13) meta, `text-[0.75rem]` small meta and chips, `font-mono text-code`
  editor and terminal, `font-mono text-[0.75rem]` code inside cards.
* Radius: records and tool cards 8 (`rounded-control`), cards that ask something 12 (`rounded-panel`),
  finish 16 (`rounded-card`), composer `rounded-2xl`, chips and pills full.
* Elevation: only the live question, the back pill and popovers carry `shadow-panel`; the nav overlay
  `shadow-modal`; the composer `shadow-composer`. Everything else is flat.
* Ring: `gradient-stroke [--stroke-fill:var(--surface-panel)]` on the live question, the live win and the
  finish card only.
* Icons: lucide at 14 in cards and 16 in heads; product glyphs from `ui/brandGlyphs.tsx` and
  `ui/navIcons.tsx`; `AssistantMark` for the assistant.

### 6.3 Step bar and anchors (R2)

```
 ✓ Program ──── ✓ Deploy ──── ● Client ──── ○ Name
 ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ (product gradient, 2 px)
```

`nav aria-label="Tutorial steps"`, `flex h-10 items-center border-b border-border px-3 relative`.

* Segment: `button h-7 rounded-[6px] px-2 gap-1.5 text-[0.8125rem] font-label`; glyph `size-4 rounded-full
  text-[0.625rem] font-act tabular-nums`; connector `h-px min-w-2 max-w-6 flex-1 bg-border`
  (`bg-border-strong` after a done step).
* Labels: Program, Deploy, Client, Name. Under 380 px of chat width (container query) the labels hide and
  each segment keeps a DS tooltip "Step 2 · Build & Deploy".
* Progress hairline: `absolute left-0 bottom-[-1px] h-0.5 rounded-r-full bg-gradient-product-flat`,
  width = (passed steps + beats done in the live step ÷ beats in it) ÷ 4, `transition-[width]
  duration-(--duration-slow) ease-out`; a `pg-sweep` runs through it once when a step passes.

| State | Glyph | Label | Segment |
|---|---|---|---|
| Not reached | `border-[1.5px] border-border-strong text-subtle`, number | `text-subtle` | disabled |
| Current | `bg-brand-purple text-white`, number | `text-foreground` | `aria-current="step"`, hover `bg-surface-hover` |
| Done | `bg-brand-green text-brand-ink`, `NAV_ICONS.check` 10 | `text-muted-foreground`, hover `text-foreground` | hover `bg-surface-hover` |
| Viewing (feed scrolled into another step) | its own state | `text-foreground` | `bg-surface-raised ring-1 ring-inset ring-border-strong`, `aria-current="location"` |
| Deployed file changed (10.4) | on step 2's glyph: `absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning ring-2 ring-surface-base` | | |

Behaviour:

* Click on a done or current segment: the feed scrolls (320 ms `ease-standard`, instant under reduced
  motion) so that step's divider sits 12 px under the bar, and the divider plays `pg-anchor-flash`. The
  workspace opens that step's main file (lib.rs for 1, 2 and 4; client.ts for 3), scrolled to the top.
  Nothing resets.
* Passing a step: the glyph turns done with `pg-pass-tick`, the connector fills in 200 ms.
* Keyboard: the segments are buttons; ⌥↑ and ⌥↓ jump to the previous and next divider.

### 6.4 Message catalogue

Each type is one component in `ui/turns/` shared by desktop and phone.

| Turn | Looks like | Live actions | Record |
|---|---|---|---|
| `intro` | Card (6.5.1) | Start ↵, Ask me anything first | One line: thumb 20 + "Hello Anchor" + `text-subtle` "· 4 steps · 10 min" |
| `anchor` | Divider: kicker "Step 1 of 4", title `font-heading text-title`, objective `text-caption text-muted-foreground`; once passed, right side `Check` + "41 s" | none (target of the bar) | same |
| `say` | `READ` paragraph with `Prose` inline code | at most one quiet link | same |
| `say` + quote | Text, then a quote box (`rounded-control border bg-surface-well`, head `h-7` with path and "Show in lib.rs"), the line in question lit: `border-l-2 border-primary bg-primary/10`, or for an error `border-error bg-error/10` with the token under a wavy `decoration-error` underline | Show in lib.rs | same; an error quote goes quiet once the step passes |
| `you` | v1 pill: `ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2`; a code pick shows highlighted mono | none | same |
| `ask` | Choice card (6.5.2) | pick 1 to 3, Type it myself, Skip | One line: `Check` success + the right option + `text-subtle` "· first try" / "· 2nd try" / "· 3rd try" / "· typed by you" / "· skipped"; `ChevronRight` expands to the three rows in their final states |
| `wrote` | Wrote card (6.5.3) | the card is a button: Show in lib.rs | same, stays a link |
| `act` | Act card (6.5.4) | the button, ⌘↵ | One line: `CircleCheck` success + "Built in 1.6 s" |
| `result` | Tool card (6.5.5) | Show log; on a failure Explain the error, I'll fix it myself | head only; a failure in red "Build failed · E0412 on line 9", expandable |
| `win` | Win card (6.5.6) | Next ↵, sometimes one outline link | One line: `CircleCheck` + "Step 1 done · Your program compiles" + "41 s" |
| `finish` | Finish card (6.5.7) | Next tutorial, Copy receipt, See summary, Back to tutorials | stays live (last turn) |
| `answer` | `say`, then at most one outline `sm` follow up button | that button | same |
| `apply` | `say` + a quote box with v1 `InlineDiff` of the changed line + outline `sm` "Apply to lib.rs" | Apply to lib.rs, Keep it | One line "Changed line 10 of lib.rs" |
| `nudge` | `say` with `border-l-2 border-warning/60 pl-3`, followed by an act card | the act | same |

Chips are not turns (6.6).

### 6.5 Cards

#### 6.5.1 Intro card

`rounded-panel border border-border bg-surface-panel p-4`.

```
[thumb]  Hello Anchor
         Beginner · Anchor · 10 min · by acheron

In about 10 minutes you'll write a Solana program, put it on devnet and call
it with your name. I explain a piece, ask a quick question, then I write the
code you picked. The finished program is on the right.

  ①  Program          Define the hello instruction and log a message
  ②  Build & Deploy   Deploy the program to devnet
  ③  Client           Call the instruction from the TypeScript client
  ④  Name argument    Give hello a name argument and log it

[ Start  ↵ ]                                        Ask me anything first
```

* Thumb `size-10 rounded-lg`, title `HEADING`, meta `text-[0.75rem] text-subtle`; step rows `h-8` with
  the step bar's "not reached" glyph.
* Start: primary `Button size="lg"` + `Kbd` ↵. Enter starts when nothing else has focus. "Ask me anything
  first" is a ghost `sm`: focuses the composer.
* On Start: the intro leaves the feed (the chat's header names the tutorial from then on, so a folded
  intro would say it twice), the step 1 divider appears, the workspace swaps the preview for an empty
  lib.rs, the nav hint shows (first time).
* Returning in progress: the whole thread is there, scrolled to the live card. The list's banner reads
  "Continue · Step 3 of 4".

#### 6.5.2 Choice card (the hero)

```
╭ product gradient ring ─────────────────────────────────────╮
│ [QUESTION] 1 of 4                       [1][2][3] to pick │
│ Which line writes to the program log?                     │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [1]  msg!("Hello, World!");                           │ │ 48
│ └───────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [2]  println!("Hello, World!");                    →  │ │ hover
│ └───────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [3]  console.log("Hello, World!");                    │ │
│ └───────────────────────────────────────────────────────┘ │
│ ✎ Type it myself   Skip                     or ask below │
╰────────────────────────────────────────────────────────────╯
```

* Container (live): `section aria-labelledby` `rounded-panel gradient-stroke
  [--stroke-fill:var(--surface-panel)] shadow-panel p-3 pb-2 animate-rise`. It takes focus on arrival with
  `preventScroll` (v1 QuickCheck).
* Top row `flex items-center gap-2 mb-2`: DS `Tag variant="brand"` "Question" (or "Fix it" for the
  question after the error), `text-[0.75rem] text-subtle` "1 of 4", `ml-auto` three `Kbd` + "to pick"
  (only with a keyboard, `useKeyHints`).
* Title `HEADING` with `Prose`, `mx-0.5 mb-3`.
* Options `flex flex-col gap-2`, each a button: `flex min-h-12 items-center gap-3 rounded-lg border px-3
  py-2 text-left transition-colors duration-100`. Key cap `grid size-6 place-items-center rounded-sm
  text-[0.75rem] font-act tabular-nums`. Code options `font-mono text-[0.8125rem] leading-[1.5]` with
  `highlight()` from `ui/CodeView.tsx`; prose options `text-control` with `Prose`. Wraps, never truncates.
  Trailing `ArrowRight` 16 slot.
* Foot `mt-2 pt-1.5 border-t border-border flex items-center`: ghost `sm` `PenLine` "Type it myself",
  ghost `sm` "Skip", `ml-auto text-[0.75rem] text-subtle` "or ask below".
* A "Fix it" question (the one after the planned failure) builds the learner's own code from inside
  the card. Once lib.rs changed since its last build, a row above the foot says "You changed lib.rs.
  Build it and the compiler checks your fix." with a soft Build (desktop only: a phone has no editor).
  The build has no act card. A failure posts its result under the question already open on the
  compiler's line, the link to the line and the reason, with no Explain of its own: the question is
  still the way on, and the row comes back at the next edit. A pass resolves the question as typed and
  passes the step. Typing the question's key line in the editor answers it without a build, as before.

| State | Row | Key cap | Trailing, below |
|---|---|---|---|
| Idle | `bg-surface border-border` | `bg-muted text-muted-foreground` | arrow hidden |
| Hover | `bg-surface-raised border-border-strong` | `bg-border-strong text-foreground` | arrow shown |
| Focus visible | hover look + `outline-2 -outline-offset-2 outline-brand-purple` | as hover | arrow shown |
| Pressed | `active:translate-y-px` | | |
| Right | `bg-success/10 border-success/50` | `Check` 14 stroke 2.5 on `bg-success text-success-foreground`, `animate-pop` | holds 500 ms, then the card collapses to its record (200 ms) and the code beat runs (6.7) |
| Wrong | `bg-warning/10 border-warning/50`, `pg-shake` once, `aria-disabled` | `bg-warning/15 text-warning-ink` | the reason under the text inside the row, `mt-1 text-caption text-muted-foreground`, opening 160 ms; focus moves to the next pickable row |
| Two wrong, one left | the last row gets `ring-1 ring-inset ring-brand-purple/50` | | under the options `text-caption text-muted-foreground` "That leaves one. Pick it and I'll write the code." |
| Disabled (a run is going) | rows `opacity-50 pointer-events-none` | | foot stays usable |
| Typed by you | collapses straight to the record | | the assistant says "You beat me to it. That's exactly it." |

Keys: 1, 2, 3 pick when focus is not in a text field; ↑ ↓ move between rows; Enter or Space picks the
focused row; S skips. The record drops the ring and the shadow.

#### 6.5.3 Wrote card

```
┌ ▢ src/lib.rs   lines 5 to 13                          +9 ┐
│  5  #[program]                                           │
│  6  mod hello_anchor {                                   │
│  7      use super::*;                                    │
│     6 more lines                                         │
├──────────────────────────────────────────────────────────┤
│ ↗ Show in lib.rs                                         │
└──────────────────────────────────────────────────────────┘
```

* The whole card is a `button`: `w-full overflow-hidden rounded-control border border-border
  bg-surface-panel text-left hover:border-border-strong`, `aria-label="Show lines 5 to 13 in lib.rs"`.
* Head `h-8 px-3 gap-2`: `FileCode` 14, path `font-mono text-[0.75rem] text-foreground`, range
  `text-subtle`, `ml-auto font-mono text-[0.75rem] text-success tabular-nums` "+9".
* Preview: the first 3 written lines on `bg-surface-well`, `font-mono text-[0.75rem] leading-[1.6]`,
  written rows `border-l-2 border-success/50 bg-success/5`, then "N more lines" in `text-subtle`.
* Foot `h-[1.875rem] border-t px-3 text-[0.75rem] text-muted-foreground`, `ArrowUpRight` 13 + "Show in
  lib.rs" (or "Show in client.ts").
* Click: opens the tab, scrolls the first line to a third of the editor height, replays `pg-arrive`.
* Variants: "Created client/client.ts" (head only, lucide `FilePlus2`, `Tag neutral` "New file"); appended
  at the end (10.1): a line under the head `text-[0.75rem] text-warning-ink` "I put it at the end: your own
  lines are kept." and a ghost `xs` "Reset lib.rs to this step's start".

#### 6.5.4 Act card

```
┌──────────────────────────────────────────────────────────┐
│ [⚒]  Build lib.rs                          [ Build  ⌘↵ ] │
│      Compiles lib.rs on Playground's build server        │
└──────────────────────────────────────────────────────────┘
```

* `rounded-panel border border-border bg-surface-panel p-3 flex items-center gap-3 relative
  overflow-hidden`. Icon tile `size-8 rounded-lg bg-surface-raised text-muted-foreground`, lucide 16:
  Build `Hammer`, Deploy and Build and deploy `Rocket`, Run `Play`, Call `Send`.
* Text: title `text-[0.875rem] font-label text-foreground`, context `text-caption text-muted-foreground`.
* Button: DS `Button` default `size="lg"`, label, `Kbd` ⌘↵ `bg-white/15 text-primary-foreground/80`
  (v1 `Shortcut`, with `pg-key-flash` on a key press).
* Call hello: the card is `flex-col items-stretch`; second row v1 `NameField` (`h-9 flex-1`, placeholder
  "Your name", max 32, Enter sends) and the button; disabled while empty, the context line reads "Type any
  name".
* A say text that introduces the act sits above the card as a normal `say`.

| State | Look |
|---|---|
| Idle | as above |
| Running | the button swaps for `Spinner` 16 `text-brand-purple` + stage label `text-[0.8125rem] font-act` ("Writing buffer") + `text-[0.75rem] text-subtle tabular-nums` "2 of 3"; icon tile `bg-brand-purple/14 text-brand-purple`; a 2 px bar on the card's bottom edge `bg-brand-purple/60 origin-left`, scaled per stage (deploy 1/3, 2/3, 3/3; build 0 to 0.9 over 1.6 s) |
| Interrupted by a reload | idle, the context line replaced by `text-warning-ink` "Interrupted by a reload. Run it again." |
| Disabled (another run going, empty name) | DS `disabled:opacity-50` |
| Record | collapses (200 ms) to one line, no button, ever. When its result card follows right under it, the record isn't drawn at all: one line per action, and the time it took moves into the card's details. A grow or a chop keeps its card, which is its result; a grow's record keeps the map as its last press left it (the copy red past the heap, or the zero copy map at 40 KB) |

#### 6.5.5 Tool result card

One shape for build, deploy, run, call and Test sends (`23`, `24`).

Redesigned on 10/28 (UX, UI and typography proposals merged by a judge). One box, never a box inside
it: whatever the card shows (an account, a program id, the log) sits in it flat, set off by hairlines.

* DS `Collapsible`, `@container overflow-hidden rounded-control border border-border bg-(--card-ground)`;
  head and body inside `role="status"`, the details after it.
* Head: status icon 16, title `text-[0.8125rem] font-label`, meta `text-caption text-muted-foreground
  truncate` (`h-9 px-3 gap-2`, `h-11` on a phone). The details open where they appear: on a card that
  shows its result (the latest with a body), from the card's foot, a full-width `h-8` row under a
  hairline with "Details" / "Hide details" at the left and the chevron at the card's edge; on a folded card or one with no body (a build), the whole head is the toggle with a
  `ChevronDown` 16 at its end. Opening never opens the terminal: the details have "Open terminal" on a
  desktop.
* Latest card: head, the result, then the receipt under a hairline: the signature (mono, muted) with
  Copy and Explorer, and "fee 0.000005 SOL from your wallet". One line at 25rem and up, two below.
  Printed in with `pg-print` as it arrives. Compute and time are in the details.
* Older cards (any run before the latest transaction or client read) fold to the head, the meta
  saying what came back: "`init_player` · 5/5 energy, 0 wood", "`hello` · “Hello, Alex!”".
* Details: first how long the run took, the line the act's record used to say: "Ran client.ts in
  1.6 s · 1,042 CU · confirmed in ~0.4 s" ("Sent in" for a call from the chat), "Deployed in 5.6 s",
  "Built and upgraded in 6.2 s". Then "Program log" with "Open terminal", and the program's own log
  lines only (`programLog(tx)`), mono 12, wrapped under a hanging indent, no well.

| Kind | Head | Body | Details |
|---|---|---|---|
| Build ok | `CircleCheck text-success` "Build successful", meta "IDL: 1 instruction · hello · 1.6 s" | none | "Build log", the log, at most 15rem then it scrolls |
| Build failed | live: as before (own `h-12` head, Explain and I'll fix it myself); folded: `CircleX text-error` "Build failed", meta "E0412 on line 9" | open: the compiler line, `--> src/lib.rs:9:32` as a link to the line, the assistant's line | |
| Deploy ok | `Check` "Deployed", meta "1.27 devnet SOL from your wallet" | `ProgramId flat` (Copy, Explorer). Stays in view on older cards | "Deploy log" |
| Deploy, no SOL | `CircleX text-error` "Not enough devnet SOL" | "Your wallet has 0 SOL, and this deploy needs about 1.27 SOL. The devnet faucet is at its limit for now: try again in a minute, or top the wallet up yourself.", then "Your wallet" with the short address and Copy, and "Open faucet". The act before it isn't drawn (its result is right under it); a new deploy card follows, "Asks the faucet again, then deploys" · "Try again" | the faucet's lines |
| Upgrade ok | `Check` "Upgraded 9hJqVk…WxCvB", meta "0.0002 devnet SOL from your wallet" | "IDL: 1 instruction · hello(name: string)" | "Deploy log" |
| Tx ok | `CircleCheck` "Confirmed", meta "`hello` from client.ts" / "from the chat" (the instruction in mono, without its arguments) | what came back: "Program log: Hello, World!" on a `border-l-2 border-success pl-3` rule with the `msg!` peek, or the account (`PlayerCard flat`, `MemoryCard flat`); then the receipt | facts, "Program log" |
| Read, no tx | `Eye text-muted-foreground` "Read your player" / "Read your map", meta "No transaction, already there" | the account, no receipt | "Client output" |

Calls from the Call panel show their result in the panel, never in the chat.

#### 6.5.6 Win card

```
╭ product gradient ring ─────────────────────────────────────╮
│  (✓)                                                      │
│  [STEP 1 DONE]                                            │
│  Your program compiles.                                   │
│  The build also made its IDL: one instruction, hello.     │
│  That's what clients will call.                           │
│  (⚒ Built in 1.6 s) ({} 1 instruction) (◷ 0:41)           │
│  [ Next: Build & Deploy  ↵ ]   Open Test                  │
╰────────────────────────────────────────────────────────────╯
```

* `rounded-panel gradient-stroke [--stroke-fill:var(--surface-panel)] p-5 animate-pop`.
* Mark: v1 `PassMark` at `size-8 text-success`, drawn with `pg-pass-ring` then `pg-pass-tick`.
* `Tag variant="success"` "Step 1 done"; headline `mt-2 font-heading text-display text-foreground` (two
  lines at most, the copy is written to fit); line `mt-2 READ`.
* Stat pills `mt-4 flex flex-wrap gap-1.5`: `h-7 rounded-full bg-surface-raised px-2.5 text-caption
  text-foreground tabular-nums gap-1.5`, lucide 13 icon each, `animate-rise` with a 60 ms step.
* Actions `mt-5 flex items-center gap-2`: primary `Button size="lg"` "Next: <step>" + `Kbd` ↵ (Enter goes
  Next while the win is live); optional outline `sm` link.
* At the same moment: the step bar glyph turns done, the hairline grows a quarter, the divider gets its
  check and time.
* Record (on Next): ring off, one line `h-9`.

#### 6.5.7 Finish card

`rounded-card gradient-stroke [--stroke-fill:var(--surface-panel)] p-5 flex flex-col gap-5 animate-pop`:
v1 `FinishBadge`, headline `font-heading text-display` left aligned, one `READ` line with the name as
inline code, v1 `PrintedReceipt`, "What you learned" `text-caption text-muted-foreground` + v1
`LearnedList`, stats `text-[0.75rem] text-subtle tabular-nums`, actions `flex flex-wrap gap-2`: primary
v1 `NextTutorialButton` "Next: Counter PDA Tutorial" (toast stub), outline `sm` "Copy receipt", ghost `sm`
"See summary" (opens the v1 Finish page), ghost `sm` "Back to tutorials". The step bar shows 4 checks and
a full hairline.

#### 6.5.8 Back to step pill

`absolute bottom-[calc(100%+12px)] left-1/2 z-10 -translate-x-1/2 h-7 rounded-full border
border-border-strong bg-surface-raised pr-3 pl-2.5 text-[0.75rem] font-act shadow-panel`, `ArrowDown` 14 +
"Back to step 3". In `animate-menu-in`, out 120 ms. Click scrolls to the live card (320 ms) and focuses its
first control.

### 6.6 Chips and composer

* Foot `shrink-0 border-t border-border px-5 pt-4 pb-5` (v1 `AskBox`).
* Chips: v1 row and chip (`h-6 rounded-full border border-border-strong px-2.5 text-[0.75rem]`). Chips
  that don't fit fold into a last chip "More" + `ChevronDown` 12, a DS `DropdownMenu` (`side="top"`). At
  420 the step 1 set shows two chips and More.
* Which chips, in order: after a failure the step's error chips; otherwise the step's chips, then
  "Explain this step"; "I'm stuck" is always the last item (visible if it fits, otherwise in More). No
  chips while an act runs or a win is live. A chip already asked is not offered again in that step.
* A chip sends its label as the learner's pill and the canned answer follows (v1 FLIP from the chip).
* Composer: DS `Composer` exactly as v1 `AskBox` uses it, one line at rest, grows to the DS cap. Enter
  sends, Shift+Enter is a new line. Never disabled.
* Placeholders: intro "Ask anything about this tutorial"; step "Ask about this step"; while running "Ask
  while it builds"; after the finish "Ask anything, or try Test again".
* A typed word that names the live action ("build", "deploy", "run", "call", "send", "next", "explain",
  alone or with "please") runs it, echoed as a pill. Anything else is a free question (7.7).

### 6.7 The code beat (what the learner sees when code is written)

At the frame a right pick resolves (500 ms after the click):

1. Chat: the question collapses to its record (200 ms), the pick rises in as a pill, the right text
   types out (about 500 ms), the wrote card rises in under it.
2. Workspace, on the same frame as the wrote card: the tab gets `+N`, the editor inserts the block,
   scrolls it to a third of its height, the lines arrive lit one after another (`pg-arrive`), the
   "Assistant wrote lines 5 to 13 +9" chip shows for 4 s, the landing line goes.
3. Nothing else moves. The terminal stays as it is. The next say or act follows 300 ms after the wrote
   card.

On the phone step 2 happens in the Code tab: its dot lights, and the wrote card's preview carries the
code in the chat. Reduced motion: no rise, no typing, no arrive; the lines show at the written tint.

---

## 7. Script: final copy for Hello Anchor

Notation: `[say]`, `[write]` (the assistant writes code without asking: boilerplate, a new file),
`[ask]`, `[act]`, `[result]`, `[win]`. Code is exactly `data.ts`: `LIB_BROKEN`, `LIB_FIXED`,
`LIB_NAMED`, `CLIENT_CALL`. Writes go through `insertBlock(file, block, step.target, step.start)`; the lit
lines come from `diffLines(before, after)` so only changed lines light. Beat ids are in brackets.

### 7.1 Step 1 · Program

Divider: "Step 1 of 4" · "Program" · "Define the hello instruction and log a message".

**[s1.boil] write**, posted on Start, about 1 s in:

> Every Anchor program opens with the same two lines: the import and the program's id. They're routine,
> so I've written them.

Wrote card: `src/lib.rs` · lines 1 to 3 · +2. Editor:

```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");
```

**[s1.what] say**:

> A program does its work in instructions: functions inside the module marked `#[program]`. Yours is
> `hello`, and all it does is leave a line in the program log.

**[s1.q1] ask** · Question · 1 of 4 · "Which line writes to the program log?" · code options · landing line
at line 5.

| # | Option | Feedback |
|---|---|---|
| 1 ✓ | `msg!("Hello, World!");` | "Yes. `msg!` writes to the program log, and the log travels with every transaction. I've put `hello` in the `#[program]` module." |
| 2 | `println!("Hello, World!");` | "`println!` prints to a terminal, and a program on Solana has none. On chain, a program talks through `msg!`." |
| 3 | `console.log("Hello, World!");` | "That's TypeScript, and you'll use it in the client in step 3. Inside a Rust program the log line comes from `msg!`." |

Hint (I'm stuck): "A program on Solana has no terminal to print to. Pick the line that writes to the
program log."

Right pick writes lines 5 to 13 (+9):

```rust
#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}
```

**[s1.build] say + act**:

> That's a whole program. Let's compile it.

Act: "Build lib.rs" · context "Compiles lib.rs on Playground's build server" · button "Build ⌘↵".

**Result: build failed (planned)**, from `checkOwn(LIB_BROKEN, LIB_FIXED)`:

```
error[E0412]: cannot find type `Hello` in this scope
 --> src/lib.rs:9:32
```

Editor: line 9 red, squiggle under `Hello`. Terminal opens. Assistant line inside the card:

> This one's on purpose. Every Anchor developer meets this error once, so let's meet it now.

Buttons: "Explain the error ⌘↵" (primary), "I'll fix it myself" (ghost). This failure does not clear
`firstTry`.

**[f1.explain] say + quote** (on Explain, echoed as the pill "Explain the error"), quote of line 9 with
`Hello` underlined:

> Line 9 asks for `Context<Hello>`: the accounts `hello` works with, described by a type called `Hello`.
> That type doesn't exist yet, so the compiler stops. `hello` reads no accounts, so the type can be empty.

**[f1.q2] ask** · Fix it · 2 of 4 · "So what does `Context<Hello>` need?" · prose options · landing line at
line 15.

| # | Option | Feedback |
|---|---|---|
| 1 ✓ | A struct named `Hello`, marked `#[derive(Accounts)]` | "Exactly. `#[derive(Accounts)]` tells Anchor which accounts an instruction expects. Empty is fine for `hello`." |
| 2 | A `Hello` account created on devnet | "`Hello` does describe accounts, but it's a type in your code. The compiler needs it before anything reaches devnet." |
| 3 | `Hello` imported from `anchor_lang` | "`Hello` isn't part of Anchor. It's yours to declare: the list of accounts `hello` reads." |

Hint: "The compiler wants a type called `Hello` that lists accounts. Which option declares one in your
own code?"

Right pick writes lines 15 and 16 (+3 with the blank line); the red line clears:

```rust
#[derive(Accounts)]
pub struct Hello {}
```

**[f1.build] say + act**:

> Build again. This time it should pass.

Act: "Build lib.rs" · context "Same build, now with the `Hello` struct" · "Build ⌘↵".

**Result: build successful** · meta "IDL: 1 instruction · hello · 1.6 s".

**[s1.win] win** · Step 1 done · pills `Hammer` "Built in 1.6 s", `Braces` "1 instruction", `Clock` "0:41":

> **Your program compiles.**
> The build also made its IDL: one instruction, `hello`. That's what clients will call.

Button "Next: Build & Deploy ↵".

Chips: "What is a Context?", "What does msg! do?", "Explain this step". After the failure: "Why does hello
need a struct?", "Where is this in the docs?", "Explain this step".

"I'll fix it myself": focuses the editor at the end of the file, the ghost landing line shows at line 15,
and the fix question still follows (Explain is skipped, the question carries the explanation's first
sentence as its say: "Line 9 asks for `Context<Hello>`, and `Hello` doesn't exist yet."). A passing build
resolves the open question as "typed by you" and goes to the win.

### 7.2 Step 2 · Build & Deploy

Divider: "Step 2 of 4" · "Build & Deploy" · "Deploy the program to devnet".

**[s2.why] say**:

> Right now your program is only a build: Playground compiled it, but nobody can call it yet. Deploying
> uploads it to devnet, Solana's public test network, where anyone can call it. It costs devnet SOL,
> test money with no value, and Playground tops your wallet up for free when it runs low.

**[s2.deploy] act**: "Deploy to devnet" · context "From your Playground wallet · free devnet SOL" ·
"Deploy ⌘↵". Stages: Funding your wallet (the first deploy only), Writing buffer, Deploying, Confirming
(1.1 s each). If lib.rs changed since the last build the title and button read "Build and deploy" and it
builds first.

**Result: deployed** · "1.27 devnet SOL from your wallet" · Program Id `9hJqVk…WxCvB`. At the same
moment the Test tab arrives in the workspace with its dot; the terminal opens (first deploy). The
faucet at its limit: section 1.3.

**[s2.win] win** · Step 2 done · pills `Rocket` "Live on devnet", `Coins` "Free devnet SOL", `FlaskConical` "Test
tab added":

> **Your program is live on devnet.**
> Its IDL also gave you a Test tab next to lib.rs: a form for every instruction. You'll use it in a
> moment.

Buttons "Next: Client ↵", outline "Open Test".

Chips: "What is devnet?", "What is devnet SOL?".

### 7.3 Step 3 · Client

Divider: "Step 3 of 4" · "Client" · "Call the instruction from the TypeScript client".

**[s3.file] write** (creates the file, the workspace opens the client.ts tab with the placeholder "The
assistant writes the call here, or type it yourself"):

> A client is code outside your program that sends it transactions, like the app your users will open.
> I've made `client/client.ts` for it.

Wrote card variant "Created client/client.ts".

**[s3.pg] say**:

> In Playground, `pg.program` already knows your program from its IDL: `pg.program.methods` has one
> method per instruction. The Test tab reads the same IDL and gives you a form for it.

**[s3.q3] ask** · Question · 3 of 4 · "Which line sends `hello` to devnet?" · code options · landing line
at line 1 of client.ts.

| # | Option | Feedback |
|---|---|---|
| 1 ✓ | `await pg.program.methods.hello().rpc()` | "Right. `.methods.hello()` builds the call and `.rpc()` sends it, then hands back the transaction's signature. I've added a line that prints it." |
| 2 | `await pg.program.hello()` | "Close. Instructions live under `.methods`, and nothing is sent until `.rpc()`." |
| 3 | `await fetch("/hello")` | "A program isn't a web server, so there's no URL to fetch. A client sends it a transaction, and `.rpc()` does that for you." |

Hint: "Instructions live under `.methods`, and something has to actually send the call."

Right pick writes `CLIENT_CALL` (client.ts lines 1 to 3, +3).

**[s3.run] say + act**:

> Run it and watch what comes back.

Act: "Run client.ts" · context "Sends one transaction to devnet · fee from your wallet" · "Run ⌘↵". Running
label "Sending hello to devnet". Terminal opens (first run): `clientLog`.

**Result: tx** · Confirmed · Sent from client.ts · big line `Program log: Hello, World!` with the peek of
lib.rs line 10 · signature `4sGjMW…HirAn` · 1,042 CU · ~0.4 s.

**[s3.win] win** · Step 3 done · pills `Cpu` "1,042 CU", `Timer` "~0.4 s", `Coins` "0.000005 SOL fee".
Signature moment 1:

> **Your program answered from devnet.**
> That `Hello, World!` is the `msg!` line from lib.rs, coming back in the transaction's logs. The Test
> tab makes the same call without code.

Buttons "Next: Name argument ↵", outline "Open Test".

**Test path instead of client.ts.** From the moment the Test tab exists, a Send on `hello` passes step 3,
whatever card is live: a result card "Sent from the Test form" posts at the live point, then the win with
this line instead:

> **Your program answered from devnet.**
> You called `hello` from the Test form, which Playground built from the IDL. In code, the same call is
> one line.

Buttons "Next: Name argument ↵", ghost "Write it in client.ts" (scrolls to the open question and focuses
it). An open question stays pickable until Next; then it becomes the record "· skipped, called from
Test".

Chips: "What is pg?", "What's an IDL?", "Can I test without code?".

### 7.4 Step 4 · Name argument

Divider: "Step 4 of 4" · "Name argument" · "Give hello a name argument and log it". The workspace switches
to lib.rs.

**[s4.why] say**:

> `hello` greets everyone the same way. Let's make it greet you. Instructions take arguments like any
> function, and Anchor turns them into bytes for you.

**[s4.q4] ask** · Question · 4 of 4 · "Where does the `name` argument go?" · prose options · lines 9 and 10
carry the landing tint (they exist, so no ghost text).

| # | Option | Feedback |
|---|---|---|
| 1 ✓ | After the `Context`, in `hello`'s arguments | "Yes. Arguments come after the `Context`. I've also put `name` in the log line: `msg!` fills each `{}` with the next value." |
| 2 | Inside the `Hello` struct | "`Hello` lists accounts, not values. A name is plain data, so `hello` takes it as an argument." |
| 3 | Inside the `msg!` call | "`msg!` will print the name, but `hello` has to receive it first. That's its argument list." |

Hint: "`hello` receives values the way any Rust function does: in its parameter list."

Right pick turns `LIB_FIXED` into `LIB_NAMED`; lines 9 and 10 light (+2):

```rust
    pub fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {
        msg!("Hello, {}!", name);
```

**[s4.ship] say + act**:

> Devnet still runs the old `hello`. Build and deploy again: the program keeps its address.

Act: "Build and deploy" · context "Upgrades 9hJqVk…WxCvB in place · from your wallet" · "Build and deploy ⌘↵". Stages:
Building, Writing buffer, Deploying (about 4.9 s).

**Result: upgraded** · "IDL: 1 instruction · hello(name: string)". The Test tab dot comes back; the form
now has `name  string` with NEW.

**[s4.call] say + act**:

> Now call it with your name. Here, or in the Test tab, where `name` just showed up.

Act: "Call hello" · `NameField` · context "Sends hello with your name · fee from your wallet" · "Call hello
⌘↵".

**Result: tx** · Confirmed · Sent from the chat · big line `Program log: Hello, Alex!` (whatever was typed,
from `helloSays`) · `3vZp8L…qPzLyM` · 1,187 CU. Signature moment 2. A Send from the Test form with a name
does the same.

**[s4.win] win** · Step 4 done · pills `Cpu` "1,187 CU", `Braces` "name: string", `Rocket` "Upgraded in
place" · no Next:

> **hello knows your name.**
> You changed an instruction, shipped the new version and called it with an argument.

Chips: "Which types work?", "Can I call it with someone else's name?", "Explain this step".

### 7.5 Finish card (400 ms after the step 4 win)

> **You built and called your first Solana program.**
> `Hello, Alex!` came back from devnet, in a transaction your wallet signed.

Printed receipt of the last call; "What you learned": Declaring a program and its instructions ·
Deploying with free devnet SOL · Calling a program from TypeScript · Passing arguments to an
instruction; stats "4 steps · 6 min 40 s · devnet only, nothing real spent" (from `startedAt` to
`finishedAt`). Chips: "Change
what hello says", "What should I build next?".

### 7.6 Records copy

| Card | Record line |
|---|---|
| Intro | "Hello Anchor · 4 steps · 10 min" |
| Ask | "✓ `msg!("Hello, World!");` · first try" (qualifiers 6.4) |
| Act | "Built in 1.6 s", "Deployed in 3.3 s", "Ran client.ts in 1.6 s", "Built and upgraded in 4.9 s", "Called hello as Alex" |
| Result fail | "Build failed · E0412 on line 9" |
| Win | "Step 1 done · Your program compiles · 41 s" |

### 7.7 Canned answers

Matching order for composer text: a typed action word (6.6), the "change what hello says" intent (8.7),
the step's chips by label, the step's `answers` by regex, the global list, then the fallback. A free
answer never changes files or runs anything.

Explain this step:

| Step | Answer |
|---|---|
| 1 | "This step writes the smallest Anchor program there is: one instruction, `hello`, that writes a line to the program log. I explain a piece, you pick the right line, and I write it in. Then the build checks it." |
| 2 | "Deploying puts your built program on devnet, Solana's public test network, at an address of its own: the program id. It's paid from your Playground wallet in free devnet SOL. Press Deploy and wait for the id." |
| 3 | "A client is code outside the program that sends it transactions. Here it's one line of TypeScript in `client.ts`. You can also call `hello` from the Test tab, no code needed." |
| 4 | "Instructions can take arguments after their `Context`. This step adds a `name` to `hello`, ships the new version and calls it with your name." |

Step chips (answers from `data.ts` where they exist):

| Chip | Answer |
|---|---|
| What is a Context? | `data.ts` as is |
| What does msg! do? | `data.ts` as is |
| Why does hello need a struct? | `data.ts` as is |
| Where is this in the docs? | `data.ts` as is |
| What is devnet? | `data.ts` as is |
| What is devnet SOL? | "Devnet is Solana's public test network. Its SOL is free and worth nothing, so you can deploy and call as much as you like. Playground keeps your wallet topped up from the devnet faucet." |
| What is pg? | `data.ts` as is |
| What's an IDL? | "The IDL is your program's interface, written by the build: its instructions, their arguments and accounts. Clients read it to know how to call you, and the Test tab is built from it." + follow up "Open Test" (after the deploy only) |
| Can I test without code? | "Yes. After the deploy, the Test tab has a form for each instruction. Fill the arguments and press Send." + follow up "Open Test" (after the deploy only) |
| Which types work? | `data.ts` as is |
| Can I call it with someone else's name? | "Sure. Type any name in Call hello or in the Test form. The program logs whatever it gets, up to 32 characters here." |
| What should I build next? | "Counter PDA Tutorial is a good next one: it stores a number on chain and changes it, so you meet accounts for real." + follow up "Next: Counter PDA Tutorial" (toast stub) |
| I'm stuck | On a live question: the question's hint + "Or press Skip and I'll write it." On a failed build: "Press Explain the error and I'll walk you through it." Otherwise the step's "Explain this step" answer |

Step regex answers (one each, short):

| Step | Match | Answer |
|---|---|---|
| 1 | `declare_id` | "`declare_id!` sets the address the program checks every call against. Playground puts in the real one when you deploy." |
| 1 | `why.*(fail\|error)` | the explain text of 7.1 |
| 3 | `rpc` | "`.rpc()` signs and sends the transaction, waits for devnet to confirm it and returns its signature." |
| 4 | `string\|bytes\|serial` | "Anchor writes the `String` as its length followed by its bytes, and reads it back the same way. You don't have to do anything." |

Global answers:

| Match | Answer |
|---|---|
| `where.*(menu\|nav\|files?\|terminal\|everything)` | "Everything's still here. The menu is folded into the icons on the left (⌘B). Files open from the arrow next to the file name (⌘E). The terminal is under the editor (⌘J)." + follow up "Show me" (opens the nav overlay) |
| `(create\|build\|make\|start).*(project\|app)` | "I can't set up a new project from here yet. Finish this one first: in 10 minutes you'll know the pieces every project needs. Afterwards, New project in the menu is where to start." |
| `(do it\|write it).*(for me\|yourself)` | On a live question: "Pick an answer and I'll write it, or press Skip and I'll write it straight away." Otherwise the step's Explain answer |
| anything else | "I can answer a handful of questions in this prototype, and that isn't one of them yet. Try one of these, or keep going with the step." with the step's chips refreshed |

---

## 8. Workspace

### 8.1 Head (44)

`flex h-11 items-stretch border-b border-border bg-surface-base`.

* Tabs: DS `EditorTabs` `h-11 flex-1 border-b-0!`. Order: `lib.rs`, `client.ts` (from step 3), `Test`
  (from the first deploy). Tabs never close.
* File tab (DS `EditorTab`, active `bg-surface` with the 2 px `bg-primary` top line): `FileCode` 14 tinted
  (`.rs` `text-syntax-string`, `.ts` `text-syntax-type`), label, `+N` `font-mono text-[0.6875rem]
  text-success tabular-nums` until the learner opens or edits the file.
* Tree toggle, on the active file tab only: a separate button after the label `grid size-[1.375rem]
  place-items-center rounded-md bg-surface-hover text-muted-foreground hover:bg-border-strong
  hover:text-foreground`, `NAV_ICONS.caret` 14, rotates 180 while open, `aria-label="Files"`,
  `aria-expanded`, tooltip "Files ⌘E". The label only selects the tab.
* Test tab: `FlaskConical` 14, "Test", a `size-1.5 rounded-full bg-brand-purple` dot until opened, two
  `animate-pulse-dot` pulses on arrival, then it rests. After step 4's upgrade the dot comes back once.
* Right `ml-auto flex items-center gap-1 pr-2`: ghost `sm` "Files" (`NAV_ICONS.folder`, `Kbd` ⌘E),
  divider `w-px h-4 bg-border mx-1`, ghost `sm` "Terminal" (lucide `SquareTerminal`, `Kbd` ⌘J). Both
  `aria-pressed` while their panel is open (`bg-surface-hover text-foreground`). Labels hide under 760 px
  of workspace (container query), icons and tooltips stay.
* No Build, Deploy or Run here.

### 8.2 What the workspace shows, per moment

| Moment | Tabs | Active | Editor | Terminal | Test |
|---|---|---|---|---|---|
| Intro | lib.rs | lib.rs | `LIB_NAMED` read only, chip "Finished program · preview" (lucide `Eye`) | bar "Ready" | none |
| Step 1 | lib.rs | lib.rs | empty, then lines 1 to 3, then the module, red line 9, then the struct | opens on the failure | none |
| Step 2 | lib.rs | lib.rs | `LIB_FIXED`, editable | deploy stages, Program Id, opens on the first deploy | arrives on deploy |
| Step 3 | lib.rs, client.ts, Test | client.ts | empty, then `CLIENT_CALL` | run log with `Program log: Hello, World!`, opens on the first run | `hello`, no args |
| Step 4 | lib.rs, client.ts, Test | lib.rs | `LIB_NAMED`, lines 9 and 10 lit | build, upgrade, call logs | `hello` with `name` and NEW |
| Finish | as step 4 | as left | as left, editable | as left | live, Send keeps working |

Every file stays editable (except the intro preview and the reference test file). What an edit to a
deployed file does is in 10.4.

### 8.3 Editor

v1 `desktop/Editor.tsx` metrics unchanged (58 px gutter, `font-mono text-code leading-[1.6]`, `py-2`,
`caret-brand-purple`).

| Line state | Classes | When |
|---|---|---|
| Written | `border-l-2 border-success/50 bg-success/5`, number `text-success/70` | lines the assistant wrote this beat, until the next action or an edit of those lines |
| Arriving | written + `pg-arrive` with `style={{ "--i": k }}` (40 ms per line): from `bg-success/18` to the written tint over 1400 ms | the frame the code lands, and again on "Show in" |
| Landing | `border-l-2 border-dashed border-brand-purple/70 bg-primary/8`; on an empty line the ghost text `font-sans text-caption text-subtle` "Your answer lands here" (`aria-hidden`, not part of the file) | while a question is open, at the first line its block takes (a dry run of `insertBlock`) |
| Error | `border-error bg-error/10` + `pg-squiggle` under the token | failed build |
| Error lit | `bg-error/20` | hovering the compiler line |
| Busy | `opacity-60`, read only (v1 `dim`) | while an act runs |

* "Assistant wrote" chip: `absolute top-3 right-4 z-10 h-7 rounded-full border border-border
  bg-surface-panel px-2.5 shadow-panel text-[0.75rem] text-muted-foreground animate-menu-in`:
  `AssistantMark` 14 `text-brand-purple`, "Assistant wrote lines 5 to 13", `font-mono text-success` "+9".
  Click scrolls to the lines. Fades after 4 s or on the first keystroke.
* On a write the editor scrolls the first written line to a third of its height (320 ms); no move if the
  block is already in view.
* Empty client.ts placeholder: "The assistant writes the call here, or type it yourself".

### 8.4 File tree (R6)

Popover (default): DS `Popover`, anchored to the active tab, `side="bottom" align="start"
sideOffset={4}`, `PopoverContent className="w-60 gap-0 p-1.5"`.

```
Files                               [pin]
Program
  ▾ src
      ▢ lib.rs                        ●
Client
  ▾ client
      ▢ client.ts                  Step 3
  ▾ tests
      ▢ anchor.test.ts                🔒
```

* Head `h-8 px-2`: "Files" `text-caption font-label text-muted-foreground`; pin ghost `icon-xs` lucide
  `Pin`, tooltip "Dock beside the editor" (hidden under 1100 px of workspace).
* Section labels `h-7 px-2 text-[0.75rem] text-subtle`: "Program", "Client" (the product explorer's
  sections).
* Rows: v1 `ROW` (`h-7 rounded-[6px] px-2 text-[0.8125rem] gap-2`, hover `bg-surface-hover`), indent 16
  per depth. Folders `NAV_ICONS.folder` `text-subtle`; files `FileCode` 15 tinted.
* Open file: `bg-surface-hover`, a 2 px `bg-primary` bar on the left inside the row.
* The live step's file: `ml-auto size-1.5 rounded-full bg-brand-purple`.
* client.ts before step 3: `opacity-50 cursor-default`, `Tag neutral` "Step 3", tooltip "Created in step 3".
* `tests/anchor.test.ts`: lucide `Lock` 12; opens read only with the editor chip "Not used in this
  tutorial". Content (the dummy from `research-product.md` 4):

```ts
// No imports needed: web3, anchor, pg and more are globally available

describe("hello_anchor", () => {
  it("says hello", async () => {
    const txHash = await pg.program.methods.hello("Playground").rpc();
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
    await pg.connection.confirmTransaction(txHash);
  });
});
```

* A pick opens the file as a tab and closes the popover. Arrows move, Enter opens, Esc closes and returns
  focus to the toggle. ⌘E toggles.
* Docked: a 220 px column left of the editor (`bg-surface-base border-r`), head `h-9` with `PinOff`, same
  rows, width animates 200 ms `ease-standard` and is laid out at 220 and clipped (Nav's technique). Saved
  in the store.

### 8.5 Terminal

DS `ConsoleDrawer` as v1 `Workspace` uses it.

* Bar: DS `h-bar` 28, `frosted border-t px-2.5 text-xs text-muted-foreground`; status dot `size-1.5`
  (idle `bg-muted-foreground/40`, busy `bg-brand-purple animate-pulse-dot`, ok `bg-success`, failed
  `bg-error`) + v1 `TerminalStatus` text ("Ready", "Build successful · IDL: 1 instruction · hello",
  "Deploying · Writing buffer", "Test passed"); right `Kbd` ⌘J and the DS chevron. A click anywhere on
  the bar opens it.
* Drawer `h-60` (240), resizable from 120 to 60 % of the workspace height by its top edge
  (`cursor-row-resize`, 9 px zone). Body v1 `TerminalBody` on `bg-surface-well`.
* Opens by itself on a failed build, the first deploy and the first client run. Otherwise as the learner
  left it.

### 8.6 Test tab with the IDL form (R7)

**As built (10/28): the Call panel** (`ui/TestForm.tsx`). The sketch further down is the earlier Test
tab; where they differ, this is current.

* Head: Form | IDL. A program with several instructions lists them as chips (mono 13, `rounded-[7px]`,
  the picked one filled), the latest added picked by default. After a deploy that brings whole
  instructions (Zero Copy), one neutral NEW sits on the new instruction's chip; in Hello Anchor's step
  4 it sits on the new `name` argument. No purple: the tag is neutral.
* The request: the signature as its heading (mono 15, `font-medium`, the program name muted), "In code"
  and the client's line in mono with no chip, then one row per argument (mono label over an input whose
  value is mono too, 13 on a desktop, 16 on a phone so iOS doesn't zoom), then the button, with the
  note that keeps it off (if any) right over it. Two sizes: 15 for the signature and the button, 13 for
  everything else, the chips included. 4 between the signature and "In code", 8 inside a unit (label and
  field, note and button), 16 between rows and from the chips to the signature, 24 between groups, 32
  before the response. Class lists that pair `text-code` or `text-caption` with a colour are plain
  strings: `cn` reads those size tokens as colours and drops them, which had the chips at 16 and the
  inputs at 14.
* Arguments: Hello Anchor's `name` is typed. A memory lesson starts each argument at what its step
  sends and the learner can change it; the program answers what was sent, as devnet would (a grow over
  10 KB at once is refused, a copy past 32 KB runs out of memory, a paint past the map's end panics).
  A value the client couldn't encode (a `u32` that isn't a whole number) isn't sent: a note says why,
  as it does for a call that would fail before it ran (a second `init`, a paint before the map is
  40 KB). Notes keep to 64ch.
* The response, at most 560 px: the status on the baseline ("Confirmed" or "Failed" at 15, "· Fee
  0.000005 SOL from your wallet", Explorer at the row's end), the program's words on a well with the
  `msg!` source in mono beside them, then the account (Lumberjack's player, Zero Copy's map) with no
  border of its own. When the fields have moved on from what the last call sent, the response dims and
  says "Last call, with text "gm", at 35000". A response from before the latest deploy isn't shown.
* A refused call puts the program's answer on the terminal bar, red dot: "Failed · NotEnoughEnergy ·
  error 6000" for an error of the program's own, else "Failed · an account can grow by at most 10,240
  bytes in one instruction". It said "Build failed · line 1" before (10/28): a call isn't a build.

Selecting the tab swaps the editor area for `flex-1 overflow-y-auto bg-surface`, inner `mx-auto w-full
max-w-[640px] px-6 py-5 flex flex-col gap-4`. The terminal bar stays under it.

```
Program  hello_anchor  9hJqVk…WxCvB ⧉ ↗                       {} View IDL
╭──────────────────────────────────────────────────────────────────────╮
│ ▾ hello(name: string)                                           NEW  │ 44
├──────────────────────────────────────────────────────────────────────┤
│ Args        name  string  [ Your name                     ]  NEW     │
│ Accounts    None. Hello {} takes no accounts                         │
│ Fee payer   ● 7xKXtg…osgAsU · your wallet                            │
├──────────────────────────────────────────────────────────────────────┤
│                                              Fill   [ ▶ Send  ↵ ]    │ 48
╰──────────────────────────────────────────────────────────────────────╯
┌ ✓ Confirmed · Sent from the Test form ───────────────────────────────┐
│ Program log: Hello, Alex!                                              │
│ 3vZp8L…qPzLyM ⧉ ↗ · 1,187 CU · fee 0.000005 SOL from your wallet · ~0.4 s │
└──────────────────────────────────────────────────────────────────────┘
```

* Program row `flex h-9 items-center gap-2 text-[0.8125rem]`: `text-caption text-subtle w-20` "Program",
  `font-mono text-foreground` "hello_anchor", v1 `ProgramId` short id with Copy and Explorer, `ml-auto`
  ghost `sm` `Braces` "View IDL".
* Instruction card `rounded-panel border border-border bg-surface-panel overflow-hidden`, open by default
  (DS `Collapsible`):
  * Head `h-11 px-4 gap-2`: `ChevronDown` 14, `font-mono text-[0.9375rem] text-syntax-function` "hello",
    signature `font-mono text-code text-subtle` "()" or "(name: string)", `ml-auto` `Tag brand` "New" on
    the first view after the IDL changed.
  * Body `grid grid-cols-[5.5rem_1fr] items-center gap-x-4 gap-y-3 border-t px-4 py-4`, labels
    `text-caption text-subtle`.
    * Args: before the upgrade `text-caption text-muted-foreground` "None"; after it `font-mono
      text-[0.8125rem]` "name", `text-[0.75rem] text-subtle` "string", DS `Input h-8 flex-1`
      placeholder "Your name", `maxLength={32}`, Enter sends, `Tag brand` "New", `animate-rise` on arrival.
    * Accounts: "None. `Hello {}` takes no accounts" (shown on purpose: it is the step 1 error, seen from
      the other side).
    * Fee payer: `size-[0.4375rem] rounded-full bg-success` + the wallet's short address, "your wallet".
  * Foot `h-12 justify-end gap-2 border-t px-4`: ghost `sm` "Fill" (puts "Playground", only when there are
    args), primary `Button` `Play` 12 filled + "Send" + `Kbd` ↵. Disabled while `name` is empty. Sending:
    `Spinner` + "Sending", form `opacity-60` read only.
* Result: the chat's tx result card component, `mt-1`, newest on top, older ones as records. Every Send
  also posts the same card into the chat at the live point, so the chat stays the record. Terminal lines,
  as the old Test tab plus the logs:

```
$ test hello --name "Alex"
Testing `hello`...
Program 9hJqVk…WxCvB invoke [1]
Program log: Instruction: Hello
Program log: Hello, Alex!
Program 9hJqVk…WxCvB consumed 1,187 of 200,000 compute units
Program 9hJqVk…WxCvB success
✅ Test passed.
```

* View IDL: DS `Dialog` `max-w-[560px]`, title "IDL · hello_anchor", the JSON read only in `CodeView` with
  a DS `CopyButton`. JSON after the first deploy:

```json
{
  "address": "9hJqVkRZ3t2nX8cPfLwA5mYbE7sGdT4uK1oNjQzWxCvB",
  "metadata": { "name": "hello_anchor", "version": "0.1.0", "spec": "0.1.0", "description": "Created with Anchor" },
  "instructions": [
    { "name": "hello", "discriminator": [149, 118, 59, 220, 196, 127, 161, 179], "accounts": [], "args": [] }
  ]
}
```

  After the step 4 upgrade `args` is `[{ "name": "name", "type": "string" }]`.
* Empty state (only reachable by a stale link before any deploy): DS `Empty`, `FlaskConical` 24 in a
  `size-12 rounded-panel bg-surface-raised` tile, "Nothing to call yet", "Deploy the program first. Once
  it is on devnet, its instructions show up here." No button.
* What passes a step: step 3 passes on a Send of `hello` once the program is deployed; step 4 passes on a
  Send with a non empty `name` once the upgrade landed. A Send in any other moment (step 2 win, after the
  finish) posts its result card and passes nothing.

### 8.7 "Change what hello says" (the client's story)

Intent: composer text that matches `(change|make|let).*(say|text|message|log|story)` or the chip "Change
what hello says".

1. Assistant: "Sure. What should `hello` say?" The composer placeholder becomes "Type what hello should
   say".
2. The learner types, say, "Once upon a time on devnet". Assistant: `apply` turn: "Here's line 10 with your
   text." with an `InlineDiff` of line 10 (`msg!("Once upon a time on devnet, {}!", name);` in step 4 and
   after, or `msg!("Once upon a time on devnet");` before step 4), buttons outline `sm` "Apply to lib.rs"
   and ghost `sm` "Keep it".
3. Apply writes the line (lit, wrote card), then a `nudge`: "You changed lib.rs after deploying. Devnet
   still runs the old version." with the act "Build and deploy". The next receipt shows the new text
   (`helloSays` reads the real `msg!`).
4. Never offered as "Apply and build". Before step 1 is built the act after Apply is "Build".

---

## 9. States

### 9.1 Phases

The phase says only whether something runs. What is offered comes from the live card.

```
idle       nothing running
building   build running            1.6 s
deploying  deploy stages running    3 × 1.1 s (build and deploy: 1.6 s build first)
running    client.ts running        1.6 s
calling    Call hello running       1.6 s
testing    Test Send running        1.6 s
```

One `<Runner/>` inside `<Store>` drives the timers, so desktop and phone advance the same way, whatever is
mounted.

### 9.2 What is live and what keys do

| Live card | ⌘↵ | Enter (no text field focused) | 1 to 3 | Composer | Editor |
|---|---|---|---|---|---|
| Intro | Start | Start | none | answers about the tutorial | preview, read only |
| Ask | Build, if the step has a build (the hand coder's path); otherwise nothing | picks the focused row | pick | free question; "1" typed alone is text | editable, landing line |
| Act idle | the act | none | none | free question or the act's word | editable |
| Act running | nothing | none | none | answers post under the running card | busy, read only |
| Result failed | Explain the error | none | none | error chips first | editable, error line |
| Win | Next | Next | none | free question | editable |
| Finish | Next tutorial (toast) | none | none | free question, "Change what hello says" | everything live |

### 9.3 Step goals

| Step | Passes when | Paths |
|---|---|---|
| 1 | a build of lib.rs passes `checkOwn` against `LIB_FIXED` | picks then Build; typed by hand then Build |
| 2 | a deploy lands | Deploy, or Build and deploy |
| 3 | `hello` is called on devnet | Run client.ts with a working call; Test Send |
| 4 | `hello(name)` is called with a non empty name on the upgraded program | Call hello; Test Send with `name` |

### 9.4 Keyboard summary (also the "Keyboard shortcuts" dialog)

⌘↵ run the live action · ↵ Start or Next · 1 2 3 pick · S skip the question · ⌘B menu · ⌘E files · ⌘J
terminal · ⌥↑ ⌥↓ previous and next step.

---

## 10. Edge cases

### 10.1 Typing code by hand

* While a question is open, if the file now `holds()` the question's block, the question resolves "typed
  by you", the assistant says "You beat me to it. That's exactly it." and the script continues.
* Build (⌘↵, the word "build") works whenever the step has a build, also with a question open. `checkOwn`
  decides: a pass resolves every open question of the step and goes to the win; a fail posts a failed
  result with Explain. After the explanation (`checkOwn`'s `explain`) comes a `say` with the outline
  button "Show me the fix", which writes the step's target lines and lights them.
* Code the target doesn't know: the next right pick appends its block at the end (v1 fallback), the wrote
  card says so and offers "Reset lib.rs to this step's start".
* "Type it myself": focuses the editor at the landing line. Phone: opens v1 `ContinueSheet`.

### 10.2 Wrong answers

First wrong: amber row, its reason, the rest pickable. Second wrong: amber, reason, the last row outlined
with "That leaves one. Pick it and I'll write the code." The learner still makes the last pick. Skip is
always there: it writes the code and records "· skipped". Nothing is scored.

### 10.3 Jumping back to step 1 from step 3

Click segment 1: the feed lands on the step 1 divider (flash), lib.rs opens at the top, the bar shows step
1 viewing and step 3 current, the "Back to step 3" pill shows. Step 1's cards are records; "Show in lib.rs"
works; step 3's live card waits.

### 10.4 Editing a file a later step depends on

After an edit to lib.rs once it has been deployed (`deployedLib` differs, whitespace aside), a `nudge`
posts at the live point (not where the learner scrolled to):

> You changed lib.rs after deploying. Devnet still runs the old version.

with the act "Build and deploy", and the amber dot on step 2 until it lands. A failing rebuild gets the
normal failed card with Explain and "Show me the fix". The current step's goal stays; a passed step stays
passed. One nudge at a time: further edits update it in place.

### 10.5 Nav expanded

Overlay over the chat with a scrim; the live card keeps its state; Esc returns focus. Picking Tutorials
leaves the tutorial (state saved, the list shows "Continue · Step N of 4"). Re-entering folds it again.

### 10.6 Reload

* Restores step, files, thread, open tab, Test values, docked tree, terminal open or closed; chat width
  and nav from their own keys.
* Opens scrolled to the live card. Turns render whole.
* An act that was running is not resumed: its card is idle again with "Interrupted by a reload. Run it
  again." Timers never survive a reload.
* A saved state with another `v` is dropped. Reset in the prototype bar does the same.

### 10.7 Smaller ones

* Old buttons can't fire: records have none.
* Empty name: Call hello and Send stay disabled; the field stops at 32.
* A free question while something runs: the answer posts under the running card; the result posts at the
  bottom when it lands and the feed follows it.
* Start over (⋯ menu): v1 dialog, then the intro card again and the preview in the workspace.
* Tablet frame (1152): same layout, chat 360, tree as popover only, nav overlay only.
* Two Sends in a row: the second waits for the first (button disabled while `testing`).

---

## 11. Phone alignment (R8)

Same thread, same turns, same cards, same copy, same order. The phone renders `ui/Conversation.tsx` like
the desktop. Only the workspace moves: into tabs, and the Test form into a drawer. The design lead's rule holds:
on a phone the assistant is the main surface.

```
┌────────────────────────────────────┐
│ ‹  Step 2 of 4 · Deploy   ━━━━░░  ✕ │  v1 header; the track opens the steps drawer
├────────────────────────────────────┤
│ [ Chat ]   Code •    Output         │  DS Segmented, Chat default
├────────────────────────────────────┤
│  feed: the same cards as desktop   │
│  ╭ Question · 1 of 4 ───────────╮  │
│  │ [1] msg!("Hello, World!");   │  │
│  │ [2] println!(...)            │  │
│  │ [3] console.log(...)         │  │
│  │ Type it myself · Skip        │  │
│  ╰──────────────────────────────╯  │
├────────────────────────────────────┤
│ chips, scroll sideways             │
│ [ Ask about this step          ↑ ] │
└────────────────────────────────────┘
```

* Header: v1 as is (back, "Step N of 4 · title", 4 segment track, close). The whole track is one button
  (44 px hit area) that opens a DS `Drawer` with the four step rows (step bar glyphs, `h-12`); a tap scrolls
  the chat to that divider. Back and ✕ go to the tutorials list, state kept.
* Tabs: Chat (the conversation and composer), Code (v1 `CodeView` read only with the same line states, a
  file switcher "lib.rs" + `NAV_ICONS.caret` opening a `Drawer` with the same tree rows at `h-11`), Output
  (terminal log, Program Id, receipt, and "Open Test" once deployed). A `size-1.5 bg-brand-purple` dot on
  Code when the assistant wrote since it was last viewed, on Output when a result arrived.
* The wrote card's preview is what keeps "the assistant wrote this" visible on the phone; "Show in
  lib.rs" switches to Code with the lines lit.
* Act cards in the feed, the button full width under the text, `h-11`. No bottom action zone.
* Test: a `Drawer` with the same `TestForm`, opened from "Open Test" in the chat or in Output.
* Deltas: feed `px-4`; option rows `min-h-12 py-3`, key hints hidden; foot buttons `h-11`; chips scroll
  sideways with a right edge fade (no More), hidden while the keyboard is up; composer grows to 4 lines;
  the editor chip is not shown (no editor on screen); terminal auto open rules are replaced by the Output
  dot.
* Gone on the phone: `screens/Overview.tsx` (the intro card replaces it, the finished program sits in
  Code), `ui/PredictZone.tsx`, `ui/ActionZone.tsx`, `sheets/LessonSheet.tsx`, `sheets/ExplainSheet.tsx`,
  the "Write with assistant" button. Kept: `screens/Gallery.tsx`, `screens/Finish.tsx` (the summary behind
  "See summary"), `sheets/ContinueSheet.tsx` (Type it myself).

---

## 12. Motion and the new CSS

Reused as they are: `animate-rise`, `animate-pop`, `animate-pulse-dot`, `animate-menu-in`, `pg-pass-ring`,
`pg-pass-tick`, `pg-sweep`, `pg-print`, `pg-squiggle`, `pg-key-flash`, `pg-kbd-flash`.

| Moment | Motion | Duration |
|---|---|---|
| New turn | `animate-rise` | 620 ms |
| Assistant text | types out whole | 400 to 600 ms |
| Right pick | key cap `animate-pop`, hold, collapse | 440, 500, 200 ms |
| Code written | `pg-arrive`, 40 ms per line | 1400 ms |
| Editor chip | `animate-menu-in`, fade after 4 s | 120 ms in, 160 ms out |
| Wrong pick | `pg-shake`, reason opens | 260 ms, 160 ms |
| Act running | determinate bar per stage | transform 300 ms |
| Win | card `animate-pop`, check draws, pills rise, hairline grows with `pg-sweep` | 440, 360, 620, 620 ms |
| Anchor jump | smooth scroll, `pg-anchor-flash` | 320 ms, 620 ms |
| Test tab arrives | `animate-rise` on the tab, 2 dot pulses | 620 ms, 2.4 s |
| Nav overlay, tree dock | width | 200 ms `ease-standard` |

New, only in `tutorial-v2/prototype.css`, in the file's comment voice:

```css
/* Code the assistant just wrote arrives bright, line after line, and settles to the resting green, so
   the eye finds it once and isn't pulled back to it after. --i is the line's place in the block */
.pg-arrive {
  animation: pg-arrive var(--duration-ground) var(--ease-out-value) both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
@keyframes pg-arrive {
  from {
    background-color: rgb(20 241 149 / 0.18);
  }
}

/* A step's divider, reached from the step bar, lights once so the eye lands on it */
.pg-anchor-flash {
  animation: pg-anchor-flash var(--duration-slow) var(--ease-out-value);
}
@keyframes pg-anchor-flash {
  from {
    background-color: rgb(153 69 255 / 0.12);
  }
}

/* A wrong pick shakes once, small, so it reads as "not that one" rather than as an error */
.pg-shake {
  animation: pg-shake 260ms var(--ease-standard-value);
}
@keyframes pg-shake {
  20% {
    transform: translateX(-3px);
  }
  45% {
    transform: translateX(3px);
  }
  70% {
    transform: translateX(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pg-arrive,
  .pg-anchor-flash,
  .pg-shake {
    animation: none;
  }
}
```

Reduced motion: no rise, no typing, no arrive, the scroll jumps, tints show at rest.

---

## 13. Accessibility

* Contrast on `#101011`: `READ` about 8.6 : 1, `text-muted-foreground` 7.2 : 1, `text-subtle` 3.6 : 1 (meta
  only). Wrong pick reasons are `text-muted-foreground`, not amber.
* One focus ring: `outline-2 outline-brand-purple` (Nav `FOCUS`) or the DS ring on DS buttons.
* The feed is `role="log" aria-live="polite"` (announces a turn after its typing completes); result
  cards `role="status"`; the question card has its own polite region for the reason.
* Option rows are buttons in a group labelled by the question; wrong rows `aria-disabled` with the reason
  in `aria-describedby`.
* Step bar: `nav` + buttons, `aria-current="step"` and `"location"`.
* Touch (tablet frame, phone): targets `pointer-coarse:min-h-11`, option rows 48.
* Works with Audio Narration (design lead's requirement): every action is a real button with a label; focus moves to the
  question card when it arrives.

---

## 14. Acceptance checklist

| Req | What is on screen | How to check (Playwright at 1440, 1280, 1152 frame, and 390) |
|---|---|---|
| R1 | Rail 52, chat 400 to 460, workspace fills. Start folds the nav; mark or ⌘B opens an overlay; pin docks; leaving unfolds. Tutorials is current on the rail | Three columns, no horizontal scroll. Open the nav: it covers the chat, Esc closes. Back to Tutorials: nav open |
| R2 | No Lesson or Assistant tabs. Step dividers in the feed; the 4 segment bar scrolls to them; "Back to step N" pill | After step 3, click segment 1: the feed lands on the step 1 divider, it flashes, nothing resets, the pill returns |
| R3 | One composer. Build, Deploy, Run, Call, Send, Explain, Next only on live cards (and ⌘↵), Send only in the Test form. No action in the workspace head. A free question gets text | Count text inputs to the assistant: one. Ask "What is a Context?": text, no button. Records have no buttons |
| R4 | 4 question cards (1.3, fix question, 3.3, 4.2), 3 options each; right writes code with lit lines and a wrote card; wrong gives one sentence and a retry; Type it myself; the planned failure with Explain in step 1 | Pick 2 then 1 on the first question: amber reason, then lines 5 to 13 lit and "+9". Build: E0412, Explain, the fix question, green |
| R5 | First change at about 1 s, first right answer about 15 s, first green build under 60 s; a win card on every step; finish card | Happy path timer: green build before 60 s after Start; four win cards with a drawn check and stat pills |
| R6 | Filled toggle next to the active file name, Files ⌘E in the head; popover tree; tabs stay | In step 3, open the tree from client.ts, pick lib.rs, read `hello`, go back with the client.ts tab |
| R7 | Test tab on the first deploy with a dot; form from the deployed IDL; Send; result inline, in the chat and in the terminal; the assistant names both routes in steps 3 and 4; Test Send passes 3 and 4 | Pass step 3 with Test only. In step 4 `name` shows only after the upgrade, with NEW. View IDL shows the JSON |
| R8 | Desktop has everything above. Phone renders the same conversation and cards, workspace in Code and Output, Test in a drawer | Same path on desktop and at 390: same messages, same order, same four questions |
| R9 | Rail icons with tooltips and the one time hint; toggle, Files and ⌘E for the tree; 28 px terminal bar always on screen, ⌘J; the canned "where is everything" answer with Show me | Ask "where is the menu": the answer and Show me opens the nav. Every hidden part is one click from the visible screen |
| R10 | Canned "create a project" answer in the tutorial. The tutorials list field only if built (D26) | Type "create a project that counts votes": the canned answer |

---

## 15. Implementation plan (v2 copy only)

All paths under `design-system/src/prototype/tutorial-v2/` unless absolute. Never touch
`src/prototype/tutorial`, `src/components`, `src/index.css`, `src/styles`, vite configs, `client` or
`solana-playground-product`. Run `npx tsc -b` from `design-system` after every task. No commits, pushes or
deploys.

P0 is the review path. P1 is in for Tuesday. P2 only if every acceptance check passes by Monday 18:00.

### 15.1 Order of work

**T1 Hygiene (P0)**

* `desktop/Nav.tsx`: keys `pg-proto-nav-open-v2`, `pg-proto-nav-open-tablet-v2`.
* `desktop/Column.tsx`: key `pg-proto-column-width-v2`.
* `PrototypeBar.tsx`: label "Solana Playground · tutorial flow v2 · prototype"; before Reset a ghost `sm`
  link "Open v1" with lucide `ArrowUpRight`, `href` `/prototype/tutorial/` plus `?view=desktop` or
  `?view=tablet` when that is the current view, same tab. v1 gets no link back.
* `design-system/prototype/tutorial-v2/index.html`: keep, title already v2.

**T2 Data (P0): `data.ts`**

* Keep the code constants, `TUTORIALS`, `PROGRAM_ID`, signatures, `Tx`, `programLog`, `clientLog`,
  `callLog`, `NAME_MAX`, `NEXT_TUTORIAL`. Export `LIB_FIXED` and `LIB_NAMED` (the intro preview).
* Replace `Step` and its content with the script of section 7:

```ts
export type Act = "build" | "deploy" | "buildDeploy" | "run" | "call"
export type Write = { file: string; block: string }
export type Quote = { file: string; line: number; mark?: string; tone: "lit" | "error" }

/** A question with three options. A right pick writes `writes` into the file; a wrong one gets its
 * own reason and the question stays open */
export type Ask = {
  kind: "ask"
  id: string
  kicker: "Question" | "Fix it"
  question: string
  options: [string, string, string]
  /** Options are code, shown highlighted, or prose */
  code: boolean
  answer: 0 | 1 | 2
  right: string
  /** Why each option is wrong, by index; null for the right one */
  why: [string | null, string | null, string | null]
  hint: string
  writes: Write
}

export type Beat =
  | { kind: "say"; id: string; text: string; quote?: Quote }
  | { kind: "write"; id: string; text: string; writes: Write | { create: string } }
  | Ask
  | { kind: "act"; id: string; act: Act; say?: string; title: string; context: string; button: string }
  | { kind: "win"; id: string; headline: string; line: string; stats: { icon: string; text: string }[]; extra?: "openTest" }

export type Step = {
  id: string
  title: string
  /** The step bar's label: Program, Deploy, Client, Name */
  short: string
  objective: string
  learned: string
  file: string
  start: string
  target: string
  beats: Beat[]
  /** What follows the planned failure: the explanation, the fixing question, the second build */
  onFail?: Beat[]
  deploy?: { stages: string[]; result: Pass }
  explainStep: string
  chips: Chip[]
  errorChips?: Chip[]
  answers?: { match: RegExp; answer: string; follow?: "openTest" | "showMenu" }[]
  /** The win's line when the step passed through the Test form */
  testWin?: string
}
```

* New `answers.ts`: the global answers, the intents (action words, change text, create project, do it for
  me, I'm stuck) and `answerFor(s, text)`.
* New `idl.ts`: `idlOf(lib)` returns the JSON of 8.6 from `deployedLib` (regex on `pub fn hello(` after
  `uncomment`; export `uncomment` from `check.ts`).
* Add `tests/anchor.test.ts` to the files as the read only reference.

**T3 Store (P0): `store.tsx`**

State:

```ts
export type Phase = "idle" | "building" | "deploying" | "running" | "calling" | "testing"

type TurnBase = { id: number; at: number; step: number } // step -1 for the intro
export type Turn = TurnBase &
  (
    | { kind: "intro"; done: boolean }
    | { kind: "anchor" }
    | { kind: "say"; beat?: string; text: string; quote?: Quote; follow?: "openTest" | "showMenu" | "showFix" | "writeClient" }
    | { kind: "you"; text: string; code?: boolean }
    | { kind: "ask"; beat: string; picks: number[]; done: null | "right" | "typed" | "skipped" | "test" }
    | { kind: "wrote"; file: string; lines: number[]; added: number; created?: boolean; appended?: boolean }
    | { kind: "act"; beat: string; act: Act; state: "live" | "running" | "done" | "interrupted"; took?: number }
    | { kind: "result"; act: Act | "test"; ok: boolean; log: string[]; fail?: Fail; tx?: Tx; from?: "client" | "chat" | "test" }
    | { kind: "win"; beat: string; done: boolean; took: number; via?: "test" }
    | { kind: "apply"; file: string; before: string; after: string; done: boolean }
    | { kind: "finish" }
  )

export type State = {
  v: 2
  screen: "gallery" | "step" | "finish"
  /** The live step, 0 to 3; the intro is `started: false` */
  step: number
  started: boolean
  files: Record<string, string>
  passed: boolean[]
  firstTry: boolean[]
  phase: Phase
  deployStage: number
  /** The whole conversation, persisted: it is the lesson, and desktop and phone read the same one */
  thread: Turn[]
  /** Next beat per step, and whether the step runs its onFail beats */
  cursor: { at: number; fail: boolean }[]
  error: { line: number; column?: number; span?: number; reason: string; explain?: string } | null
  /** Lines just written, for the editor's tint and chip */
  wrote: { file: string; lines: number[]; at: number } | null
  tabs: string[]
  /** The file shown, or "test" for the Test tab */
  open: string
  /** Files and the Test tab the learner has seen since their last change, for +N and the dot */
  seen: Record<string, boolean>
  tree: "closed" | "docked"
  terminal: boolean
  builtLib: string | null
  deployedLib: string | null
  /** When the IDL last changed, for the NEW tags */
  idlAt: number | null
  testName: string
  draft: string
  name: string | null
  txAt: number | null
  startedAt: number | null
  finishedAt: number | null
  /** When each step started and passed, for the divider's time and the win's clock */
  times: { from: number | null; to: number | null }[]
}
```

Actions (one reducer):

| Action | Effect |
|---|---|
| `open {screen}` | change screen; entering `step` folds the nav (event for `Nav`) |
| `start` | intro to record, `started`, anchor of step 1, `flow()` |
| `restart` | `initial()` on the step screen with the intro |
| `answer {beat, choice}` | right: you pill, `say` right, `insertBlock`, wrote turn, `wrote`, ask done, `flow()`; wrong: add to `picks`, nothing posted (the reason shows in the card) |
| `skip {beat}` | as right, record "skipped" |
| `act {act}` | the live act turn to running, phase by act; `build` snapshots nothing until it lands |
| `built` / `deployStage` / `ran` / `called` / `tested` | from the runner: result turn, act to done with `took`, `builtLib` / `deployedLib` / `idlAt`, then pass or `onFail`, then `flow()` |
| `explain` | you pill "Explain the error", the onFail explanation, cursor into `onFail`, `flow()` |
| `fixMyself` | cursor into `onFail` past the explanation, editor focus event |
| `showFix` | writes the step's target lines (hand typed failure path) |
| `ask {text}` | you pill, `answerFor()`; an action word dispatches that act instead; the change text intent posts its turns |
| `apply {id}` / `keep {id}` | the change text diff |
| `edit {file, code}` | writes the file; `holds()` check against the open question; `deployedLib` check for the nudge |
| `openFile {file}` / `openTest` / `tree {state}` / `terminal {open}` | workspace |
| `testName {text}` / `draft {text}` | fields |
| `next` | win to record, next step's anchor, `flow()`; after step 4 the finish turn is posted by `called`/`tested` |
| `goto {step}` | opens that step's file only (scrolling is the view's job); no state reset |

Helpers: `flow(s)` posts consecutive say and write beats from the cursor until an ask, act or win and
posts that one live; `liveAsk(s)`, `liveAct(s)`, `liveCard(s)` (replace `keys.ts primaryFor`); the planned
failure rule: a failed build while the cursor is on the step's first build and `onFail` exists keeps
`firstTry`.

Remove: `askPatch`, `predict`, `reviewFix`, `apply` (old), `buildOwn`, `retry`, `undo`, `close`,
`explained`, `openStep`, phases `patch`, `call`, `passed`, `failed`, `explain`, fields `applied`, `review`,
`undo`, `predicted`, `sheet`, `explain`, `explained`, `built`, `changedSincePass`, `failedOnce`, helpers
`patchFor`, `fixFor`, `freshLines`, `lastResult`, `passFor`, `targetFor`.

Persistence: same key, drop a state whose `v` is not 2, acts that were `running` become `interrupted`, the
phase is `idle`, typing only for turns with `at` later than page load. `deckState` becomes
`happyPath(upTo)` that replays the right answers through the reducer (P2, for screenshots via `?deck=`).

Runner: new `runner.tsx` with `<Runner/>` rendered by `<Store>`: one effect per running phase with the
timings of D29. Remove the timer effects from `desktop/Step.tsx` and `screens/StepScreen.tsx`.

`tx.ts`: `stepTx` and `lastTx` read the last tx result turn of the step, whatever path made it.

Probe (P0, scratchpad only): a jiti script in the scratchpad `v2/probe/` that replays the happy path, the
wrong pick path, the hand typed path and the Test path through the reducer and asserts the files equal
`LIB_FIXED`, `CLIENT_CALL`, `LIB_NAMED` at the right moments.

**T4 Shared conversation UI (P0), new in `ui/`**

| File | What |
|---|---|
| `ui/type.ts` | `READ`, `READ_CODE`, `HEADING` moved from `ui/LessonBlocks.tsx` |
| `ui/Conversation.tsx` | renders `thread` by kind, groups assistant turns under `AssistantHead`, `data-step-anchor` on dividers, auto follow, typing for new turns, the back pill, the viewing step for the bar (IntersectionObserver on dividers) |
| `ui/StepBar.tsx` | 6.3, with the hairline; used by the desktop chat and the phone steps drawer |
| `ui/turns/IntroCard.tsx` | 6.5.1 |
| `ui/turns/StepDivider.tsx` | anchor turn |
| `ui/turns/Say.tsx` | say, quote box, answer, nudge |
| `ui/turns/YouPill.tsx` | from `desktop/Feed.tsx` `Question` with the FLIP |
| `ui/turns/AskCard.tsx` | 6.5.2 live and record, keys |
| `ui/turns/WroteCard.tsx` | 6.5.3 |
| `ui/turns/ActCard.tsx` | 6.5.4, takes `workingLabel` from `ui/StepStatus.tsx` |
| `ui/turns/ResultCard.tsx` | 6.5.5, from `BuildLog`, `ProgramId`, `Receipt`, `HelloLine` |
| `ui/turns/WinCard.tsx` | 6.5.6, `PassMark` moved out of `ui/StepStatus.tsx` |
| `ui/turns/FinishCard.tsx` | 6.5.7, from `ui/FinishParts.tsx` |
| `ui/turns/ApplyCard.tsx` | 8.7, with `ui/InlineDiff.tsx` |
| `ui/ChatComposer.tsx` | chips with More and the composer, moved from `desktop/Feed.tsx` `AskBox` |
| `ui/TestForm.tsx` | 8.6 program row, instruction card, result list, View IDL dialog; desktop pane and phone drawer |
| `ui/FileTreeList.tsx` | 8.4 rows and sections; desktop popover and dock, phone drawer |

**T5 Desktop shell (P0)**

| File | Change |
|---|---|
| `desktop/Tutorial.tsx` (new) | replaces `desktop/Step.tsx` and `desktop/Overview.tsx`: `ChatColumn` + `Workspace`, local UI (jump, error hover, tree popover), keyboard of 9.2 |
| `desktop/ChatColumn.tsx` (new) | head (back, title, ⋯), `StepBar`, `Conversation`, `ChatComposer` inside `Column` |
| `desktop/Column.tsx` | `edge="right"` with the flipped drag, default `clamp(360, 400 + (W minus 1280) × 0.134, 480)`, min 340, max 560, workspace floor 560 |
| `desktop/DesktopApp.tsx` | screens `gallery`, `step` (Tutorial), `finish` (v1 page as the summary); Nav first, then main |
| `desktop/Nav.tsx` | fold on entry, auto on leave, overlay on desktop too, pin, Tutorials current, DS tooltips |
| `desktop/NavHint.tsx` (new) | 5, first time hint |
| `desktop/keys.ts` | ⌘↵, ↵, 1 to 3, S, ⌘E, ⌥↑ ⌥↓ on the live card; ⌘B and ⌘J stay |
| `desktop/Gallery.tsx`, `desktop/TutorialList.tsx`, `ui/StartHereBanner.tsx` | open the step screen (intro or live card), "Continue · Step N of 4" |

**T6 Workspace (P0)**

| File | Change |
|---|---|
| `desktop/Workspace.tsx` | head of 8.1 replaces the "Hello Anchor" header; `actions` and `tools` slots removed; children area: docked tree + editor or Test pane; `ConsoleDrawer` at 240 with the resize edge |
| `desktop/WorkspaceTabs.tsx` (new) | tabs, +N, tree toggle, Test tab with dot, Files ⌘E and Terminal ⌘J |
| `desktop/FileTree.tsx` (new) | popover and docked column around `ui/FileTreeList.tsx` |
| `desktop/Editor.tsx` | `arrive` lines with `--i`, landing line with ghost text, the "Assistant wrote" chip, written gutter numbers, intro and reference chips |
| `desktop/Terminal.tsx` | status lines for upgrade and Test, the Test log |
| `desktop/TestPane.tsx` (new) | `TestForm` in the editor area, empty state |
| `prototype.css` | the three classes of 12 |

**T7 Polish and verification (P0)**

Happy path, wrong pick path, hand typed path, Test path and reload on desktop at 1440 and 1280 and in the
tablet frame, headless Playwright from the scratchpad; time the first green build; screenshots of every
step into the scratchpad `v2/shots-v2/`.

**T8 Phone (P0, list in 15.3)**

**T9 P1 items**

"Change what hello says" (8.7), "I'm stuck" (D24), View IDL dialog, the nudge after an edit (10.4), docked
tree, ⌥↑ ⌥↓, Keyboard shortcuts dialog.

**T10 P2 items**

Tutorials list field (D26), `?deck=` replay, deleting the dead files below once nothing imports them.

### 15.2 Files to delete (after T5 and T8, when `tsc -b` shows nothing imports them)

`desktop/Step.tsx`, `desktop/Overview.tsx`, `desktop/ActionBar.tsx`, `desktop/QuickCheck.tsx`,
`desktop/Feed.tsx` (after `AskBox` and `Question` moved), `desktop/SetupChecklist.tsx` (after `ROW` and
`GLYPH` move into `Nav.tsx`), `ui/PredictZone.tsx`, `ui/ActionZone.tsx`, `ui/LessonBlocks.tsx` (after the
constants moved), `ui/StepStatus.tsx` (after `PassMark` and `workingLabel` moved), `sheets/LessonSheet.tsx`,
`sheets/ExplainSheet.tsx`, `screens/Overview.tsx`, and the files already dead in v1: `ui/GalleryParts.tsx`,
`ui/TutorialStatus.tsx`, `ui/StepProgress.tsx`, `ui/startHereArt.tsx`, `ui/startHereSurface.tsx`, the
`Transaction` export in `ui/ProgramId.tsx`. Kept: `desktop/StepTrack.tsx` (phone header), `ui/InlineDiff.tsx`
(8.7), `desktop/Finish.tsx` and `screens/Finish.tsx` (summary).

### 15.3 Phone alignment tasks

1. `App.tsx`: screens `gallery`, `step`, `finish`; drop `overview`.
2. `screens/StepScreen.tsx` rewrite: v1 header, DS `Segmented` Chat / Code / Output with dots, Chat =
   `Conversation` + `ChatComposer` (phone variant), no timers.
3. Header track as one button opening a `Drawer` with `StepBar` rows; a tap scrolls the chat to the
   divider.
4. Code tab: `CodeView` read only with the written, arriving, landing and error states; file switcher
   `Drawer` with `FileTreeList`.
5. Output tab: v1 `TerminalBody` content, Program Id, receipt, "Open Test" once deployed.
6. Test `Drawer` with `TestForm`; "Open Test" in the chat opens it.
7. "Type it myself" opens `ContinueSheet`; "Show in lib.rs" switches to Code and relights.
8. Phone deltas of 11 in the shared cards (`pointer-coarse` and a `phone` prop where needed).
9. `screens/Gallery.tsx` opens the step screen with the intro card.
10. Delete `screens/Overview.tsx`, `ui/PredictZone.tsx`, `ui/ActionZone.tsx`, `sheets/LessonSheet.tsx`,
    `sheets/ExplainSheet.tsx`.
11. Check at 390 × 844 and in the device frame: the same messages in the same order as desktop.

---

## 16. Demo path for Tuesday (about 4 minutes)

1. v1 for 10 seconds through "Open v1", then back: "this is what you saw, this is what you asked for".
2. Tutorials list, Hello Anchor: one layout, the nav folds, the hint, the finished program on the right.
3. Start: lines appear at once. Pick a wrong answer on purpose, then the right one: the code lands lit.
4. Build, the planned error, Explain, the fix question, green build: under a minute, first win card.
5. Deploy: the Test tab arrives. Step 3: skip client.ts, press Send in Test, the step passes. Show the
   file tree from client.ts back to lib.rs.
6. Step 4: the name question, Build and deploy, `name` appears in Test with NEW, call with "Alex": `Hello,
   Alex!` and the finish card with the receipt.
7. Type "change the text to a little story" (the client's story): Apply to lib.rs, Build and deploy, Send.
8. Click segment 1 to show going back; the phone at the end for 60 seconds: the same conversation.
