# Design

## Context

The "from" side, on `new-face-polish-2` at `bdd350ba7`:

- **Tutorials:**
  - `client-v2/src/tutorials/tutorials.ts` lists 16 tutorials: 13 are Markdown
    pages from `client/public/tutorials`, and 3 are custom React tutorials
    (`hello-anchor`, `hello-seahorse`, `hello-solana`);
  - `PgTutorial` (`client-v2/src/utils/tutorial/tutorial.ts`) stores the page
    and completion in `.tutorial.json` and a free-form store in
    `.workspace/tutorial-storage.json`;
  - levels are Beginner (9), Intermediate (6) and Advanced (1).
- **Lesson layer (`client-v2/src/views/flow/lessons/`):**
  - an objective band, a step rail, a reader over the Markdown page, and a
    phone bar;
  - an event-log store (`PgLesson`) under the key `lesson` in
    `tutorial-storage.json`;
  - mechanical step checks (`VerifyCondition`: `build-passes`, `deployed`,
    `idl`, `read`, in `lessons/types.ts` and `verify.ts`);
  - only `lessons/paths/hello-anchor.ts` has a path.
- **The assistant** (`client-v2/src/widgets/assistant/`) is a separate panel. It
  reads the lesson through `views/sidebar/assistant/bridge/lesson-context.ts`
  and offers the lesson's starter questions.
- **Runs:**
  - build: `commands/build/build.ts`, through `PgServer.build` to the
    settings' server;
  - deploy: `commands/deploy/deploy.ts`, through the BPF upgradeable loader,
    with `airdrop-top-up.ts` for funding;
  - Explorer URLs: `views/flow/stages/Deploy.tsx` already builds them;
  - IDL form: `views/sidebar/test/`, embedded in the Interact stage;
  - no Kora code exists.
- **Tutorials page:** `openspec/changes/tutorials-gallery-stand` holds the
  heading, search, filter, Start here banner and level groups as tasks 3.1 and
  3.2, still open.

The "to" side is Almaz's prototype (`almaz/mobile-tutorial-prototype`,
`design-system/src/prototype/tutorial-v2`, `fb4b8e9ee`) and its `SPEC.md`. The
prototype wins where they differ. The differences are a question batch for
Almaz, not decisions taken here.

## Goals / Non-Goals

**Goals:**

- One tutorial per level runs on the conversation for Breakpoint (11 Nov): Hello
  Anchor, Lumberjack, Zero Copy.
- A product person and an agent can add a tutorial with no code change.
- The work splits into tickets that run in parallel from 28 Oct, with the
  chain format → conversation engine → feed → steps kept short.

**Non-Goals:**

- Moving upstream's other 13 tutorials. They keep their pages.
- A live model writing the lesson. The lesson is scripted; only free
  questions reach the model.
- Kora, a DSL, an admin panel, or the assistant judging a step.

## Decisions

### D1. The definition is JSON, checked by a JSON Schema plus a few semantic rules

**Choice:** JSON, with a JSON Schema plus a few semantic rules. This is
Slava's decision of 27 Oct. Product people will write tutorials by talking to
an agent, the agent writes the file by following `AUTHORING.md`, and the file
works as soon as it lands.

**Why JSON:**

- An agent writes JSON reliably.
- A schema gives errors by path that the agent can fix by itself.
- A file in the repo needs no service.

**Alternatives:**

- A DSL: Sergey's suggestion, more readable, but it needs a parser and an
  editor story.
- An admin panel: needs a backend and storage.

Both stay with HOO-1792's later part. The shape follows the prototype's
`data.ts` (`Step`, `Beat`, `Ask`, `ActBeat`, `Win`, `Chip`), with regex
matches as strings and functions replaced by data. A step's files come as
whole contents at start and at target, so a writer never computes offsets.
Where a block lands is found at run time by placing the block between the
start and the target, as the prototype's `insertBlock` does.

### D2. One thread: scripted turns from the definition, free exchanges from the assistant

**Choice:** the feed merges two sources by time.

- **Scripted turns** come from the definition plus the learner's progress. The
  progress is the beat cursor, the resolution of each beat (picks, attempts,
  skipped, typed) and each result's facts (signature, program id, logs, times).
  Copy is never saved, only facts, so a fixed typo shows on reload. Progress is
  saved in `.workspace/tutorial-storage.json` under a new key, `conversation`,
  versioned. Project sync already carries this file.
- **Free questions and answers** are the assistant's own thread for that
  workspace, with its existing storage and chat sync. A tutorial workspace's
  thread runs in a tutorial mode:
  - its tools are reduced to reading files and proposing one change as an
    apply card;
  - its system context holds the tutorial, the step, the objective and the
    last result.

