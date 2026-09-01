# Lesson Ledger (D25/D26, PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LessonProgress` (three mutable fields) with an
append-only event log and two folds - a per-step ledger and a cursor -
so the three shipped defects (D-a/D-b/D-c) become impossible cases, and
surface the model in the band and the rail.

**Architecture:** New pure modules `events.ts` (record shapes, trim),
`ledger.ts` (folds, guards, legality, queries) and `migrate.ts` (v1
replay) are built and tested first, green beside the old code. One
cutover commit then rewires `store.ts`, the band, the rail, the two
skip valves and the assistant context onto the new machine and deletes
`progress.ts`, `PgLessonHints`'s map, `target: Stage`, `attempted` and
`attemptBaseline`. Verification is by hand (no CI yet).

**Tech Stack:** TypeScript (CRA 5 + craco, React 17), jest via
`craco test`, styled-components. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`
(with the 2026-09-01 D26 amendment). Round brief:
`docs/internal/2026-09-01-lesson-implementation-brief.md`.

## Global Constraints

- Branch `feat/lesson-ledger`, PR #20 against `master-2.0`. No AI
  attribution. Nothing from `docs/`, no `CLAUDE.md` on the branch.
- CONTRIBUTING: 80 columns, 2-space indent, prettier; no `any`, no
  `@ts-ignore`; `import type` for types; named exports (default only
  for React components); no non-ASCII in source.
- All work inside `client-v2/src/views/`; no `client/`, no `server/`
  changes; `PgAssistant` untouched; `PgFlow` gains nothing but its
  existing subscriber role.
- Commits present tense, no prefix (client changes).
- Verification per commit: `npx tsc --noEmit` and the touched test
  files; full `CI=true npx craco test --watchAll=false` plus
  `npx prettier --check 'src/**/*' 'api/**/*'` before push. Baseline:
  242 tests / 27 suites on `master-2.0`.
- Every spec-vs-reality conflict goes to
  `docs/internal/2026-09-01-lesson-implementation-friction.md` on
  `context-archive` at the moment it is found.

## Design decisions the spec leaves to the implementation

Recorded here so the executor does not re-derive them; each is also a
friction-log candidate if it turns out wrong.

1. **Events reference steps by id, positions are computed.** The spec's
   formalism uses indices; the persisted record uses step ids (`move`
   carries `to: string | "end"`), because ids are the stable storage
   key and a path edit must not shift the meaning of an old log.
2. **`attempt` carries `startedAt: number`** (the flow's
   `buildStartedAt`). The spec gives `attempt` no payload; the field is
   the dedupe key that keeps one `PgFlow` build from being recorded
   once per store notification. Friction-log entry.
3. **Guards run twice.** The dispatcher refuses an event with no edge
   (it is never appended - the spec's "would be refused if it arrived
   anyway"), and the fold re-checks the same guards on replay so a
   migrated or hand-edited log cannot smuggle a mark. The one guard
   only the emitter can check is `graded`'s "satisfied against current
   state": the evaluate handler computes the set `S`, so a replayed
   `graded` trusts `S` but still requires machine-graded + open/passed.
4. **`nextLegalAfter(k)`: first legal `j > k`, else `end` if `end` is
   legal, else the cursor stays put.** The stay-put case is reachable
   (prove a `passed` step by grading while the cursor sits on it, with
   an `open` frontier behind it and nothing legal ahead).
5. **Actor by emitter:** `graded`/`checked` toolchain; `enter`,
   `move`, `pass`, `attest`, `hint`, `attempt` learner; migrated events
   `unknown`. `via: "agent"` exists in the type and is unused in PR 1
   (no agent emitter ships).
6. **Band behind the frontier shows no primary.** Mark edges exist
   only at the frontier, so on a non-open step the band shows the
   mark's sub-line, the nav arrows, Read the page and I'm stuck.
7. **The spec's `readiness(condition, env)` explainer is deferred.**
   The brief's In-list scopes legibility to: primary from grader
   class, criterion in learner's words, skip only at the frontier.
   Readiness is its own follow-up; friction-log entry so it is not
   silently dropped.
8. **Trim constants:** trim when `events.length > 200`, keep the last
   120. The snapshot stores folded marks plus the last `move` target so
   `enter` still restores the cursor after a trim.

---

### Task 1: The record - `events.ts`

**Files:**
- Create: `client-v2/src/views/flow/lessons/events.ts`
- Test: `client-v2/src/views/flow/lessons/events.test.ts`

**Interfaces:**
- Produces (later tasks rely on these exact names):

```ts
export type LessonActor = "learner" | "toolchain" | "unknown";

