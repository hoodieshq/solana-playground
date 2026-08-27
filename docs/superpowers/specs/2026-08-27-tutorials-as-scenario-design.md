# Tutorials as a scenario — design

Date: 2026-08-27 · Stream: D21 Focus 3 (tutorials), roadmap *Next* step 1
Branch: `feat/lesson-paths` (to create) · Status: concept approved in chat,
spec for review

Concept canvas: <https://claude.ai/code/artifact/c1b8b3f5-80e2-4bc5-88f1-0540723038d9>
Research: `docs/research/2026-08-27-tutorials-as-scenario.md`

## Why

Upstream already ships tutorials: a workspace plus markdown pages beside
the editor, Previous and Next, a `completed` flag. Twenty of them exist.
Nothing about that is broken, and nothing about it is interesting: the
only completion signal is that the user clicked Next, so a tutorial
cannot tell whether anyone learned anything and cannot tell its
maintainers when it has rotted.

Three findings from the surveys remove most of the design space:

1. **Verification against real state beats pattern-matching.** Killercoda
   gates a step on a script's exit code against a live VM; Rustlings on
   the actual compiler; Blueshift on a hash match between deployed
   bytecode and source. CryptoZombies inspects source text and proves
   nothing.
2. **Authored scaffolding is what kills these products.** Hand-written
   answer keys and verify scripts per step are why content rots when the
   authors move on.
3. **Unguarded AI measurably harms learning.** *The Effortless Trap*
   (2026) RCT: free AI access left students 17% worse on unaided exams
   than a no-tool control; withholding answers erased the harm. A second
   2025 study across ~275 CS students found AI raised in-exercise scores
   and did not improve learning at all.

We already own a grader and did not notice. Flow derives stage state from
real events — `PgCommand.build`, `PgBuildOutput`, `PgCommand.deploy` — and
an Anchor build regenerates `PgProgramInfo.idl`. So a step can be
finished by the toolchain rather than by a click, we author only the
objective and the prompt, and the assistant becomes the coach rather than
the judge. No web3 education platform ships an in-lesson AI tutor today,
so this is a first rather than a catch-up.

## Scope of this cut

- **One lesson path**, built on the existing `hello-anchor` tutorial:
  four steps, no new prose beyond objectives and prompts.
- **Step rail** in the Flow left panel, **objective band** above the
  editor, **reader overlay** for the full page.
- **Verification** from `FlowState` and `PgProgramInfo.idl` only.
- **One project switcher.** The header menu absorbs the rail's Projects
  tab; `ProjectsTab.tsx` is deleted.
- **Lesson-aware assistant**: lesson fields in `ProjectContext`, a
  three-rung hint ladder, and a first-attempt guard.
- **D16 fixed**, because every path here routes through the bug.

Non-goals, designed on paper below: verification by reading transaction
logs, cross-lesson curves and prerequisites, per-user progress, any
credential of ours, and converting the other nineteen tutorials — they
keep working unchanged.

## Architecture

Everything is new files under `client-v2/src/views/flow/lessons/` except
three edits: `Flow.tsx` and `LeftPanel.tsx` (both fork-owned) and one
branch in `routes/tutorials/tutorials.tsx`, which we have to edit anyway
for D16.

### 1. `lessons/types.ts` and `lessons/registry.ts` — the metadata layer

Upstream prose stays upstream. A path is an ordered list of steps that
points at it. The shapes live in `types.ts`, validation and lookup in
`registry.ts`, and the content itself in `lessons/paths/<tutorial>.ts`,
so adding a path never means editing the machinery.

```ts
export type VerifyCondition =
  | { kind: "build-passes" }
  | { kind: "deployed" }
  | { kind: "idl"; instruction: string; arg?: string; account?: string }
  | { kind: "read" };

export interface LessonStep {
  /** Stable across edits: it is the progress storage key */
  id: string;
  /** The single ask, one action (finding 05: granularity beats prose) */
  objective: string;
  /** What proves it, in the learner's words, shown under the objective */
  verifiedBy: string;
  /** Machine-checkable form of the same claim */
  verify: VerifyCondition;
  /** Which stage the stepper marks while this step is current */
  target: Stage;
  /** Full prose for the reader overlay */
  readPage?: () => string | Promise<string>;
  /** Rung-1 through rung-3 prompts sent to the assistant */
  hints: [string, string, string];
}

export interface LessonPath {
  /** Must be a name in `TUTORIALS` */
  tutorial: string;
  steps: LessonStep[];
}
```

