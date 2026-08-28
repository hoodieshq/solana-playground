# Lesson state as a transition table - design

**Date:** 2026-08-28 - **Status:** designed, not implemented
**Round brief:** `docs/internal/2026-08-28-lesson-architecture-brief.md`
**Supersedes:** the three tasks in `docs/lesson-paths-todo.md` on
`master-2.0` (rogaldh), which this design answers together rather than
separately
**Amends:** `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md`
section 3, and closes the hole D24's amendment left open
**Decision entry:** D25

Implementation is a later session. This file is the model and the
interface it implies; nothing here is code that exists.

## Why

#19 shipped the lesson feature and was amended in review before merging.
The objection was not that the ratchet is wrong but that **the criterion
for a complete step is illegible**: the flow lets a learner through only
once a step is complete, and nothing tells them what would complete it.
In hackathon conditions that strictness costs more than it buys, so an
escape valve and back/forward navigation were added.

The framing that set this round's scope: the reported bugs and the
objection are symptoms of one thing - no chain is worked through to the
end, neither what the learner sees nor what the machine allows. Those are
two views of one object, and designing either alone reproduces the
problem: a state machine the interface stays silent about, or signposting
the model underneath does not actually guarantee.

Three defects make the argument concrete. All three were reproduced on
2026-08-28 by compiling the merged `progress.ts` unmodified and running
it, and each traces to a guard - or to a distinction nobody drew - living
at a call site rather than in a table.

| | input | result |
| --- | --- | --- |
| **D-a** | reader stepped back to `s1`, then a deploy lands | thrown to `s4` |
| **D-b** | three `Continue` clicks on a `read` step behind the frontier | `["s1","s2","s2","s2","s2"]`, persisted |
| **D-c** | one `Continue` click on a fresh `read` step | writes the id into `completedStepIds` |

**D-c is the serious one and was not in the brief.** `continueRead`
appends a click to the field D24's amendment reserves for toolchain
proof. The shipped record therefore already claims verifications that
never happened, which means this round is not only preventing new bugs -
it is making D24's central claim true for the first time.

The test suite's coverage is worth stating exactly, because it is not
uniform. D-a and D-b are simply uncovered. D-c is **asserted**:
`progress.test.ts:325` reads
`expect(next.completedStepIds).toContain("client")` for a step advanced
by a click. So the 242 tests are not silent about the honesty defect;
they lock it in, and the implementation has to change that expectation
rather than add one beside it.

D-a is worth reading closely because it names the structural fault.
`advance` carries a comment promising that "a build landing while they
are back reviewing must not move them", and guards it with
`stayPut = wasAt && !completed.includes(wasAt.id)`. A step you can step
back onto is by definition already behind you, so the guard is false
exactly when it is needed and fires only for skipped steps. The question
it asks - *is this step anywhere in the completed set?* - is a question
about the accumulated fold. The question it needed to ask - *did this
step just become proved?* - is a question about the event. A reducer that
re-derives from scratch cannot ask the second one.

## Scope

**In.** One machine over the lesson: a per-step ledger and a cursor,
folded from an append-only event log; the interface that names each
step's criterion; provenance; where `attempted`, `attemptBaseline` and
the hint rungs land; the grader class `hello-anchor` step 3 needs.

**Out.** `PgFlow` keeps its own reducer and becomes an event source for
this machine - it drives the stepper, the stages and the chips, and
rewriting it buys the lesson nothing. `PgAssistant` is untouched. More
lesson paths, the upstream sync, M3/M4 and wallet-adapter each have their
own roadmap entry.

## Already decided, not re-litigated here

D24 and its amendment: the ledger is monotonic, the learner's position is
not; only the toolchain marks a step *proved*; a pass without proof is
recorded separately and upgrades to a real completion if a later build
satisfies the condition. Research findings 02 (verify against real
state), 03 (never author the answer key) and 04 (the unaided first
attempt) all still bind. `client/` stays byte-identical to upstream,
`server/` is not modified, and anything that changes state needs an
explicit human action in the UI.

## The model

The lesson's persisted record is an append-only series of events. Two
independent folds read it - a per-step **ledger** and a single **cursor**
- and nothing else is stored. `completedStepIds`, `skippedStepIds`,
`currentStepId`, `attempted` and `attemptBaseline` all disappear as
fields and come back as queries.