interface LessonEventBase {
  /** Monotonic per record, starts at 1 */
  seq: number;
  /** Wall clock, `null` only on migrated events */
  at: number | null;
  actor: LessonActor;
  /** Present when a learner approved an agent proposal */
  via?: "agent";
}

export type LessonRecordEvent = LessonEventBase &
  (
    | { type: "enter" }
    | { type: "graded"; stepIds: string[] }
    | { type: "checked"; stepId: string; output?: string }
    | { type: "pass"; stepId: string }
    | { type: "attest"; stepId: string }
    | { type: "move"; to: string | "end" }
    | { type: "attempt"; startedAt: number }
    | { type: "hint"; stepId: string; rung: number }
  );

export type LessonMark = "open" | "proved" | "attested" | "passed";

export interface LessonSnapshot {
  marks: Array<[string, LessonMark]>;
  moveTarget?: string | "end";
}

export interface StoredLesson {
  v: 2;
  snapshot?: LessonSnapshot;
  events: LessonRecordEvent[];
}

export const EMPTY_STORED: StoredLesson;
export const nextSeq: (r: StoredLesson) => number;
/** Trim to snapshot + bounded tail once past the cap */
export const trimRecord: (
  r: StoredLesson,
  foldMarks: (r: StoredLesson) => Array<[string, LessonMark]>
) => StoredLesson;
```

`trimRecord` takes the mark fold as a parameter so `events.ts` does not
import `ledger.ts` (which imports it back). Constants
`TRIM_CAP = 200`, `TRIM_KEEP = 120` exported for tests.

- [ ] **Step 1: failing tests** - `nextSeq` on empty record is 1, on a
  record with events is last seq + 1, respects a snapshot-only record
  (snapshot present, events drained: still counts up from the last
  trimmed seq - store `seq` of the last dropped event? No: seq of a
  snapshot-only record continues from `events`, and trim always keeps
  events, so `nextSeq` = last kept event's seq + 1). `trimRecord`
  under cap returns the same object; over cap keeps the last
  `TRIM_KEEP` events, folds marks of the whole record into
  `snapshot.marks`, and carries the last `move` target from anywhere
  in the record into `snapshot.moveTarget`.
- [ ] **Step 2: run** `npx craco test --watchAll=false events` - FAIL.
- [ ] **Step 3: implement** the module above.
- [ ] **Step 4: run again** - PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: commit** `Add the lesson record: an append-only event log`

### Task 2: The machine - `ledger.ts` + `graderClass`

**Files:**
- Create: `client-v2/src/views/flow/lessons/ledger.ts`
- Modify: `client-v2/src/views/flow/lessons/verify.ts` (add
  `graderClass`, non-breaking)
- Test: `client-v2/src/views/flow/lessons/ledger.test.ts`, extend
  `verify.test.ts`

**Interfaces:**
- Consumes: `StoredLesson`, `LessonRecordEvent`, `LessonMark` from
  Task 1; `LessonPath` from `types.ts` (unchanged at this point).
- Produces:

```ts
// verify.ts
export type GraderClass = "synchronous" | "on-demand" | "attestation";
export const graderClass: (c: VerifyCondition) => GraderClass;
// "read" -> attestation; build-passes/deployed/idl -> synchronous.
// No condition maps to on-demand in PR 1; the class exists so adding
// D26's `logs`/`test` later only extends this switch.

