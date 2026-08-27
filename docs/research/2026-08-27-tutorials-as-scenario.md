# Research: tutorials as a scenario

**Date:** 2026-08-27 · **For:** roadmap *Next* step 1, D21 stream 2

Input for the tutorials brainstorm. Three surveys -- general interactive
coding platforms, web3/Solana learning platforms, and AI-tutor interaction
patterns -- plus a first-hand walkthrough of Cat's prototype and a read of
our own machinery. Written before any design decision, so the design can
be argued against evidence rather than taste.

---

## 1. Cat's prototype, walked through live

<https://solana-learning-playground.vercel.app/> -- a separate application,
not a fork of this repo. Opens on a modal reading "Unable to connect to
localnet"; behind it the app works. What it does:

- **Left panel, two tabs: `Programs` | `Tutorials`.** `Programs` is the
  authored path -- `01 MAKE THE CHAIN SPEAK / Hello, Solana`, `02 GIVE THE
  PROGRAM A MEMORY / Account Data`, `03 CHANGE STATE OVER TIME / Counter`.
  Each card carries an eyebrow (the *goal*, in caps) above the title (the
  *topic*). `Tutorials` is the upstream catalog -- Hello Anchor, Hello
  Seahorse, Hello Solana -- with `BEGINNER - ANCHOR` metadata eyebrows.
- **Header is our stepper.** Lesson title on the left, `Build` / `Deploy` /
  `Interact` on the right. Same three verbs as Flow.
- **A "next experiment" banner over the editor.** `NEXT HANDS-ON
  EXPERIMENT / Make it greet you / Give hello a name argument and include
  it in the onchain log.` with a `Do it ->` button. Clicking it sends a
  prepared prompt to the assistant, verbatim: *"Show me how to change hello
  so it accepts a name and logs a personal greeting. Propose the patch and
  explain each changed line."*
