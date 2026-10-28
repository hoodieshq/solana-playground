# Tutorial prototype v2: the chat driven flow

A clickable prototype of the Hello Anchor tutorial, rebuilt after the client call on 10/23/2026. The
lesson is one conversation with the assistant: it explains a piece, asks a question with three answers,
writes the code once you pick the right one, and every action (Build, Deploy, Run, Call, Next) sits on
the latest card in the chat. Code, terminal and the Call panel stay on the right.

Since 10/27 it is the main tutorial prototype and runs more than one lesson: Hello Anchor, Lumberjack and Zero Copy,
each a module in `lessons/` (see `lessons/README.md` for the principles every lesson follows and how to
add one). What follows describes Hello Anchor, the first.

It is a design prototype, not production code. It exists to get the concept approved; the product
(`client-v2`) gets rebuilt from it with real data. Everything that would need a backend is mocked (see
"What is real and what is mocked").

| | |
|---|---|
| Desktop | `/prototype/tutorial-v2/?view=desktop` |
| Phone | `/prototype/tutorial-v2/` |
| Stand | https://playground-tutorial-prototype-v2.vercel.app (basic auth, ask Almaz for the login) |
| Spec | `SPEC.md` next to this file (decisions D1 to D30, script, states, edge cases) |
| Graph | `graph/graph.html`: GitHub shows only its source, so download it (Download raw file) and open it in a browser, then search "v2 Build History". `graph/GRAPH_REPORT.md` is its summary |
| Client deck | https://pg-tutorial-flow-deck-v2-p8ijnr.vercel.app |
| Branch | `almaz/mobile-tutorial-prototype` in `hoodieshq/solana-playground`, a reference branch that is never merged |
| v1 | `src/prototype/tutorial`, frozen: it is what the client saw on 10/23 |

## How it was built

**10/20 to 10/22, v1.** A phone prototype first, then desktop (specs and plans in
`docs/superpowers/specs` and `docs/superpowers/plans`). On 10/21 we picked the two signature moments:
your hello comes back from the network (`Program log: Hello, World!`, then `Hello, <name>!`) and a
transaction receipt instead of a bare key. On 10/22 desktop got the product's nav, the product's
tutorials list, Lesson and Assistant tabs and Add to file.

**10/23, client call.** The phone mechanic landed: pick one of three answers and the
assistant writes the code. Desktop did not: the tabs were hard to switch, there were too many ways into
the assistant, and desktop and phone felt like two products. What they asked for:

* the lesson as assistant messages in one pane, no tabs;
* the steps kept as anchors you can jump back to;
* action buttons inside the chat, and the assistant asking before it writes code;
* code, terminal and output on the other side;
* a small file switcher to get from `client.ts` back to `lib.rs`;
* fast wins, the nav out of the way.

v1 was frozen and v2 started as a copy next to it.

