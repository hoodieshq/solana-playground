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