```
Mark      = open | proved | attested | passed
Position  = 0 .. n-1 | end

frontier  = the first step whose mark is open, or end if none is
legal(i)  = mark(i) != open
            or i = frontier
            or (i = end and frontier = end)
```

Splitting mark from position is the whole fix. They are two axes: what
the toolchain knows about a step, and where the learner is standing. A
single axis is what forced D-a's guard to ask the ledger a question about
position.

### Events

Every event carries `seq`, `at` and `actor`.

| event | meaning |
| --- | --- |
| `enter` | the lesson was opened or reloaded |
| `graded(S)` | evaluation flipped the steps in `S` to satisfied |
| `checked(i, false)` | an on-demand grader ran for `i` and said no |
| `pass(i)` | the learner moves past `i` without proof |
| `attest(i)` | the learner affirms an attestation-kind step |
| `move(j)` | the learner moves the cursor to `j` |
| `attempt` | a build started |
| `hint(i, rung)` | a hint rung was spent on `i` |

There is no `checked(i, true)`: an on-demand grader that says yes emits
`graded`, the same event the synchronous ones produce, so `checked` only
ever records a negative. One outcome, one event kind - a grader cannot
report success two different ways.

### The ledger fold

Which edges a step *has* is a function of its condition's grader class,
so an impossible transition has nothing to travel on.

| from | event | guard | to |
| --- | --- | --- | --- |
| `open` | `graded(S)`, `i` in `S` | condition is machine-graded and satisfied against current state | `proved` |
| `passed` | `graded(S)`, `i` in `S` | same - this is the repair the amendment promised | `proved` |
| `open` | `pass(i)` | `i = frontier` and condition is machine-graded and actor is human | `passed` |
| `open` | `attest(i)` | `i = frontier` and condition is an attestation and actor is human | `attested` |
| `proved` | - | - | terminal |
| `attested` | - | - | terminal: the kind has no machine criterion, so nothing can prove it |

Two consequences fall out rather than being enforced.

A mark-changing event requires `i = frontier`, and `mark(frontier)` is
`open` by definition, so **a step the learner walked back onto has no
mark edge at all**. That is D-b: the repeated `Continue` needs an edge
on a step that is already behind the learner, and there is none.

`attest` reaches `attested`, never `proved`, so **a click has no path
into the field D24 reserves for the toolchain**. That is D-c, and note
that it closes for a different reason than D-b: the click on a fresh
reading step is entirely legal, it simply cannot land where it lands
today. The distinction is not
cosmetic: `passed` and `attested` are different facts. `passed` says a
machine criterion existed and went unmet; `attested` says no machine
criterion existed and the learner said so themselves. Collapsing them
into "completed" is what made D-c invisible.

### The cursor fold

Every guard reads *this event*, never the accumulated fold.

| event | guard | cursor becomes |
| --- | --- | --- |
| `move(j)` | `legal(j)` | `j` |
| `graded(S)` | `cursor` in `S` | next legal position after `cursor` |
| `graded(S)` | `cursor` not in `S` | **unchanged** |
| `pass(i)` / `attest(i)` | its ledger edge fired | next legal position after `i` |
| `enter` | last `move` target is still legal | that target |
| `enter` | it is not, or there is none | `frontier` |

The third row is D-a, fixed by asking the question the old code could
not.

### Legality only grows

Marks only ever grow, so the legal set only ever grows: a position that
was reachable stays reachable forever. `open` positions are legal only at
the frontier, and a step leaving `open` becomes legal unconditionally;
the frontier itself only moves forward, adding positions.

This one property carries D24's amendment. It is the formal reason the
back and forward arrows can be pure navigation with no escape hatch, and
the reason restoring a cursor from a persisted log can never strand a
learner on a position the machine would now refuse. It also collapses
`enter`'s second row to a genuine first visit: a `move` target that was
legal when it was written is still legal on reload, so the fallback to
`frontier` fires only when the log holds no `move` at all.

Crossing an *unproved* step stays impossible without a recorded `pass`.
Crossing a step the toolchain proved out of order is just navigation. And
the cursor reaches `end` only when `frontier = end`, so a lesson cannot
be finished while any step is still `open`.

### Grading is per step, not forward from the frontier

Every `open` or `passed` step is graded against current state on every
change, whatever route the learner took. A grade is a fact about the
learner's code; gating it by position would make it a claim about their
route instead. Today's `advance` walks forward from the first unfinished
step and stops at the first unsatisfied one, so a learner who deploys
before reading has done provable work the ledger refuses to record until
they catch up.