**10/23, research and spec.** Market, product, architecture and Mobbin research (Claude, ChatGPT,
Cursor, Mintlify, Replit, Bolt), an interaction design, then two visual directions: A "Quiet IDE" and B
"Assistant forward". They were scored against the client's remarks and what could be built by Tuesday.
B gave the moments (the question card as the hero, the visible write, the win card), A gave the frame
and the rules (client-v2's heads, one primary button style, the ring only on the one live card). The
result is the spec above: 30 decisions, the full script with final copy, states and edge cases.

**10/24 to 10/26, build.** Implemented in the v2 copy in the order of spec section 15, with a separate
Vite config and its own stand (`prototype/vercel-v2`, first commit `b23afe7b`). On 10/26 the desktop was
called done and became the reference; the phone was then redesigned to follow it (same conversation,
cards and copy, phone patterns on top).

**10/27, review fixes.** A walkthrough review fixed the flow bugs (`e480b820`), the tutorials search and
filter were redrawn after Claude Code's (`d0e65915`), the answer rows were realigned (`8eda5471`), and
the deck frames were recaptured for the client review.

**10/27 to 10/28, a lesson per tutorial.** v2 became the main tutorial prototype, and the flow was split
from Hello Anchor's script: each tutorial is now a lesson module in `lessons/`. Two were added, one a
level: Lumberjack (Intermediate, 4 steps: an account the program creates, its address as a PDA, an error
of your own, time on chain) and Zero Copy (Advanced, 3 steps: the stack, the heap, then zero copy).
Their steps and the decisions against the originals are in `lessons/README.md`. What the flow gained on
the way:

* the Call panel picks one instruction at a time from chips, and in Zero Copy its arguments can be
  edited: the program answers whatever is sent, as devnet would (8.6 in the spec);
* the costs are real devnet SOL from the learner's wallet instead of a sponsored 0 SOL (1.3);
* a "Fix it" question offers Build once lib.rs was changed by hand, so a partial fix gets its own
  compiler error (6.5.2);
* result cards keep their details under a Details row at the foot, and an action's record is hidden
  when its result card sits right under it (6.5.4, 6.5.5);
* the Call panel's type comes down to two sizes on one spacing scale, and the terminal bar names a
  refused call by the program's own error instead of a build failure.

## Running it

```bash
cd design-system
npm run dev -- --port 5173
```

Then open the desktop or phone address above. The view is picked by the address:

| Query | What you get |
|---|---|
| none | the phone; on a wide screen, the phone in a device frame |
| `?view=desktop` | the desktop screens |
| `?view=tablet` | the desktop screens in a tablet frame |
| `?embed` | inside an iframe, no frame of its own |
| `?deck=overview` or `?deck=N` | what a deck slide embeds: the tutorial page, or step N (0 based) with the steps before it done; nothing is saved |
| `?keep` | set when the prototype bar switches views, so the same screen reopens |
| `?demo=files` | the lesson with nine more files a full Anchor workspace has, to review the tab overflow (fade, All tabs) and Recent in the phone's file sheet; lasts for the browser tab, `?demo=off` ends it |
| `?demo=faucet` | the first deploy meets the devnet faucet's limit: Not enough devnet SOL, then Try again deploys; lasts for the browser tab, `?demo=off` ends it |

Progress is saved in `localStorage` under `pg-proto-tutorial-v2`. "Start over" in the ⋯ menu, or the
prototype bar, clears it. A saved state with another version (`v` in the state) is dropped.

Stand build and deploy: `prototype/vercel-v2/README.md`. Type check: `npx tsc --noEmit -p
tsconfig.app.json`.

## How the code is organised

One store drives both desktop and phone. They read the same conversation, so a step started on one
continues on the other.

| File | What it does |
|---|---|
| `store.tsx` | The state machine: one reducer, the `Turn` types of the conversation, the `Action`s the UI sends, and the queries the screens use (`liveCard`, `liveAsk`, `liveAct`). `thread` is the lesson itself and is persisted |
| `runner.tsx` | The single clock. It posts queued turns at a reading pace and moves a run (build, deploy, run, call) through its stages with the timings of spec D29 |
| `lessons/` | One module per tutorial: its script (`STEPS` with their beats: say, write, ask, act, win), the code at each point, its compiler errors and transactions. `lessons/README.md` has the principles |
| `data.ts`, `host.tsx` | The tutorials catalog and the open lesson, handed to everything else; which lesson is open, a store per lesson, and the hooks that open one |
| `answers.ts` | What the composer understands without a model: action words ("build", "deploy"), a few intents (I'm stuck, change what hello says) and canned answers |
| `check.ts` | A stand in for the compiler: compares the learner's typed code with the step's target and returns the error rustc would print, line and column included |
| `idl.ts`, `tx.ts`, `diff.ts` | The IDL read off `lib.rs` for the Call panel, the transactions a run leaves, line diffs for Show me the fix |
| `ui/turns/` | One component per card in the chat: `IntroCard`, `Say`, `AskCard` (the question), `WroteCard`, `ActCard`, `ResultCard`, `WinCard`, `ApplyCard`, `FinishCard` |
| `ui/` | Shared parts: `Conversation`, `ChatComposer`, `StepBar`, `Receipt`, `TestForm` (the IDL form), `CodeView`, `PhoneMenu` |
| `desktop/` | The desktop screens: `Nav` (icon rail), `Gallery` and `TutorialList`, `Tutorial` (chat column plus `Workspace` with `Editor`, `FileTree`, `Terminal`, `TestPane`) |
| `screens/`, `sheets/` | The phone screens and its bottom sheets (files, steps, Call) |
| `prototype.css` | The v2 dark theme over the design system tokens, the few keyframes, phone and desktop overrides |
| `view.ts`, `main.tsx` | Which view the address asks for, and the device frames |

Components come from the design system (`src/components/ui`), the same ones `client-v2` uses.

## What is real and what is mocked

Mocked, by design: the assistant has no model (canned answers in `answers.ts`, and anything past them
says it is the prototype's limit); there is no build server (`check.ts` plays the compiler, with a
planned first failure in step 1); there is no devnet (program id, signatures, fees, compute units and
times are examples in `data.ts`); the IDL is read off the file with a regex.

Who pays: the learner's Playground wallet, a devnet key pair Playground makes in the browser. The first
deploy tops it up from the devnet faucet ("Funding your wallet", `AIRDROP`), and every cost is shown as
devnet SOL from that wallet: `DEPLOY_COST`, `UPGRADE_COST` and `TX_FEE` in `lessons/common.ts`. When
the faucet is at its limit, the deploy fails with "Not enough devnet SOL", the wallet's address and a
link to the faucet, and the deploy card offers Try again. Kora is not in the copy any more: its default
policy will not pay a learner's deploy rent.

Real: the flow, every state and its copy, the timings, keyboard paths, the editor (you can type the
code yourself and get checked), the IDL driven Call form, and the layout at 1152 to 1728 wide and on
phones.

## Still open

* Not in the prototype yet: GitHub sign in, the share link, the model name on the assistant, Home, New
  project and Programs pages (stubs), failure states of a real network.
* Breakpoint ideas not built: a live wall of hellos, and a "say hello to my program" share link a
  friend can call without a wallet.
* Typing only part of an answer keeps the current behaviour on purpose.