`readPage` is a loader rather than a path string because the two tutorial
kinds store prose differently: a custom tutorial's pages are
`require()`d from `src/tutorials/<name>/pages/N.md` at build time, while a
markdown tutorial's are fetched at runtime from
`public/tutorials/<name>/pages/N.md`. A loader lets one path module
express either without the reader knowing which.

`hello-anchor` is a custom tutorial, so its four pages come from
`src/tutorials/hello-anchor/pages/`. Objectives are ours; the prose is
upstream's, unedited. The path over it:

| # | Objective | Verify | Target |
| --- | --- | --- | --- |
| 1 | Define the `hello` instruction and log a message | `idl` — instruction `hello` | build |
| 2 | Deploy it to devnet | `deployed` | deploy |
| 3 | Call it from the TypeScript client | `read` | interact |
| 4 | Give `hello` a `name` argument and log it | `idl` — instruction `hello`, arg `name` | build |

Step 1 is satisfied only once a build has run, which is the point: you
find out by building, not by asserting. Step 3 is a reading step because
nothing free proves a client call happened — the honest limit of this
cut, and the first thing log verification would fix.

**Validation at module load**, the way `createTutorial` already throws on
too many categories: every `tutorial` must exist in `TUTORIALS`, step ids
must be unique within a path, and an `idl` condition must name a
non-empty instruction. A bad path should fail the build, not the demo.

### 2. `lessons/verify.ts` — the grader

```ts
export const isSatisfied = (
  c: VerifyCondition,
  flow: FlowState,
  idl: Idl | null
): boolean;
```

Pure, synchronous, no network:

| Condition | Read from |
| --- | --- |
| `build-passes` | `flow.build === "done"` |
| `deployed` | `flow.deploy === "done"` |
| `idl` | `flow.build === "done"` **and** `PgProgramInfo.idl` — instruction present, and its `args` / `accounts` contain the named entry |
| `read` | never satisfied automatically; see the objective band |

**The `idl` condition also requires the build, amended 2026-08-27.** The
first implementation gated only on the IDL being non-null. `PgProgramInfo.idl`
is workspace-persisted and refreshed on a workspace switch through a
debounced batch, while every other input the grader reads comes from
`PgFlow`, which resets on `workspace-change`. So inside that refresh window
any `PgFlow` event — a stepper-tab click suffices — could grade a newly
entered lesson against the previous project's IDL. Requiring the build
closes the only path to a green the toolchain did not give for this
workspace. The cost is parity with the other conditions: re-entering a
lesson in a new session needs a fresh build before an unfinished `idl` step
can be graded, because `FlowState` is in-memory only.

**A `read` step must not borrow the word "verified", amended 2026-08-27.**
Nothing machine-checks a reading step, so its band line reads "Not
machine-checked — continue when ..." rather than "Verified when ...", and
its `verifiedBy` is phrased as self-report. The first version shipped a
step claiming "Verified when you have run the client and read its output"
beside a button that checks nothing — the mechanism was honest and one word
of copy undid it. A guard test now asserts a reading step's copy never
claims program behaviour was observed; the original guard only searched for
the word "transaction" and this string walked past it.

The `idl` condition is what makes this worth building. After a successful
Anchor build the regenerated IDL is a real artifact of the learner's own
code, so *"`hello` now takes a `name`"* is checkable for free, with no RPC
and no hand-written checker — Killercoda's real-state verification at
zero infrastructure cost.

### 3. `lessons/progress.ts` — the ratchet

Per-lesson progress lives in `PgTutorial.getStorage`, which writes
`.workspace/tutorial-storage.json` inside the lesson's own workspace, so
it is scoped correctly and survives everything the dev loop does.

```ts
interface LessonProgress {
  completedStepIds: string[];
  currentStepId: string;
}
```

**Monotonic by construction.** A step id, once in `completedStepIds`, is
never removed. A later failing build moves the stepper, never the
ratchet. The current step is the first step not in the completed set.