### Events that carry no edge

`attempt`, `checked(i, false)` and `hint(i, rung)` change neither fold.
The table says so explicitly, because the two kinds of absence mean
opposite things: **an edge with no guard is a bug; an event with no edge
is a recorded fact.** They exist so that history can answer questions the
current state cannot.

## The three defects as impossible cases

| | why it cannot be written down |
| --- | --- |
| **D-a** | the cursor's `graded` guard reads the event's own set `S`. "Is this step in the completed set" is not a question any edge asks. |
| **D-b** | `attest` requires `i = frontier`, and a step reached by stepping back is not `open`. The band offers no control, and the event would be refused if it arrived anyway. |
| **D-c** | `proved` has exactly one guard - a satisfied machine criterion - and `attest` does not lead there. No click reaches `proved`. |

A fourth, latent one closes with them: `LeftPanel.tsx:68` computes
`activeStep = currentStep(...)` and pins **Skip this step** below the
rail whenever that is non-null, including on a step the learner stepped
back onto. Today that click records no skip but silently moves the cursor
forward one. Under the model there is no such edge, and the control is
absent rather than inert.

## Three grader classes

The condition type gains a classification, because the class determines
which edges exist and how the interface offers them.

| class | conditions | evaluated |
| --- | --- | --- |
| synchronous | `build-passes`, `deployed`, `idl` | on every state change, pure, free |
| on-demand | the step-3 grader below | only behind an explicit human click; may fail |
| attestation | `read` | never - the learner is the grader, and the record says so |

### What proves `hello-anchor` step 3

The mechanism is settled here; the curriculum wording is Cat's and is
left open below.

**Rejected - `match` against required snippets.** It is an answer key,
which research finding 03 rules out, and the tutorial's own code blocks
are illustrative fragments rather than per-step solutions. Many correct
programs differ in naming, ordering and formatting.

**Rejected for now - agent judgement.** It contradicts `prompt.ts`
("Never say a step is finished. The toolchain decides that, not you."),
which would have to be relaxed first, and it is non-deterministic. It
stays the last resort the todo called it.

**Chosen - the transaction's own logs**, and simpler than the todo
assumed. It needs no captured signature and no change to the Interact
stage: `getSignaturesForAddress(programId)` followed by `getTransaction`
yields `meta.logMessages` for the learner's own deployed program. That is
a real artifact of code they wrote, with no answer key, no new service
and no relaxed prompt rule.

Its cost is structural, which is why it belongs in this round rather than
a later one. The grader is **async and can fail**, so it cannot run on
every state change like the other three - hence the on-demand class, the
explicit button, and the `checked(i, false)` event. Designing the table
with three classes now means step 3 later changes only its condition;
designing it with synchronous graders alone means reopening this round to
add the class.

Cost when it runs: one RPC round trip on devnet, subject to public
rate limits, which is precisely why it is not on the evaluation path.

## Naming the criterion

### `target: Stage` is deleted as an authored field

It is the drift the todo predicted, and the drift is already shipped:
`hello-anchor` step 3 declares `target: "interact"` while
`verifyingStage({ kind: "read" })` returns `null`, so the rail reads
"aiming at interact" for a step no stage can prove. The stage comes from
the condition - `verifyingStage` in `verify.ts` already derives it - and
the one case where prose must supply a pointer is the attestation kind,
where it belongs inside the condition: `{ kind: "read"; at: Stage }`. A
mismatched target then has no way to be written down.

### The band's primary action is the criterion

One control, labelled by what proves the step, dispatching the same
`PgCommand` the header stepper does.

| condition | primary control | on success |
| --- | --- | --- |
| `idl`, `build-passes` | **Build to prove this** | `graded` arrives from the evaluator; the cursor moves |
| `deployed` | **Deploy to prove this** | same |
| on-demand | **Check for a transaction** | `graded`, or `checked(false)` and the band says what it looked for |
| attestation | **Mark as read** | `attest`, and the copy never says "verified" |

This demotes the assistant, which is the point. Today the band's primary
is either **Continue** or **I'm stuck**, and the observed failure was a
learner one unlabelled click from finishing who reached for the escape
valve instead. With the criterion as primary, **I'm stuck** sits beside
**Read the page** as a secondary - which is also guardrail 4 of D24, the
unaided first attempt, bought by layout rather than by a disabled button.