// ledger.ts
export type LessonPosition = number | "end";
export interface LessonView {
  marks: ReadonlyMap<string, LessonMark>; // every step, default open
  cursor: LessonPosition;
  frontier: LessonPosition;
  /** seq of the event that first put the cursor on each position */
  firstArrival: ReadonlyMap<number, number>;
  /** seqs of attempt events */
  attempts: readonly number[];
  /** hint counts per step id */
  rungs: ReadonlyMap<string, number>;
}
export const foldRecord: (path: LessonPath, r: StoredLesson) => LessonView;
export const legal: (path: LessonPath, v: LessonView, p: LessonPosition)
  => boolean;
export const prevLegal: (path: LessonPath, v: LessonView)
  => LessonPosition | null;
export const nextLegal: (path: LessonPath, v: LessonView)
  => LessonPosition | null;
/** Would this event change anything / does its edge exist? */
export const admits: (path: LessonPath, v: LessonView, ev: LessonRecordEvent)
  => boolean;
export const stepAt: (path: LessonPath, p: LessonPosition)
  => LessonStep | null;
export const cursorStep: (path: LessonPath, v: LessonView)
  => LessonStep | null;
export const attempted: (path: LessonPath, v: LessonView, stepId: string)
  => boolean;
export const rung: (v: LessonView, stepId: string) => number;
```

Fold rules, verbatim from the spec's two tables:
- Ledger: `graded(S)` moves `open|passed` machine-graded steps in `S`
  to `proved`; `pass(i)` needs `i = frontier` + machine-graded + human
  actor -> `passed`; `attest(i)` needs `i = frontier` + attestation +
  human actor -> `attested`; `proved`/`attested` terminal. `checked`,
  `attempt`, `hint`, `enter` have no ledger edge.
- Cursor: `move(j)` if `legal(j)`; `graded(S)` moves the cursor to the
  next legal position only when the cursor's own step is in `S`,
  otherwise unchanged (D-a); `pass`/`attest` whose edge fired move to
  next legal after `i`; `enter` restores the last `move` target if
  still legal, else `frontier`. Initial cursor (no events, no
  snapshot): `frontier`.
- `legal(p)`: mark != open, or p = frontier, or (p = end and
  frontier = end).
- `admits` mirrors the dispatch guards: mark events with no edge and
  illegal `move`s are refused; `enter`/`attempt`/`checked`/`hint`
  always admitted.

- [ ] **Step 1: failing tests.** Use a 3-step fixture path (idl /
  deployed / read) like the old `progress.test.ts` PATH minus
  `target`. Cases, each a named `it`:
  - fresh record: cursor 0, frontier 0, all marks open
  - `graded(["write"])` proves it and moves cursor to 1
  - `graded` of several ids proves all (grading per step, not forward)
  - **D-a regression:** cursor moved back to 0 (via legal move after
    passing), a `graded(["deploy"])` lands - cursor stays at 0, deploy
    proved
  - **D-b impossible:** `attest` on a step behind the frontier is not
    admitted and changes no fold
  - **D-c impossible:** exhaustive over every event kind - only
    `graded` ever produces `proved`; `attest` on the frontier read
    step yields `attested`
  - `pass` only at the frontier, only machine-graded, only human actor
    (a `toolchain` pass is refused)
  - `attest` only for attestation kinds (refused on an idl step)
  - `passed -> proved` repair via a later `graded`
  - terminal: second `attest`/`pass`/`graded` on a terminal step
    changes nothing
  - `move` to a non-open step is legal; to an open non-frontier step
    is refused; to `end` only when frontier = end
  - `enter` restores last still-legal move target; falls back to
    frontier when there is none
  - cursor reaches `end` only when frontier = end
  - `nextLegalAfter` stay-put edge: marks passed/open/passed, cursor
    2, grade step 2 -> cursor stays 2
  - **property: marks never move down** `open < passed|attested <
    proved` over a few hundred randomized event series (seeded PRNG,
    no `Math.random()` in the assertion path - use a small LCG)
  - **property: legality only grows** over the same series
  - `attempted`: attempt after first arrival -> true, survives moving
    back and forward; attempt before arrival -> false
  - `rung` counts hint events per step
  - fold from a snapshot: marks and moveTarget respected, `enter`
    after trim still restores
- [ ] **Step 2: run** - FAIL.
- [ ] **Step 3: implement** `ledger.ts` (single-pass fold) and
  `graderClass`.
- [ ] **Step 4: run** ledger + verify suites - PASS; `tsc` clean.
- [ ] **Step 5: commit** `Fold the lesson ledger and cursor from the event log`

### Task 3: Migration - `migrate.ts`

**Files:**
- Create: `client-v2/src/views/flow/lessons/migrate.ts`
- Test: `client-v2/src/views/flow/lessons/migrate.test.ts`

**Interfaces:**
- Consumes: `foldRecord`, `admits` (Task 2), `StoredLesson` (Task 1).
- Produces:

```ts
/** The record shape #19 shipped */
export interface LessonProgressV1 {
  completedStepIds: string[];
  skippedStepIds?: string[];
  currentStepId: string | null;
}
export const isV1: (raw: unknown) => raw is LessonProgressV1;
export const isV2: (raw: unknown) => raw is StoredLesson;
export const migrateV1: (path: LessonPath, v1: LessonProgressV1)
  => StoredLesson;
