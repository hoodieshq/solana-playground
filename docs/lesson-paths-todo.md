# Lesson paths — open work

Decisions taken so far live in the code they govern. What follows is not
yet decided.

---

# Task — Decide how a step verifies against a reference solution

**Context.** Lesson steps are graded by `VerifyCondition` in
`client-v2/src/views/flow/lessons/types.ts`, evaluated by
`isSatisfied` in `verify.ts`. Three of the four kinds read real toolchain
artefacts — `build-passes`, `deployed`, `idl`. The fourth, `read`, proves
nothing and advances on a click.

**Problem.** `hello-anchor` step 3 ("Call the instruction from the
TypeScript client") is a `read` step because nothing free proves a client
call happened. Two approaches have been floated and neither is settled:
compare the learner's file against a reference solution, or hand the file
to the agent and ask it to judge. Reference text is brittle — many correct
programs differ in naming, ordering and formatting — and the tutorial's own
code blocks are illustrative fragments, not per-step answers. Agent
judgement contradicts `prompt.ts` ("Never say a step is finished. The
toolchain decides that, not you.") and is non-deterministic.

**Why to solve.** It is the last step in the path with no proof behind it,
so the ratchet's central claim — that the toolchain grades, not a click —
has a hole in it. `hello-anchor.ts:11-13` already names log verification as
the intended fix, so leaving it open also leaves that comment unactioned.

**Potential Solution.** Three candidates, in the order they preserve the
"toolchain grades it" property:

- A `logs` kind that reads the recent transaction's log messages for the
  program's own output. Page 3 already walks the learner through
  `solana confirm -v` to see `Hello, World!`, so the artefact exists.
- A `match` kind carrying required snippets rather than whole-file text,
  normalised for whitespace and comments, reached from a **Check current
  solution** button rather than evaluated on every state change.
- Agent judgement, which needs the `prompt.ts` rule relaxed first and
  should be treated as a last resort.

---

# Task — Point the learner at the interface element a step needs them to use

**Context.** `ObjectiveBand.tsx` states the step's objective and what
verifies it, and offers **Read the page** and the hint ladder. Each
`LessonStep` carries a `target: Stage` (`write` / `build` / `deploy` /
`interact`), currently read only for a tooltip in `StepRail.tsx:42`.

**Problem.** Nothing connects the objective to the control that satisfies
it. A learner told "the built interface shows a hello instruction" is not
told that Build is what produces it, nor where Build is. The same gap is
sharper for `deploy`, which needs a funded wallet and a cluster selection
before the button does anything — preconditions the band never mentions.
Observed in practice: after the assistant wrote the file, the learner had
no signal that a build was the next move, and reached for the escape valve
instead.

**Why to solve.** The escape valve exists for learners who are genuinely
stuck; a learner who is one unlabelled click from finishing the step is not
stuck, and every skip taken for want of a signpost is a step the toolchain
never got to prove.

**Potential Solution.** Promote `target` from tooltip to affordance: the
band gains the verifying action beside **Read the page**, dispatching the
same `PgCommand` the header stepper uses. Where the action has
preconditions — a deploy needing a wallet and SOL — the control explains
what is missing rather than failing on click, which is the "explainer
triggered by the action" shape. `PgFlow` already holds per-stage status, so
the band can render running and failed states from state it can see.

---

# Task — Give the tutorial flow a real StateMachine abstraction (hoodieshq)

**Context.** Three stores drive a lesson today, each a hand-rolled reducer
over its own event union: `PgFlow` (`views/flow/state/stage.ts`) for the
dev loop, `PgLesson` (`views/flow/lessons/store.ts`) for step position,
and `PgAssistant` (`views/sidebar/assistant/store.ts`) for the chat. They
are coupled only by `PgLesson` subscribing to `PgFlow.onDidChange` and
re-grading from scratch. Position lives in a single `currentStepId`
pointer plus two id arrays (`completedStepIds`, `skippedStepIds`).

**Problem.** Legal transitions are not stated anywhere, so each new
affordance re-derives them and gets them subtly wrong. Concrete instances
already hit: the chat offered its skip valve straight after a patch, moving
the learner to `deploy` with nothing built; and `stepBack` cleared the skip
mark on the step it returned to, which lowered the frontier and left the
learner unable to return without recording a skip they never took. Both
were guard conditions scattered across call sites rather than a machine
refusing an illegal edge. There is also no history: the stores keep only
current state, so nothing can replay how a learner got here, and the
assistant is handed a snapshot (`bridge/lesson-context.ts`) with no notion
of the sequence that produced it.

**Why to solve.** The step ratchet is the feature's central claim — the
toolchain grades, not a click. Every guard living at a call site is another
place that claim can be broken by a new button, and the two bugs above were
both found by a learner rather than by a test. A machine that enumerates
its transitions makes the illegal ones unrepresentable, and makes agent
navigation reviewable: the agent should drive the lesson by emitting the
same event series a human does, not by calling setters.

**Potential Solution.** One `StateMachine` over an explicit transition
table, with the existing reducers as its first citizens:

- Enumerate states and edges — the four `Stage`s, the per-step
  `locked / current / completed / skipped` lifecycle, and the guards each
  edge carries (`isSatisfied` for a verified edge, an explicit skip for an
  unproven one). An edge with no guard is a bug the table makes visible.
- Keep the event log, not just the fold. `PgFlow` and `PgLesson` are
  already pure reducers over event unions, so persisting the events and
  folding on read is a small change — and it is what buys history: back
  becomes replay to an earlier index rather than a mutation, which is the
  honest version of the arrows now in `ObjectiveBand`.
- Let the agent emit events through the same entry point as the UI, so an
  agent-driven step and a learner-driven step are the same series and
  differ only in provenance. Provenance on each event also gives the
  record something it cannot state today: who advanced this step.
- Fold `attempted` / `attemptBaseline` into the machine. They exist because
  the hint ladder needs to know a build happened since the step began — a
  question about the event series that is currently answered by a
  hand-maintained pair of fields.