### Preconditions explain, they do not fail

A pure `readiness(condition, env)` returns either ready or a list of what
is missing, each entry carrying its own remedy: `needs-build` -> Build,
`needs-wallet` -> connect, `needs-cluster` -> switch,
`needs-sol` -> airdrop, `needs-transaction` -> the Interact stage. The
control stays live and the click opens the explainer; a dead control in a
demo is worse than a label that explains itself, and that is already the
band's rule for the hint button.

One nesting case is real and belongs in the spec rather than in a demo:
since #9 the devnet airdrop is behind GitHub sign-in, so `needs-sol`
resolves to "sign in, then airdrop". The explainer has to state the whole
chain or it becomes the next unlabelled click - the exact failure this
section exists to fix, one level down.

### The rail becomes an honest map

Rows at legal positions become clickable, because clicking one is pure
navigation and the model now proves that. Rows beyond the frontier are
not, and say why.

| mark | sub-line |
| --- | --- |
| `proved` | the step's own `verifiedBy` |
| `attested` | "you marked this read - not machine-checked" |
| `passed` | "skipped - not verified" |
| `open`, at the frontier | the verifying action |
| `open`, ahead | "not reached" |

The word *locked* leaves the product. Nothing is locked; some things are
unproved. The rail's earlier rule - rows deliberately not clickable,
because a click that skipped a verified step would give back what the
design exists to take away - is preserved by `legal`, not by refusing
navigation wholesale.

### One guard for both escape valves

`pass` exists only at the frontier, so the rail's pinned **Skip this
step** and the chat's skip card are the same edge with the same
precondition, and neither can be offered where the edge does not exist.

## Provenance and the agent

One entry point, `PgLesson.dispatch(event)`. The UI's calls carry
`actor: "learner"`. The agent gets the same entry point and the same
event shapes - which is the todo's ask, that the agent drive a lesson by
emitting the same series a human does rather than by calling setters -
with one rule the hard constraint forces:

**The agent emits no ledger event.** Writing a file, building, deploying
and now marking a step all change state, so the agent *proposes* through
the approval card it already uses, and the approved event lands as
`{ actor: "learner", via: "agent" }`.

That is what lets the record answer "who advanced this step" honestly:
not "the agent did", but "the learner accepted the agent's proposal at
14:22". An agent able to emit `pass` directly could walk a learner
through a whole path unaided, which is the failure the escape valve
exists to make visible, not to automate. Cursor `move` events follow the
same rule: proposing is automatic, moving is not.

## The hint ladder and `attempted`

Both become queries over the log, and both fields are deleted.

`attempted(i)` is "an `attempt` event exists after the cursor's **first**
arrival at `i`". First, not last, so walking back and forth cannot take a
spent ladder away - which is the behaviour today's comment protects with
a mutable `attemptBaseline` that no longer needs to exist.

`rung(i)` is the count of `hint(i, _)` events. This deletes the
module-static map in `hints.ts` and gives the research's "log which rung
it used" for free, since the counts are now in the record rather than in
memory.

One deliberate behaviour change: rungs survive a reload, where today's
comment calls resetting to rung one "the safe direction to be wrong in".
With the ladder persisted it is no longer wrong in either direction, and
the generous version was only generous by accident.

## Storage and migration

The record becomes `{ v: 2, events: [...] }` in the same
`.workspace/tutorial-storage.json` inside the lesson's own workspace.

A v1 record - `completedStepIds`, `skippedStepIds?`, `currentStepId` -
replays once into synthesized events carrying `at: null` and
`actor: "unknown"`, so the record never claims provenance it does not
have. D-b's duplicate ids collapse on the way in, because the second
event for a step whose mark is already terminal has no edge to travel on.

The mapping is per kind, not per field, because v1's `completedStepIds`
is exactly the field that conflates the two: an id there whose step is an
attestation kind was necessarily put there by a click, so it migrates to
`attested`; every other id migrates to `proved`; `skippedStepIds`
migrates to `passed`.

That reading is correct only while a step's grader class is what it was
when the record was written, which gives the migration one sequencing
constraint worth stating plainly: **a release must not both migrate v1
records and change a step's grader class.** Step 3 is the live case - if
it gains the on-demand grader in the same release, a click's completion
would migrate as `proved`. Ship them apart and the question does not
arise.