```

Mapping per kind: completed id whose step is an attestation kind ->
`attest`; every other completed id -> `graded([id])`; skipped ->
`pass`; then one `move(currentStepId)` when it names a real step. All
events `at: null`, `actor: "unknown"`, seq 1..n. Events are appended
through the same `admits` guard, so D-b duplicates and out-of-order
junk drop on the way in. Order: walk `path.steps` in order emitting
mark events (so frontier guards hold), then the move.

Note the guard nuance: migrated events carry `actor: "unknown"`, and
the `pass`/`attest` edges require a human actor - the fold must accept
`"unknown"` as human for exactly this reason (only `"toolchain"` is
non-human). Task 2's guard is written that way from the start.

- [ ] **Step 1: failing tests:**
  - a v1 record with completed [write, deploy], skipped [], current
    "client" folds to the same ledger the v1 semantics implied: write
    and deploy proved, client open, cursor on client
  - a completed *read* step migrates to `attested`, never `proved`
  - skipped -> `passed`
  - **D-b record:** completed ["s1","s2","s2","s2","s2"] collapses -
    the migrated event list carries no second effective event, fold
    identical to the deduped record
  - no synthesized timestamps: every migrated event has `at: null`,
    `actor: "unknown"`
  - `currentStepId: null` yields no move; cursor = frontier
  - `isV1`/`isV2` recognize their shapes and reject the other, and
    reject garbage
- [ ] **Step 2: run** - FAIL.
- [ ] **Step 3: implement.**
- [ ] **Step 4: run** - PASS; `tsc` clean.
- [ ] **Step 5: commit** `Migrate v1 lesson progress into the event log`

### Task 4: The cutover - store, hints, band, rail, valves

One commit; it is the atomic model switch and cannot compile in
halves. Everything below lands together.

**Files:**
- Rewrite: `client-v2/src/views/flow/lessons/store.ts` (state is
  `{ path, record, loadFailed }`; reducer over record events; persist
  v2 with trim; load with v1 migration; `enter` on load)
- Rewrite: `client-v2/src/views/flow/lessons/hints.ts` (keep
  `RUNG_COUNT`, add pure `hintPrompt(step, rung)`; delete
  `PgLessonHints`)
- Modify: `client-v2/src/views/flow/lessons/types.ts` (delete
  `target: Stage` from `LessonStep`; `read` gains `at: Stage`)
- Modify: `client-v2/src/views/flow/lessons/verify.ts`
  (`verifyingStage` returns `read`'s `at`? No - it keeps returning
  `null` for `read`: `at` is prose-level pointer for the rail/stepper
  ring, `verifyingStage` stays "which runnable command proves this")
- Modify: `client-v2/src/views/flow/lessons/band-copy.ts`
  (`describeStep` from the fold; add `primaryLabel(condition)`)
- Modify: `client-v2/src/views/flow/lessons/ObjectiveBand.tsx`
  (primary from grader class -> `PgCommand.build/deploy.execute()` or
  `PgLesson.attest()`; I'm stuck demoted to secondary; arrows ->
  `PgLesson.moveBack/moveForward`; drop `PgLessonHints` subscription)
- Modify: `client-v2/src/views/flow/lessons/StepRail.tsx` (marks from
  the fold; rows at legal positions clickable -> `PgLesson.move`;
  sub-lines per the spec's table; "locked" leaves the product)
- Modify: `client-v2/src/views/flow/left/LeftPanel.tsx` (skip valve
  only when the pass edge exists)
- Modify: `client-v2/src/views/sidebar/assistant/Component/Chat.tsx`
  (same guard for the skip card; `attempted` via the query)
- Modify: `client-v2/src/views/sidebar/assistant/bridge/lesson-context.ts`
- Modify: `client-v2/src/views/flow/lessons/paths/hello-anchor.ts`
  (drop `target`; step 3 `verify: { kind: "read", at: "interact" }`)
- Modify: `client-v2/src/views/flow/lessons/index.ts` (exports)
- Delete: `client-v2/src/views/flow/lessons/progress.ts`
- Rewrite tests: `store.test.ts`, `band-copy.test.ts`, `hints.test.ts`;
  delete `progress.test.ts` (its cases live on in `ledger.test.ts`,
  with :325's assertion inverted); touch fixtures in
  `paths/hello-anchor.test.ts`, `LessonRoute.test.tsx` if they name
  `target`.

**Interfaces:**
- Consumes: everything Tasks 1-3 produce.
- Produces (what the UI files compile against):

```ts
// store.ts
export interface LessonState {
  path: LessonPath | null;
  record: StoredLesson;
  loadFailed: boolean;
}
export type LessonAction =
  | { type: "load"; path: LessonPath | null; record?: StoredLesson;
      loadFailed?: boolean; at: number }
  | { type: "evaluate"; flow: FlowState; idl: Idl | null; at: number }
  | { type: "pass"; at: number }
  | { type: "attest"; at: number }
  | { type: "move"; to: string | "end"; at: number }
  | { type: "hint"; at: number };