**Alternative:** one store holding both. It would duplicate the chat's
persistence and sync, which already handle versioning, merges and two devices.

### D3. The conversation engine is headless; the cards are a widget

**Choice:** the engine is a state machine plus a runner with no React in it.
The cards are a widget.

- **Engine:** a reducer over the definition and the progress, plus a runner
  that drives acts through the build, deploy and run commands. It sits in
  `client-v2/src/features/tutorial-conversation/model`, and the step-goal
  checks sit beside it.
- **Cards:** `widgets/tutorial-conversation`. Desktop and phone render the
  same card components.
- **Workspace:** `widgets/tutorial-workspace`, built from the existing editor,
  file tree, terminal and Test form.

This split lets the engine, the cards, the workspace and the runs land as
separate PRs against fixtures.

### D4. Runs reuse the editor's commands; the result facts come from the chain

**Build:** calls the build command and parses the first `error[Ennnn]` and
`--> file:line:col` from the server's output.

**Deploy:**

- calls the deploy command with the tutorial workspace's program keypair, so
  a redeploy is an upgrade;
- funding is the deploy's own airdrop top-up, reported as a stage;
- after a reload, a deploy is recognised by reading the program account's
  last deploy slot against the saved start time.

**Run and calls:**

- the run captures the signatures the wallet signs during it (a scoped hook on
  the wallet's send);
- each signature's logs are fetched from devnet, and the definition's log
  pattern picks the card's large line;
- the call act and Test Send reuse the Test form's instruction sender.

**Explorer:** links use the existing explorer URL helpers with the devnet
cluster.

**Server side:** none expected, since every step above is client-side.
Alexander owns any server change a ticket finds it needs.

### D5. Step checks extend the lesson layer's conditions

A goal is `build` (instructions present), `deploy` (landed) or `call`
(instruction, required non-empty arguments, log pattern, on the program built
from the target). This reuses `VerifyCondition`'s `build-passes`, `deployed`
and `idl` checks, adds `call`, and drops `read`. A self-attested step does not
exist in the conversation.

### D6. Prototype copy that names Kora is replaced

The definition carries the copy, so Hello Anchor's definition replaces the
Kora copy with the wallet path:

- "0 SOL, paid by Kora" becomes the real SOL spent;
- "Through Kora · 0 SOL, no wallet" becomes "From your Playground wallet on
  devnet";
- the chip "What is Kora?" becomes "Where does the SOL come from?".

The exact words are a question for Almaz. The specs only require that no copy
promises 0 SOL.

### D7. The old lesson layer retires when Hello Anchor moves

The band, rail, reader and phone bar of `client-v2-lessons` serve only Hello
Anchor's path. They are removed in one small PR once Hello Anchor opens in the
conversation, together with `PgLesson`'s store key and its `migrate.ts`.
Learners with an old record start Hello Anchor from its intro. There is
nothing to carry over: the old record holds marks, not code, and the files
stay in the workspace.

## Risks / Trade-offs

- **Real deploys are slower and can fail where the prototype never did:**
  airdrop limits, build server latency, devnet congestion. This puts the
  60-second first green build at risk.
  - Mitigation: stages show progress, failures have their own cards and
    retries, and e2e runs against devnet as an `env` case.
- **A live assistant can contradict the script.**
  - Mitigation: the tutorial mode's context holds the step and its objective,
    and its tools cannot write or run. The scripted chips answer the expected
    questions without a model.
- **The thread merge (D2) touches chat persistence, the riskiest code in the
  fork.**
  - Mitigation: the scripted side writes only `tutorial-storage.json`, and the
    assistant side uses its thread unchanged. Merging happens only at render.
- **Lumberjack's energy refills over time,** and Zero Copy's accounts are
  large: deploy and account rent cost more SOL, and a step may need to wait.
  - Mitigation: their content tickets confirm the costs on devnet first. A
    step that waits shows the wait as an act stage.
- **Almaz designs Lumberjack and Zero Copy from 28 Oct.** Their content
  tickets wait for his scripts, not for code.

## Migration Plan

1. The definition format, the engine and the frame land first. Hello Anchor
   runs in the conversation behind its definition, while the old lesson still
   serves it.
2. When Hello Anchor's definition opens the conversation on the integration
   branch, the old lesson layer is removed (D7).
3. Rollback: delete a tutorial's `tutorial.json`. Hello Anchor then falls back
   to upstream's pages, since the old lesson is gone by then.

## Open Questions

- The exact copy that replaces Kora's (D6) is for Almaz. It changes words in
  a definition, not the specs.
- Whether the "docs as browser-style tabs" Almaz showed on the call means
  documentation pages opening as tabs beside the files, or only the files. The
  prototype's code opens files only, so the specs hold files only until he
  answers.
