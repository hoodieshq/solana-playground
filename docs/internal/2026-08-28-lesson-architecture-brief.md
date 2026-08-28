# Brief — lesson structure and architecture round (2026-08-28)

For the session that picks this up cold. Everything needed to start is
either here or named by path below; nothing from the conversation that
produced this brief is required.

## The task, in one sentence

Take `hello-anchor` as the one concrete lesson and design both of its
chains end to end -- what the learner sees and does, and what the machine
allows -- then write it as a spec. Implementation is a later session.

## Why now

#19 shipped the lesson feature on 2026-08-28 and rogaldh amended its
central claim in review, in 23 commits before merging. His objection: the
flow only lets a learner through once a step is complete, and **the
criterion for a complete step is itself unclear** -- so in hackathon
conditions the strictness costs more than it buys. He added an escape
valve and back/forward navigation, and wrote up what remains as three
tasks in `docs/lesson-paths-todo.md`, placed on `master-2.0` beside the
code on purpose.

The round is not a redo of the 2026-08-27 study. That study's own closing
section listed "Can every step actually be verified?" as an open
question, went ahead, and the complaint came back through exactly that
hole. This round closes it.

The framing that decided the scope: the reported bugs and objections are
all symptoms of one thing -- there is no chain worked through to the end,
neither at the UX level nor at the logic level. Those are two views of the
same object, and designing either alone reproduces the problem: a state
machine the interface stays silent about, or signposting that the model
underneath does not actually guarantee.

## Already decided — do not re-litigate

- **D24 and its amendment** (`docs/decisions.md`). The ledger is
  monotonic; the learner's position is not. Only the toolchain marks a
  step *proved*; a pass without proof is recorded separately and is
  upgraded to a real completion if a later build satisfies the condition.
  That separation is load-bearing and stays.
- **D21** set the stream order. Identity and tutorials have both landed.
- **Hard constraints** (CLAUDE.md): `client/` stays byte-identical to
  upstream; `server/` is not modified; anything that changes state needs
  an explicit human action in the UI.
- **No CI on the 2.0 line, by choice.** The line deploys nothing and the
  demos are local screencasts. Run the checks by hand:
  `npx tsc --noEmit`, `npx prettier --check "src/**/*.{ts,tsx}"`,
  `CI=true npx craco test --watchAll=false` from `client-v2/`.

## Read in this order

1. `docs/lesson-paths-todo.md` **on `master-2.0`** -- rogaldh's three
   tasks. This is the real brief; the present file only frames it.
2. `docs/decisions.md` -> D24, including the amendment at the end.
3. `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md` --
   note the superseded block at "Monotonic by construction".
4. `docs/research/2026-08-27-tutorials-as-scenario.md` -- the evidence
   base. Its findings 02 (verify against real state), 03 (never author
   the answer key) and 04 (the AI-out first attempt) still bind.
5. The code, all under `client-v2/src/views/flow/`: `lessons/progress.ts`,
   `lessons/store.ts`, `lessons/verify.ts`, `lessons/types.ts`,
   `lessons/paths/hello-anchor.ts`, `lessons/ObjectiveBand.tsx`,
   `lessons/StepRail.tsx`, `lessons/LessonRoute.tsx`, and
   `state/stage.ts` for `FlowState`.
6. Visual version of the 2026-08-27 study, if a picture helps:
   https://claude.ai/code/artifact/4c4d6654-3eec-4297-b072-8d74ff68378f

## Evidence to design against

Two defects found 2026-08-28 by probing `progress.ts` directly. Neither is
covered by the 242-test suite, and both are guards living at a call site
rather than in a transition table -- which is the argument for the round.
The design should make them unrepresentable rather than patched.

- `advance()` carries a comment promising that "a build landing while they
  are back reviewing must not move them". Its guard is
  `stayPut = wasAt && !completed.includes(wasAt.id)`, and a step you can
  step back onto is by definition already behind you. Reproduction:
  progress `{completedStepIds:["s1","s2"], currentStepId:"s1"}` plus a
  flow state satisfying a later step yields `currentStepId: null` -- the
  reader is thrown to the end of the lesson. The guard only ever fires for
  *skipped* steps.
- `continueRead()` does not check whether the step is already complete,
  and `ObjectiveBand` renders **Continue** for any `read` step including
  one reached by going back. Same input yields
  `completedStepIds: ["s1","s2","s1"]` -- one duplicate id per click,
  persisted into the lesson's workspace record.

## What the round has to answer

1. **The transition table.** Every state a step can be in, every edge
   between them, and the guard each edge carries. An edge with no guard is
   a bug the table makes visible.
2. **How the interface names the criterion.** Each `LessonStep` already
   carries `target: Stage`; today it is spent on a tooltip in
   `StepRail.tsx`. Promoting it to the action the objective band offers is
   the direct answer to the review. A `deploy` step has preconditions -- a
   funded wallet, a cluster -- so the control has to explain what is
   missing rather than fail on click.
3. **What proves `hello-anchor` step 3.** It is a `read` step because
   nothing free proves a client call happened. Task 1 of the todo lists
   three candidates: a `logs` kind reading the transaction's log messages,
   a snippet `match` kind behind an explicit button, or agent judgement as
   a last resort. **This needs Cat** -- it is a curriculum question before
   it is a technical one.
4. **Whether monotonicity comes back**, and under exactly what condition.
   It is a consequence of answering 2 and 3, not an independent choice.
5. **Whether the agent drives lessons through the same events as a human**,
   and whether each event carries provenance -- which is what would let
   the record say *who* advanced a step.
6. **Where `attempted` / `attemptBaseline` and the hint ladder land** in
   the new model. They exist because the ladder needs to know a build
   happened since the step began, which is a question about the event
   series, currently answered by a hand-maintained pair of fields.

## Out of scope

More lesson paths; the upstream sync; M3/M4; wallet-adapter. Each has its
own entry on the roadmap.

## Done looks like

A spec under `docs/superpowers/specs/` with the transition table written
out, plus a decision entry in `docs/decisions.md` recording what was
chosen and what was rejected. The two defects above appear in it as cases
the model makes impossible, not as a fix list. No implementation.

## Cold-start notes

- `master-2.0` tip at the time of writing: `1d908844`. The branch was
  rebased onto upstream `master` (`57479351`) on 2026-08-27 and
  force-pushed, so pre-rebase commit ids no longer resolve.
- Green baseline today: tsc clean, 242 unit tests in 27 suites. One known
  prettier miss in `Chat.tsx` that nobody has fixed yet.
- Node 22 lives at `~/.nvm/versions/node/v22.23.2/bin`.
- **Do not touch port 3000** -- another worktree's dev server uses it, and
  the GitHub OAuth app's callback is pinned there. Use another port.
- Working docs live on `context-archive`, never on a PR branch. The one
  exception is `docs/lesson-paths-todo.md`, which its author deliberately
  put on `master-2.0`.