- **The answer is a teaching artifact, not a diff.** Sections: `Changed
  lines` (per file, each line quoted and then explained bullet by bullet --
  `name: String adds an instruction argument containing owned UTF-8 text`),
  then a `CHECK BEFORE APPLYING` card with a **`WHY`** field (*"Learn how an
  Anchor instruction receives serialized arguments from a TypeScript client
  and uses Rust formatting placeholders in Solana program logs"*), the file
  list with line counts, and `Not now` / `Apply change`.
- **The reply ends by proposing the next experiment.** *"Another cool
  experiment: after applying and rebuilding, change "Ada" to your own
  name -- or even an emoji -- and inspect the transaction logs."* The loop
  is self-feeding.
- **Console events carry `Explain` buttons.** Every line in the `NOTES`
  drawer -- including infrastructure noise like `RPC needs attention` --
  has one.
- **The assistant is lesson-aware.** Its greeting is authored per lesson
  ("Welcome to Hello, Solana. Deploy the smallest useful Anchor program and
  read its message from transaction logs."), it offers `Explain this file`
  and `What next?` as standing buttons, and the composer footer reads `Uses
  current files + Surfpool state`.
- **In the `Tutorials` tab the upstream markdown renders inside the
  assistant column**, with an inline `Build now` button in the prose.

**What is broken is their infrastructure, not the idea:** a hosted Surfpool
validator (`*.txtx.network:8899`) with a "play wallet". Irrelevant to us --
we deploy to devnet and do not touch `server/`.

**Read of the intent.** Three mechanics, in order of how much they carry:
(1) prepared prompts turn prose instructions into an executable next step;
(2) the assistant knows which lesson you are in and answers inside it;
(3) the path is authored -- goals, not topics, in a fixed order.

---

## 2. General interactive coding platforms

**Scrimba** -- the video player *is* the IDE. A "scrim" records editor
events rather than pixels, so pausing turns the frozen frame into a live
editable editor in place. Linear course/module/scrim with a sidebar
checklist; verification mostly honour-system, some challenge scrims run
assertions. *Steal:* zero context switch between watching an explanation
and having your hands on the exact code being explained.

**Codecademy** -- fixed three panes: instructions **left**, editor
**middle**, output **right**, in reading -> writing -> result order.
Numbered lessons inside courses inside career paths. The instruction
granularity is the point: "Declare a variable named x" answered in the
adjacent editor, with the target line usually stubbed. A checker runs on
Run (pattern/AST-ish, not full suites) and Next unlocks on pass. *Steal:*
the sub-30-second loop that comes from asking for exactly one small thing.

**JetBrains Academy / Hyperskill** -- IDE-native: real IntelliJ or a web
IDE, lesson text in a side tool window beside a real project tree. A
knowledge map / skill DAG rather than a list. **Real multi-file projects
built stage by stage** -- each stage adds a feature to the same growing
codebase, gated by automated test suites. *Steal:* one growing real project
across many stages; the tutorial state *is* the learner's working codebase.

**Exercism** -- no browser IDE at all: README + stub + test file, solved in
your own editor. Loosely ordered tracks. **You are given tests, not
instructions**, and must make them pass. Automated runner and static
analysers gate progress; **human mentors** add qualitative review. *Steal:*
decoupling "did it pass" (automated, instant) from "was it good" (human,
async).

**freeCodeCamp** -- historically three-pane; the 2025 curriculum diversified
into Workshops (guided steps), Lectures (video), Labs (blank editor + visible
failing test suite), Quizzes. Client-side test suites gate completion.
*Steal:* varying instructional density on purpose -- not every unit needs to
be interactive.

**StackBlitz TutorialKit** -- lesson pane beside an editor/preview/terminal
cluster running a real Node dev server in-browser via WebContainers.
Authored hierarchy of tutorial -> **parts -> chapters -> lessons**, each a
folder with `meta.md`. Each lesson can ship a starting file snapshot,
**prepared terminal commands that auto-run**, a focused file, and a "Show me
the answer" reveal. No built-in grading -- navigation is manual Next/Prev.
*Steal:* prepared commands pre-loaded into a *real* terminal are a strong
middle ground between "run this for me" and "type it yourself".

**Killercoda** (Katacoda successor) -- instructions in a side markdown pane,
a **real shell** in a live remote sandbox on the other side. Steps carry
foreground scripts (shown to the user) and background scripts (silent
setup). An explicit **CHECK** button runs `verify.sh`; exit code 0 unlocks
Next. *Steal:* verification against a real disposable environment's **actual
state** -- files, running services -- rather than pattern-matching source.

**A Tour of Go** -- two panes, prose left, one Go file right, output below.
Strictly linear, four sections, no accounts, progress not even saved. No
automated verification; you read the output yourself. *Steal:* radical
minimalism works for a short focused onramp -- the editor/output pairing
plus tight authored snippets carries it alone.

**Rustlings** -- no browser UI; the lesson is a comment header inside the
exercise source. Fix-the-broken-code / fill in `todo!()`. A file watcher
reruns `cargo` on save; done means it compiles and its tests pass. Hints are
opt-in (`h`). *Steal:* **the compiler itself is the tutor** -- diagnostics
treated as pedagogical content, zero custom grading infrastructure.

**Swift Playgrounds** -- native app, editor left, live App Preview right,
updating as you type. Guided books in fixed sequence. Verification is
experiential: you *see* whether your change did what was asked. *Steal:*
live visual preview as the verification mechanism for UI-facing work.

**CodeSandbox / Sandpack** -- not a curriculum but the embeddable toolkit
others build on: an editable pane plus live preview dropped **inline into
prose** at the paragraph that needs it. *Steal:* several small embedded
editors beat one big IDE screen when concepts are narrow.

**Josh Comeau's courses** -- long-form articles with inline interactive
widgets exactly where a concept needs play; the article *is* the course.
**Epic React** -- a local workshop app with numbered exercise files carrying
emoji-persona comment markers as inline scaffolding, plus a shipped solution
diff; verification is self-checked against that solution.

### Synthesis

1. **Simultaneous visibility beats alternation.** Every strong platform
   keeps lesson text, editor and output on screen at once. Scrimba is the
   one alternation model, and it works only because it collapses instruction
   and editor into literally the same surface -- alternation is acceptable
   only when it costs zero clicks.
2. **Automated verification gates beat honour-system Next.** Rustlings,
   Killercoda, Codecademy and Hyperskill all block on a real pass/fail.
   Verifying against **real state** (an actual VM, an actual compiler) is
   categorically stronger than pattern-matching text.
3. **Real toolchain beats simulated**, when affordable. Output is then never
   "trust me".
4. **One growing project beats disconnected snippets** past the intro level.
5. **Granularity of the ask matters more than richness of the prose.** One
   action per step; a big paragraph plus a blank file is where drop-off
   lives.
6. **Authored scaffolding is expensive and does not generalise -- that is
   the real trade-off.** Exercism's test-first catalog and Rustlings'
   broken-code format are cheapest to author and reuse existing infra as the
   verifier for free. TutorialKit, Epic React and Killercoda need hand-
   written starter snapshots, solutions and verify scripts per step: high
   quality, low scalability. **For a tutorial layer bolted onto an existing
   IDE, letting the real toolchain's own pass/fail be the verifier -- and
   authoring only the prompt plus the starter state -- is far cheaper to
   sustain.** In our case the build and deploy results can double as the
   verification signal instead of a hand-written checker.

---

## 3. Web3 and Solana learning platforms

**CryptoZombies** -- alive, free, funded by Optimism RetroPGF grants in
2024 and 2025. Split pane: Solidity editor beside a scrolling lesson
carrying a game narrative. Linear numbered chapters. Verification is
client-side: a JS checker inspects the source for required patterns and
runs it against an in-browser EVM. Nothing deploys anywhere real. *Worth
stealing:* the narrative hook per concept, and the fact that
"correct enough" checking costs zero infrastructure.

**Blueshift** (`learn.blueshift.gg`) -- the closest thing to our target and
the one the product brief says to integrate with rather than clone. Open
source (MIT, `blueshift-gg/blueshift-dashboard`), six locales. Taxonomy:
**courses** (sequenced lessons) feed **challenges** (Anchor Vault, Anchor
Flash Loan, Pinocchio Vault) organised into **paths** (Anchor Mastery). The
student writes a real program, builds it, deploys to devnet or mainnet
themselves, then uploads the built `.so`; Blueshift performs a **verified
build** -- checks the on-chain executable's hash against what the submitted
source compiles to -- and on a match **mints an on-chain NFT credential**.
The only automated on-chain verification found in the whole survey.

**LearnWeb3** -- tiered paths (freshman/sophomore/junior/senior), quests
awarding wallet-linked NFTs, plus a bounty board paying for mini-hackathons.
Verification looks lighter than Blueshift's -- quiz/checkpoint gating rather
than an on-chain state check. *Worth stealing:* the bridge from learning
into paid real work as a retention layer.

**SpeedRunEthereum / BuidlGuidl** -- a scaffold repo you run locally; the
site is a challenge catalog and submission tracker. Sequential challenges
unlock as you submit. You deploy to a public testnet, host a live frontend,
and submit the URL plus contract address; verification is **human review by
mentors**. Higher fidelity than a green checkmark, and it does not scale
without volunteers.

**Solana's own surfaces.** `solana.com/developers` is a video-first content
catalog with no editor and no verification -- it hands off to Playground.
**Playground's own tutorials** (this repo) are a workspace plus a stack of
markdown pages rendered beside the same editor and terminal used for real
projects -- no separate sandbox, files pre-seeded. Progress is a page
number and a `completed` flag in `.tutorial.json` inside the project's
virtual filesystem: no server, no account, no verification of any output.
"Completion" means the user reached the last page. Metadata (`level`,
`framework`, `languages`, up to three `categories`) drives a filterable
catalog, not a path. *Worth stealing:* the panel-beside-editor-in-the-real-IDE
model is already ours and already works. *Weakness not to inherit:* zero
verification means a tutorial can rot silently.

**Anchor's docs** -- `book.anchor-lang.com` (versioned per release) coexists
with a newer `anchor-lang.com/docs` and an explicitly deprecated older
tutorial set. This fork pins `anchor-lang` at 0.29, so any tutorial content
we write must pin to that version explicitly and never link a version-less
"latest".

**RareSkills** -- paid, cohort-based, human-verified; explicitly frames its
ZK bootcamp as teaching students to work *without* AI assistance, treating
AI-independence as the credential. **Alchemy University** -- free,
browser-based, sponsored by an RPC provider as an acquisition funnel.
**Encode Club** -- selective cohort bootcamps with NFT graduation
certificates. **Node Guardians** -- gamified "RPG for developers", quests
spanning Solidity/Cairo/Noir/Huff, CI-style automated grading, strong
game-progression UI. *Worth stealing:* quest variety beyond "write a
contract" (CTF-style, theory).

### The "deploy to a real network" question

Four strategies, in increasing fidelity:

1. **Mocked / in-browser VM** -- CryptoZombies. Static checks, no chain.
2. **Local scaffold plus public testnet** -- SpeedRunEthereum. Human review
   of a live URL.
3. **Hosted devnet, in-browser** -- Solana Playground and Blueshift. Browser-
   custodied keypair, no local toolchain.
4. **Devnet/mainnet plus verified-build hash check** -- Blueshift only.

Nobody expects a learner to run a local validator. Devnet is the ecosystem
norm, which is what this fork already targets.

### AI assistance in these platforms

Thin, and mostly *adjacent* rather than *inside*. General AI coding tools
(Cursor, Windsurf) consume the Solana MCP server for docs; standalone
products like Codigo pair a Solana-trained model with a cloud IDE. **None of
the education platforms surveyed ships a first-party in-lesson AI tutor.**
RareSkills sells the opposite. This is a genuine gap, not a catch-up.

### Why these platforms die

- **Content rot** -- lessons pinned to no version drift as SDKs move, and
  nothing fails automatically when they break.
- **Framework churn** -- Anchor's three parallel doc generations show the
  maintainer cost when the target iterates faster than the tutorial layer.
- **Incentive collapse** -- cohort platforms survive on revenue and stay
  fresh because humans run them; free content platforms without a funding
  hook (grant, sponsor, or a business behind them) quietly stop updating
  while the URL stays up.

### Synthesis

1. **Verification is the moat, not content.** The spectrum runs from "trust
   the user clicked Next" to "prove the deployed bytecode matches the
   lesson's source". Automated verification is also what makes content rot
   visible. *But:* Blueshift already solved this, and the brief says
   integrate rather than duplicate.
2. **Editor-adjacent beats a separate sandbox for Solana**, because
   compilation is server-side and cannot happen in the browser. A
   CryptoZombies-style in-browser VM is not available to us at all.
3. **Gamification is a retention lever, not a teaching mechanic.** It
   matters for open self-serve platforms and is absent from cohort models.
   Cosmetic gamification without real proof-of-skill ages badly.
4. **Devnet is the de facto standard.** No change needed to our deploy
   target.
5. **AI-as-tutor is an open field in web3 education.** Nobody has shipped
   the loop our milestone describes.
6. **Tension to hold:** verification fidelity trades against friction and
   infrastructure cost. The right move is not our own verification layer
   but making it easy for a lesson to hand off to Blueshift's already-
   verified challenges -- teaching and credentialing as separate concerns
   owned by separate products, which is what the brief already says.

---

## 4. AI tutors: interaction patterns

### Recurring UI patterns

- **Hint ladders / graduated disclosure.** Codecademy's assistant is
  instructed to hint first and escalate to the answer only if the learner
  persists. Academic work formalises a 0-4 ladder (nudge, clarify, partial
  code, worked step, full answer) with no level-skipping.
- **"Explain this error" as a standing button**, distinct from open chat.
  Codecademy, Boot.dev's "Boots", CodeSignal's "Cosmo" all put a one-click
  explain next to failing output, pre-loaded, so nothing is pasted.
- **Socratic default stance.** Khanmigo and Boots answer "what's the
  answer?" with "what have you tried?".
- **Context-aware chat that needs no re-explaining.** Cosmo is designed so
  "what am I doing wrong?" is a complete query.
- **AI checks your solution / generates the next exercise.**
- **Incentive friction.** Boot.dev charges XP/gems to talk to Boots, making
  reaching for AI a deliberate choice rather than the path of least
  resistance. A rare non-linguistic guardrail.

### What context they get

Lesson text, current code, error output -- universally. Codecademy adds the
checkpoint position and enforces language scope (won't answer an HTML
question inside a Python exercise), grounded by RAG in its own curriculum.
Adaptive-difficulty claims are common in marketing and rarely documented
mechanistically. The strongest evidence-based pattern is **narrow but
complete context** -- this exercise, this code, this error -- rather than
long-horizon learner modelling.

### Guardrails, and the evidence behind them

- **Prompt policy, not model capability, is the lever.** Codecademy notes
  the model "naturally tends to provide the best possible help"; the
  guardrail is purely instructional.
- **Protected AI-free moments matter as much as AI behaviour.** *The
  Effortless Trap* (2026), a large high-school RCT: unguarded AI access made
  students **17% worse** on unaided exams than a no-tool control; the same
  model redesigned to withhold answers erased the harm, and a well-placed
  tutor roughly doubled learning versus active-learning classrooms. Its
  prescription is AI-out zones for the first hard attempt and for
  assessment, with guarded AI confined to the middle.
- **Completion is not learning.** A 2025 study across ~275 CS students
  compared a context-aware hint tutor, unrestricted ChatGPT, and no AI: both
  AI conditions raised in-exercise scores, **neither improved measured
  learning gains**. "Less stress, better scores, same learning."
- **Stated hint-first policies degrade in practice.** JetBrains IDE
  telemetry (~1M events) shows students do adapt and stitch partial hints
  rather than blindly accepting them -- but a separate metacognition study
  found AI supplied exact solution code in **over half** of debugging
  interactions. The gap between intent and default model behaviour is a
  persistent implementation risk, not a one-time prompt fix.

### Prepared prompts

Documentation is thin outside K-12 teacher tooling. What is established:
authored prompt templates work when they **constrain what the AI may do in
that moment** -- task specificity, a clear endpoint, selective scaffolding
(stepwise or Socratic framing in ~59% of authored prompts in a 2026 study) --
not when they are generic "ask me anything" invitations. In shipped
products the analogous pattern is a **contextual button**: the button *is*
the prepared prompt, pre-filled with the right context. The likely failure
mode for literal "try asking..." prose is that it reads as filler and gets
ignored unless it is clickable and tied to a moment the learner is stuck.

### Tutor vs autocomplete -- the four decisions

1. **Direction of initiative.** A tutor questions before acting;
   autocomplete acts on the cursor unprompted. The biggest lever on the
   illusion of learning.
2. **Withholding is a designed policy**, layered over a model that would
   otherwise answer immediately.
3. **Protected zones where the AI is deliberately absent.** Autocomplete
   has no concept of turning itself off.
4. **Success measured by durable learning, not task completion.**

### Design principles for a lesson + editor + chat IDE

1. Give the AI a hint ladder **and log which rung it used** -- without
   turn-tracking, hint-first silently degrades to solve-first.
2. Wire "Explain this build error" as a first-class button next to the
   build output, pre-filled. Highest value, lowest risk, and it fits the
   build-error loop we already have.
3. Keep **Apply** a separate human action from **Explain** / **Suggest** --
   already our hard constraint, and also exactly what the learning research
   asks for.
4. Designate a **protected AI-out step**: require one unaided attempt before
   the "generate the patch" affordance appears. Cheap, and the one
   intervention with RCT evidence of erasing AI-induced skill loss.
5. **Scope context tightly and say so in the UI.** Trust depends on the
   learner believing it read *their* code and *their* error.
6. **Prefer contextual buttons over free-text "try asking" hints.** If
   prompts are embedded in lesson content, make them clickable and specific
   to that exact step.
7. **Do not measure success by "the build went green."**

**Failure modes to avoid:** AI that answers before the learner states what
they tried; an Apply that fires from the same click as Explain; measuring by
build-pass rate; decorative rather than clickable suggested prompts; and
treating behavioural-history difficulty adaptation as a checkbox -- no
surveyed platform shows rigorous evidence it beats simple lesson-position
plus error-type context.

---

## 5. Our own machinery, as it stands

Read on 2026-08-27, `client-v2/`:

| Piece | Where | Note |
| --- | --- | --- |
| Prepared-prompt transport | `PgAssistant.requestPrompt` / `onDidRequestPrompt` (`assistant/store.ts:290`) | Already exists for "Fix with assistant". Buffered when `Chat` is not mounted; `Flow.tsx:38` reopens the panel on a request. A "Do it ->" button is one call. |
| Assistant context | `ProjectContext` (`assistant/bridge/playground-bridge.ts:20`) | Documented interface for "what the assistant may know without asking". Lesson context is fields here, not new architecture. |
| Per-page code hook | `Page.onMount` (`components/Tutorial/types.ts:56`) | Upstream already uses it to switch the sidebar and create files. |
| Progress | `PgTutorial` (`utils/tutorial/tutorial.ts`) | `isStarted`, `pageNumber`, `completed`, plus `getStorage` for custom per-tutorial data. Persisted in the project filesystem. |
| Catalog metadata | `createTutorial` (`tutorials/create.tsx`) | `name`, `description`, `authors`, `level`, `framework`, `languages`, <=3 `categories`. No ordering concept. |
| Content inventory | `client-v2/public/tutorials/` | 17 markdown tutorials (`data.json` + `pages/N.md` + `files/`), fetched at runtime; 3 React tutorials bundled. |
| Flow left panel | `views/flow/left/LeftPanel.tsx` | Already a two-tab panel (`Projects` \| `Files`) -- the same construction Cat uses for `Programs` \| `Tutorials`. |
| Flow stages | `views/flow/stages/StageRouter.tsx` | `Write` stays mounted and is hidden with CSS; Build/Deploy/Interact are lazy and remount per switch. Adding a stage is one case. |

**The layout collision.** Upstream's `components/Tutorial/views/Main.tsx`
renders the **editor on the left** (`Resizable`, 60% default, 25-75% range)
and the **markdown page on the right**. Flow puts the assistant on the
right. Mounting the upstream component inside Flow therefore puts lesson
text and assistant on the same edge -- which is exactly what Cat's
prototype does by merging them into one column. That merge works but reads
as a compromise: the lesson scrolls away as the conversation grows.

**D16 is in this path.** Opening an unstarted tutorial from an active
project can crash or bounce to `/` -- a race in
`routes/tutorials/tutorials.tsx`'s `onDidChangeCurrentSidebarPage`
listener. Any design that makes lessons reachable from inside a live
project meets this bug on its first click.