Evaluation runs on `PgFlow.onDidChange` and on the IDL changing. The
storage API is async (IndexedDB under `PgExplorer.fs`), so the store
keeps the progress in memory, renders from that, and writes through.

### 4. Navigation — one switcher

A started lesson **is** a workspace: `PgTutorial.isStarted(name)` is
defined as `PgExplorer.allWorkspaceNames.includes(name)`. So lessons
already appear in the rail's Projects list as bare names, and clicking
one calls `PgExplorer.switchWorkspace`, which is not `PgTutorial.open` —
no route, no page restore, and you land in a lesson's files with no
lesson. (`routes/tutorials/tutorials.tsx` has a workspace-switch listener
that would have handled this, but it only exists while that route is
mounted, which it is not when you are in a plain project.)

- **`header/ProjectSwitcher.tsx`** becomes a menu: `allWorkspaceNames`
  split by `isWorkspaceTutorial` into a `Lessons` group carrying `n/m`
  progress and a `Projects` group, then `Browse gallery`, which is the
  existing `onOpenGallery`. Choosing a lesson calls `PgTutorial.open`;
  choosing a project calls `switchWorkspace`. Only existing workspaces
  are listed, so the switcher never grows into a catalog — the gallery
  stays the place things are started.
- **`left/ProjectsTab.tsx` is deleted.** Its job moved.
- **`left/LeftPanel.tsx`**: in a lesson the tabs are `Steps | Files`;
  otherwise Files alone with no tab strip, since one tab is not a choice.

The app ends with one project switcher instead of the two it has now.

### 5. `lessons/StepRail.tsx`

The `Steps` tab: one row per step with a mark that reflects the ratchet
(done / current / locked), the objective as the label, and a sub-line
naming either what confirmed it or what the current step is aiming at.

### 6. `lessons/ObjectiveBand.tsx`

Rendered by `Flow.tsx` inside `Center`, above `Stage`, only when a lesson
path is active. Holds the objective, `verifiedBy` in plain words, a
`Read the page` button, and the assistant action.

**A `read` step is the only one the learner advances by hand**, with a
`Continue` button the band shows for that kind and no other. Every other
kind has no manual advance at all: if the toolchain has not agreed, the
step is not done, and a way to click past it would give back exactly what
this design exists to take away. The rail's rows are not clickable for
the same reason — the ratchet is the navigation.

**The first-attempt guard.** The assistant action reads *I'm stuck*, not
*Do it* — the learner opens the door, which is the AI-out first attempt
the RCT evidence asks for, bought with one word of copy. Before an
attempt exists on the current step, the button offers rung 1 only
(a question, no code). An attempt means the project changed since the
step became current, or a build has been run
(`PgFlow.buildStartedAt`). Higher rungs unlock after that. The button is
never disabled: a dead control in a demo is worse than a soft gate.

### 7. `lessons/Reader.tsx`

`Read the page` renders `readPage()` through the existing
`components/Markdown` as an overlay inside `Center`, dismissed with Esc
or its close button. Reading is deliberately not a stepper stage: it is
not part of the dev loop, and making it one would put a surface in the
rotation whose job is to hide the editor, which is the arrangement the
research rules out as a default.

### 8. Stepper — one decoration

`header/Stepper.tsx` takes an optional `target?: Stage` and draws a ring
on that stage. No change to `FlowState`, to how status is derived, or to
what any stage means. The loop stays a loop.

### 9. `routes/tutorials/tutorials.tsx` — two small edits

This file is not otherwise on the fork's touch list, and both edits are
narrow.

**D16.** Opening an unstarted tutorial from an active project crashes with
`Current tutorial has not been set` or bounces to `/`. The route sets
`PgView.sidebar.name = "Tutorials"` synchronously while
`PgTutorial.refresh()` is still resolving inside the async
`setMainPrimary` callback; the resulting `onDidChangeCurrentSidebarPage`
takes the `PgTutorial.openAboutPage()` branch, which throws because
`PgTutorial.current` is not set yet. Fix: guard both branches of that
listener on `PgTutorial.current` being set. Smaller and safer than
resequencing the async body.

**The lesson branch.** When the tutorial being opened has a lesson path,
`setMainPrimary` renders `lessons/LessonSurface.tsx` — `EditorWithTabs`
alone — instead of upstream's `Tutorial` component, whose markdown pane
would otherwise compete with the assistant for the same edge. Tutorials
with no lesson path take the existing branch untouched, so the other
nineteen are unaffected. Workspace seeding and progress still go through
`PgTutorial`.

