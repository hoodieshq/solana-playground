# Round brief: implement the lesson ledger (D25/D26), PR 1

Date: 2026-09-01. Follows the design round of 2026-08-28
(`docs/internal/2026-08-28-lesson-architecture-brief.md`) and the team
review of 2026-08-31. The design is settled; this round turns it into
code and, in doing so, stress-tests it: every place the spec and the
codebase disagree is a finding, not an obstacle to route around.

## Read before starting

1. `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`
   - the spec, with the transition tables. Includes the D26 amendment
   (2026-09-01) and the `checked` actor convention.
2. `docs/decisions.md` - D24 (with its amendment), D25, D26.
3. `docs/lesson-paths-todo.md` on `master-2.0` - the feature author's
   own open tasks; task 2 and task 3 are what D25 answers.
4. `docs/roadmap.md` - Next step 1 and P0 item 1 / P1 item 4 are this
   round.
5. The shipped code: `client-v2/src/views/flow/lessons/` (`progress.ts`,
   `store.ts`, `verify.ts`, `types.ts`, `hints.ts`, `registry.ts`),
   `ObjectiveBand.tsx`, `StepRail.tsx`, `LessonRoute.tsx`,
   `band-copy.ts`, `left/LeftPanel.tsx` (the skip valve at :131),
   `assistant/Component/Chat.tsx`.
6. Concept walkthrough (context, not a source of requirements beyond
   the spec):
   https://claude.ai/code/artifact/5fcd0491-04f4-4b8e-87e5-c79e751686f3

## Process

1. **writing-plans first.** Produce the implementation plan from the
   spec before touching code; commit it to
   `docs/superpowers/plans/` on `context-archive`.
2. Then TDD, in small reviewable commits on the feature branch.
3. Branch: **`feat/lesson-ledger`**, cut fresh from `master-2.0`. Do
   not reuse `feat/lesson-paths` (it is #19's merged branch).
4. PR against `master-2.0`; one approval required (rogaldh) - no
   self-merge. No AI attribution anywhere.
5. Nothing from `docs/` and no `CLAUDE.md` lands on the PR branch.
   English only in everything committed.
6. Verification is by hand, by decision (no CI on the 2.0 line):
   `tsc --noEmit`, `prettier --check` (also over `api/` - the glob
   misses it), `craco test`. Baseline on `master-2.0`:
   242 unit tests in 27 suites. Known and out of scope:
   `CI=true yarn build` fails on every branch (`__template` case pair).

## Scope of PR 1 - the machine under the existing frame

In:

- The event log and the two folds exactly as the spec's tables define
  them: events `enter`, `graded(S)`, `checked(i,false)`, `pass(i)`,
  `attest(i)`, `move(j)`, `attempt`, `hint(i,rung)`, each carrying
  `seq`/`at`/`actor` (with `via: "agent"` for approved agent
  proposals; `checked` is the toolchain's). Guards read the event,
  never the accumulated fold. Marks `open/proved/attested/passed`;
  `proved` and `attested` terminal; grading per step, not forward from
  the frontier.
- Grader classes derived from the verify condition; the authored
  `target: Stage` field is deleted. Class support is type-level for
  all three classes, but **no on-demand condition ships in PR 1** -
  `logs` and D26's `test` land only when step 3's switch is scheduled.
- Storage `{ v: 2, events: [...] }` in the workspace's
  `tutorial-storage.json`; the v1 migration per kind (attestation
  completions -> `attested`, other completions -> `proved`, skipped ->
  `passed`, `at: null`, `actor: "unknown"`); `loadFailed` behavior
  preserved; log trim to a ledger snapshot plus a bounded tail.
- `attempted(i)` and `rung(i)` as queries over the log; the fields and
  the module-static hints map are deleted; rungs survive reload.
- Legibility inside the existing frame: the band derives its primary
  action from the grader class ("Build to prove this" / "Mark as
  read"), states the criterion in the learner's words, and offers
  Skip only at the frontier (this also removes the LeftPanel pinned
  skip valve's latent case). `PgFlow` stays its own reducer and
  becomes an event source; `PgAssistant` is untouched.
- Tests: the suite is rewritten where it asserts the old model -
  `progress.test.ts:325` asserts D-c and must be inverted, not
  preserved. Add the three defects as impossible-case tests (D-a:
  background `graded` never moves a reviewing cursor; D-b: no second
  mark event lands on a terminal step; D-c: no click reaches
  `proved`).

Out - each for a recorded reason, none silently:

- **The frame revision** (files-only left column, band-as-navigation,
  step-map dropdown, guide column right; walkthrough chapter 07). The
  team has not recorded agreement on it; it needs its own decision
  entry (an amendment beside D24) and its own PR. Do not let the
  machine PR grow UI relayout.
- **Step 3's grader switch.** It stays an attestation in PR 1. The
  spec's sequencing constraint is hard: a release must not both
  migrate v1 records and change a step's grader class. The switch
  (logs or D26 test) is its own later release, after Cat settles the
  wording.
- **More lesson paths.** Only after the machine ships (roadmap order).

## The friction log - the second deliverable

Every conflict between the spec and reality goes into
`docs/internal/2026-09-01-lesson-implementation-friction.md` on
`context-archive` (create it on the first entry): what the spec says,
what the code/product actually allows, what was decided in the moment.
Resolve conflicts in favor of the honest model where possible; where
the spec must bend, bend it consciously - the end-of-round docs pass
turns these entries into dated spec amendments, `decisions.md`
entries, and one refresh of the walkthrough artifact. Do not update
the artifact mid-round.

## Definition of done

1. Implementation plan committed (`context-archive`).
2. PR open against `master-2.0` from `feat/lesson-ledger`, checks by
   hand green, tests rewritten and extended as above.
3. Friction log committed, even if it says "no conflicts found"
   (that would itself be a finding worth doubting).
4. Roadmap's Next step 1 updated to reflect the new state.