`loadFailed` stays exactly as it is and matters more than before:
appending to a log needs the prior log, so an unreadable file must still
refuse the write rather than replace a real record with a shorter one.

Past a cap the log is trimmed to a ledger snapshot plus recent events.
Only the attempt and rung queries need history, and both are step-local,
so a bounded tail is enough. The ledger snapshot is what keeps the trim
lossless in the sense that matters: no mark can be forgotten.

## Honesty map, changed

Two rows of the 2026-08-27 spec's map move, and one is a correction
rather than an addition.

| claim | was | becomes |
| --- | --- | --- |
| "a transaction ran your program" | not in this cut | real, on demand, from devnet logs |
| a step advanced by a click | recorded as completed | recorded as `attested`, and never as proof |

The second row is the one to watch in review. The band's copy was already
honest - "Not machine-checked" - and the record underneath it was not.
That is the same failure D24 caught in the opposite direction, where the
mechanism was honest and one word of copy undid it. Copy and record have
to agree, and only one of them is what the next session reads.

`docs/assistant-context.md` needs no change for this design: it describes
the stepper and the demo's honesty rule, and makes no claim about how a
lesson step is recorded. If the on-demand grader ships, the claim that
the product can see a transaction becomes true and the file should say
so.

## What this answers, from the brief

1. **The transition table** - both folds above, with the guard on every
   edge and the two edge-less event classes named.
2. **How the interface names the criterion** - the criterion becomes the
   band's primary action, derived from the condition rather than from an
   authored `target`, with preconditions explained rather than failed.
3. **What proves step 3** - the transaction's own logs, as the on-demand
   grader class. Mechanism settled; wording open, below.
4. **Whether monotonicity comes back** - it never left the ledger, and
   the ledger is where it was claimed. What was missing was the claim's
   *truth*: `continueRead` writes clicks into `completedStepIds` today.
   The model makes it true by construction. Position stays free, and
   stays free permanently, because `legal` only grows. `pass` remains
   available even once every step is machine-graded, because no grader is
   provably right - and once the criterion is legible, the *rate* of
   passes stops being noise and becomes the signal that a grader is
   wrong.
5. **Whether the agent drives lessons through the same events** - yes,
   through one entry point, with provenance on every event and no ledger
   event the agent may emit alone.
6. **Where `attempted` / `attemptBaseline` and the hint ladder land** -
   as queries over the event series, which is the question they were
   always asking.

## Testing

Properties, not just cases. Each of the three defects becomes a test that
fails to compile or has no API to express, which is the point of the
round; what remains testable is the machine itself.

- **Ledger monotonicity.** For any event series, no step's mark ever
  moves down the order `open < passed/attested < proved`, and `proved` is
  terminal. Property test over generated series.
- **Legality is monotone.** For any series, `legal(i)` never goes from
  true to false. This is the one that guarantees the arrows.
- **D-a as a regression.** Cursor on a step behind the frontier, a
  `graded` arrives naming other steps, cursor unchanged.
- **No click reaches `proved`.** Exhaustive over event kinds: only
  `graded` has an edge into `proved`.
- **`attest` only at the frontier**, and only for attestation kinds.
- **v1 migration** yields the same ledger the v1 fold would, with
  duplicates collapsed and no synthesized timestamp.
- **`attempted` survives review navigation** - back and forward over a
  step that has an attempt behind it keeps the ladder.
- The existing honesty guard test stays: a step that is not
  machine-checked never claims program behaviour was observed.

**One existing test has to be changed, not extended.**
`progress.test.ts:318-327` asserts that a click puts the step id in
`completedStepIds`. Its replacement asserts the opposite - a click
reaches `attested` and `completedStepIds` has no equivalent - and the
diff should be read as the point of the round rather than as churn.

## Open

**For Cat.** Step 3's wording, given that the mechanism can now prove a
real invocation. Does the step stay "call the instruction from the
TypeScript client" and gain a real criterion, or does it become "call it
and see your own log line", which is what the logs grader actually
checks? The band copy and `verifiedBy` follow from that answer; the
table does not.

## Prerequisites

None outside `client-v2/src/views/flow/lessons/`, plus the two call sites
that dispatch lesson navigation today - `left/LeftPanel.tsx` and
`sidebar/assistant/Component/Chat.tsx` - and `PgFlow` gaining nothing but
a subscriber. No `client/` change, no `server/` change, no new
dependency.