### 10. Assistant — lesson context and the hint ladder

**Context.** `ProjectContext` (`assistant/bridge/playground-bridge.ts`)
gains one nullable field:

```ts
lesson: {
  name: string;
  stepIndex: number;      // 1-based
  stepCount: number;
  objective: string;
  verifiedBy: string;
  satisfied: boolean;
} | null;
```

Fields on an existing documented interface, not new architecture. The
composer's context line names the lesson step, so the learner can see
that it read *their* step.

**The ladder.** Prompt policy is the lever, since the model would
otherwise answer immediately. Each step carries three prompts and the
store holds a rung counter, in memory, reset when the current step
changes:

1. **Question.** Ask what the learner is missing; name no API and show no
   code.
2. **Locate.** Name the concept and where in the project to look; still
   no patch.
3. **Propose.** The patch, in the usual approval card.

`PgAssistant.requestPrompt` already carries this with no new transport —
it was built for "Fix with assistant", it buffers when `Chat` is not
mounted, and `Flow.tsx` already reopens the panel on a request. The rung is named
inside the prompt text itself, so it appears in the transcript as the
learner's own visible message and needs no change to how replies render.
A ladder nobody counts silently becomes an answer machine — the JetBrains and metacognition
studies found AI supplying exact solution code in over half of debugging
interactions despite stated hint-first policies.

**Amended during implementation, 2026-08-27.** This section originally said
the system prompt gains a lesson block only when `lesson` is non-null. Two
things changed once the code was in front of us:

- **The per-turn facts live in `describeProject`, not the system prompt.**
  `model/prompt.ts` already separates the two, and its own comment says why:
  `describeProject` "changes every turn -- keeping it apart leaves the
  stable half cacheable". A lesson step changes turn to turn, so that is
  where it belongs. Note `describeProject` enumerates `ProjectContext`
  fields by hand rather than spreading the object, so a field added to the
  interface and nowhere else is dead code the model never sees.