export const reduceLesson: (s: LessonState, a: LessonAction)
  => LessonState;
export class PgLesson {
  static state: LessonState;
  static view(): LessonView | null;   // memoized foldRecord
  static onDidChange(cb): Disposable;
  static attest(): void;
  static pass(): void;                // replaces skipStep
  static move(to: string | "end"): void;
  static moveBack(): void;
  static moveForward(): void;
  static canPass(): boolean;          // frontier, machine-graded, cursor there
  static requestHint(): string | null;
  static init(): Disposable;
}
```

Reducer notes:
- `load` builds the state and appends `enter` (seq continues from the
  record; actor learner). A `loadFailed` record still folds in memory;
  `_persist` keeps refusing writes, exactly as today.
- `evaluate` computes `S` = ids of steps whose mark is `open|passed`,
  `graderClass` synchronous, and `isSatisfied(flow, idl)`; appends
  `graded(S)` (toolchain) when non-empty. Separately appends
  `attempt` (learner, `startedAt: flow.buildStartedAt`) when
  `buildStartedAt` is non-null and no attempt event carries it yet.
  Both can land from one flow change; graded first is fine (attempt
  ordering only matters relative to arrivals, and a build that both
  starts and proves in one notification cannot exist - start and
  finish are separate `PgFlow` events).
- `pass`/`attest`/`move`/`hint` go through `admits`; refused actions
  return the same state object (React bails out, nothing persists).
- `hint` resolves the cursor step, `used = rung(view, step.id)`,
  ceiling `attempted(...) ? RUNG_COUNT : 1`; admitted -> append
  `hint(step.id, used + 1)`. `PgLesson.requestHint()` dispatches and,
  when the state changed, returns `hintPrompt(step, used + 1)`.
- Persist: `trimRecord` before write; storage default is
  `{ lesson: EMPTY_STORED }`; load reads the item, `isV2` -> use,
  `isV1` -> `migrateV1`, missing file -> fresh, unreadable/garbage ->
  `loadFailed` (same `hasFile` + identity trick as today).

Band behavior (from the spec's "primary action is the criterion"):
- cursor step open at frontier: primary = `primaryLabel(verify)` -
  "Build to prove this" / "Deploy to prove this" / "Mark as read";
  secondaries = Read the page, I'm stuck (assistantLabel unchanged).
- cursor step not open (review): no primary; sub-line names the mark
  ("Proved - {verifiedBy}" / "You marked this read - not
  machine-checked" / "Skipped - not verified").
- cursor `end`: band hidden (unchanged).

Rail sub-lines (spec table): proved -> `verifiedBy`; attested -> "you
marked this read - not machine-checked"; passed -> "skipped - not
verified"; open at frontier -> `primaryLabel(verify)`; open ahead ->
"not reached". Rows where `legal` allows it get `onClick` ->
`PgLesson.move(step.id)` and a button role; rows ahead do not and say
why in `title`.

- [ ] **Step 1: rewrite the tests first** (`store.test.ts` cases:
  evaluate appends graded and proves; evaluate appends one attempt per
  buildStartedAt; D-a at the store level - move back, deploy lands,
  cursor unchanged; attest on frontier read step -> attested and
  record persisted shape v2; pass refused off-frontier; hint gated by
  attempted-query and capped by RUNG_COUNT; rungs survive a reload -
  fold of the same record; load with a v1 record migrates; loadFailed
  still blocks persistence; `band-copy.test.ts`: primary labels per
  condition; read step copy never says "verified"; `hints.test.ts`:
  `hintPrompt` text carries rung, objective, verifiedBy, the rung's
  own hint line).
- [ ] **Step 2: run** - FAIL (compile errors are the failure mode
  here; that is expected for a cutover).
- [ ] **Step 3: implement the cutover** across every file listed.
- [ ] **Step 4: run the whole suite** `CI=true npx craco test
  --watchAll=false` - PASS, and `npx tsc --noEmit` clean.
- [ ] **Step 5: commit** `Replace lesson progress with the event-log ledger`

### Task 5: Hand verification + push

- [ ] **Step 1:** `npx prettier --check 'src/**/*.{ts,tsx}'
  'api/**/*.mjs'` - fix and re-run until clean.
- [ ] **Step 2:** full suite once more; compare count against the
  242/27 baseline and account for every delta in the PR body.
- [ ] **Step 3:** smoke the dev server (`yarn dev`), open Hello
  Anchor, check: band primary reads "Build to prove this" on step 1;
  Mark as read on step 3 records attested (rail sub-line says so); a
  v1 record in `.workspace/tutorial-storage.json` survives the
  upgrade. (If the environment has no browser session available
  tonight, record that this smoke is pending human eyes in the PR
  body - the unit suite is the gate.)
- [ ] **Step 4:** push; update PR #20 title/body (defects table,
  the D-c inversion called out, out-of-scope list from the brief).
- [ ] **Step 5 (context-archive):** write the friction log
  (`docs/internal/2026-09-01-lesson-implementation-friction.md`),
  update `docs/roadmap.md` Next step 1, commit both.

## Self-review notes

- Spec coverage: events table (T1), both folds + guards + legality
  (T2), grader classes type-level (T2), migration incl. sequencing
  constraint - step 3 stays `read` (T4 path file), storage v2 + trim +
  loadFailed (T1/T4), band primary + skip valves + rail map (T4),
  provenance actors + via (T1/T4), hints/attempted as queries (T2/T4),
  testing section's named properties (T2/T3). Deferred consciously:
  `readiness` explainer (decision 7), on-demand conditions (brief).
- No task references a symbol another task does not define.
- The plan's executor works overnight without review gates; the
  review gate is the PR itself in the morning.