- **The coaching rules are unconditional, not gated on `lesson`.** A
  conditional block yields two prompt prefixes and a cache miss every time
  someone enters a lesson. Phrased to be inert outside a lesson ("When the
  learner is in a lesson step, ..."), they keep the prefix byte-stable
  forever, which is the property this section actually wanted.

The rules also carry an **explicit override**: the surrounding `BEHAVIOUR`
block already tells the assistant, unconditionally, to "lead with the
answer" and to "propose the smallest change that fixes the problem". The
lesson rules sat below those and were therefore outranked -- a model
reconciling them follows the specific unconditional instruction. The block
now states that inside a lesson step it supersedes both, and the rung rule
is an imperative (rungs 1 and 2: a question or a pointer, no code, no
file-plus-line, no `write_file`) rather than a preference. A policy stated
below its own contradiction is the failure mode the research names, not a
mitigation for it.

## Error handling

- **A path names a tutorial that does not exist** — throws at module
  load, so it is a build failure rather than a broken demo.
- **`readPage` fails** (a markdown fetch 404s) — the reader shows the
  failure and a link to the tutorial's own page; the step is unaffected,
  since prose is not verification.
- **The IDL is absent** — an `idl` condition is simply unsatisfied. A
  Seahorse or native project never produces one, which is a reason a path
  may not use that condition, not an error.
- **Progress fails to write** — the in-memory ratchet still advances and
  the UI is correct for the session; a reload loses the step. Logged, not
  surfaced, because the loss is one step and an error toast mid-lesson
  costs more than it saves.
- **A build fails after a step was completed** — nothing happens to the
  ratchet, by design.

## Real vs imitation (honesty map)

The demo must be honest about what is real.

| Claim | Status |
| --- | --- |
| The build that verifies a step | Real — the same server build the IDE runs |
| The IDL a step checks | Real — regenerated by that build from the learner's code |
| Deploy verification | Real — devnet |
| "A transaction logged your name" | **Not in this cut.** Needs a learner-initiated instruction call and a log read; see below |
| Progress | Real, and local to the browser — cleared with browser data, like everything else |
| The hint ladder | Real prompt policy with a real counter; it is not a trained tutor |

The objective band's wording must match what the cut can actually check.
For the greeting step that is *"the program builds and its interface
shows `hello(name)`"* — which is both true and a stronger statement than
"it compiled".

## Concept: where this grows (not in this cut)

- **Path-scoped step ids, before a second path exists.** Ids are bare
  strings today, and both the hint-ladder counter and the reader's React
  key use them unqualified. Two paths that each have a step called
  `deploy` would share a rung count and a reader instance. Prefix the id
  with the path when the second path lands.
- **`describeLesson` must not report a finished `read` step as satisfied.**
  It reports `satisfied: true` once the path is complete, using the last
  step's copy regardless of that step's kind. `hello-anchor` ends on an
  `idl` step so it is unreachable today, but a path ending in a reading
  step would tell the assistant an unchecked step was verified -- the same
  honesty bug that was caught in the UI, reappearing in what the model is
  told.
- **Verification by transaction log.** `{ kind: "log-contains" }`, reading
  the logs of an instruction call the learner made from Interact. It is
  the most convincing verification we could offer and costs an RPC round
  trip plus a signature we do not currently keep. The Interact stage is
  where it attaches.
- **Curves across lessons.** Prerequisites, a path graph, "what next"
  after a path ends. Needs more than one path to be worth modelling.
- **Per-user progress.** Waits on the storage service in *Next* step 2;
  today progress dies with browser data.
- **Hand-off to Blueshift.** A finished path ends by pointing at their
  verified challenges. They own credentialing — verified builds and an
  on-chain NFT — and the brief already says integrate rather than
  duplicate. We should never build a credential of our own.
- **Instrumentation.** Which rung learners reach, and time to first
  attempt. The research is unanimous that build-pass rate is the wrong
  measure; we should not ship a metric that flatters us.

## Testing

Unit, on pure code:

- `isSatisfied` for each condition, including an `idl` condition against
  a real captured IDL fixture with and without the argument.
- Ratchet monotonicity: a completed step survives a failing build, a
  workspace reset, and an out-of-order satisfaction.
- Path validation throws on an unknown tutorial, duplicate step ids, and
  an empty `idl` instruction.
- Rung counter: resets on step change, never exceeds three, and starts
  capped at one before an attempt exists.
- Switcher grouping: lessons and projects split by `isWorkspaceTutorial`,
  and choosing a lesson routes through `PgTutorial.open`.

Playwright, on the seeded fixture:

- Open the lesson from a live project — the D16 path — and land on step 1
  with the rail rendered.
- A failing build leaves the ratchet where it was; the first hint is a
  question and contains no code fence.
- Fixing the code and rebuilding satisfies the `idl` condition and
  advances exactly one step.
- `Read the page` opens and dismisses without disturbing the editor.

## Prerequisites

- D16 must land first; every entry point here uses the path it breaks.
- `CI=true yarn build` fails on every branch because
  `src/tutorials/__template/` holds both `Template.tsx` and `template.ts`
  (roadmap P1). This work adds tests to a repository with no CI for
  `client-v2`, so the case pair should be renamed in the same stream if
  the verification step has not already taken it.

## Decision to record

**D24 — a lesson step is finished by the toolchain, not by a click.**
Chosen: verification from `FlowState` and the regenerated IDL; authored
content limited to objectives, prompts and starting files.

Rejected — **a fourth column for lesson prose**: textbook simultaneous
visibility, but on a 1440px screen it leaves the editor about 560px,
where Rust with Anchor types begins wrapping, and it puts two reading
columns either side of the code.

Rejected — **merging the lesson into the assistant column** (what Cat's
prototype does): cheapest, demos well, but one scroll serves two jobs and
the objective is gone three turns into a conversation; it also blurs
authored curriculum and generated answers into one voice.

Rejected — **our own verification service or credential**: Blueshift
already does verified builds and on-chain credentials, and the brief says
integrate rather than duplicate.

Rejected — **hand-written per-step checkers**: the authoring cost that
kills these products, and unnecessary when the compiler already answers.

Revisit when a second path exists (the curve model becomes worth
building), when the Interact stage can hand us a transaction signature
(log verification becomes cheap), or if the hint ladder measurably slows
the demo enough that a deliberately impressive step is needed.
