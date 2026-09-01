# Friction log: implementing the lesson ledger (PR 1)

Round: 2026-09-01 brief, executed 2026-09-02/03 on `feat/lesson-ledger`
(PR #20). Every entry is a place the spec and reality disagreed, or a
call the spec left to the implementation that turned out non-obvious.
The end-of-round docs pass turns the ones marked **spec** into dated
amendments.

## 1. `attempt` needed a payload the spec does not give it

**Spec:** `attempt` carries only `seq`/`at`/`actor`.
**Reality:** the store learns about builds from `PgFlow.onDidChange`,
which fires on every state change, not once per build. Without an
identity on the event, one build would be recorded as an attempt once
per notification.
**Decided:** `attempt` carries `startedAt` -- the flow's own
`buildStartedAt`. It is an honest fact about the attempt (when the
build started), and it doubles as the dedupe key. **spec** (one line in
the events table).

## 2. The cursor's `graded` rule needs a fixpoint, not one application

**Spec:** cursor table: `graded(S)`, cursor in `S` -> "next legal
position after cursor".
**Reality:** several steps can prove in one event (the learner who
builds and deploys before reading -- the spec's own example under
"grading is per step"). Applied once, the rule moves the cursor from
step 0 to step 1 while step 1 is *also* in `S`, stranding the learner
on a step that just proved instead of at the frontier.
**Decided:** the rule applies while the cursor's own step is in the
event's set: the cursor walks to the first position not in `S` (or the
next legal one beyond it). Still a guard on the event, never on the
accumulated fold -- D-a is untouched. **spec** (one sentence under the
cursor table).

## 3. The "stay-put" edge case of `nextLegalAfter` is unreachable

The plan (decision 4) predicted a reachable case where a fired mark
edge finds nothing legal ahead (marks `passed/open/passed`). Working
the guards through shows it cannot arise: `pass` exists only at the
frontier, so a `passed` mark can never sit ahead of an `open` one.
After any fired edge there is always a legal position ahead. The
fallback stays in the code as defense against a hand-edited log, with a
comment saying exactly this. Plan corrected, spec never claimed it.

## 4. `readiness(condition, env)` is deferred, not dropped

**Spec:** "Preconditions explain, they do not fail" -- `needs-build`,
`needs-wallet`, `needs-cluster`, `needs-sol` (which since #9 resolves
to "sign in, then airdrop"), `needs-transaction`.
**Reality:** the round brief's In-list scopes PR 1's legibility to the
primary-from-class, the criterion in the learner's words, and the
frontier-only skip. The explainer is real work (wallet, cluster and
airdrop state wiring) with no dependency on the machine.
**Decided:** out of PR 1, consciously. It needs a slot in the September
plan or it becomes the next unlabelled click. **roadmap**, not spec.

## 5. Persist-on-load stays off, so `enter` events land lazily

v1 never wrote storage during a load, and the new store keeps that: the
`enter` appended on load lives in memory and reaches disk with the next
real event. Consequence: a session that only opens the lesson and reads
writes nothing, and the migration only persists once the learner does
something. Chosen deliberately -- writing on load would put the v1->v2
rewrite on the code path that runs before `loadFailed` has proven the
read trustworthy. Not a spec conflict; recorded because the lazy write
is easy to misread as a bug.

## 6. The trim snapshot folds the whole record, not the dropped prefix

`trimRecord` snapshots the marks of the *entire* record and then keeps
the tail. Re-applying the tail's mark events over their own outcome is
a no-op (terminal guards), so this is safe, and it keeps the guarantee
trivially auditable: the snapshot always holds every mark the record
ever produced. The snapshot's `moveTarget`, by contrast, comes from the
dropped prefix only, because the tail's own `move`s replay. Impl
detail; noted because the asymmetry looks accidental and is not.

## 7. Actor semantics: `unknown` counts as human

The `pass`/`attest` guards require a human actor. Migrated events carry
`actor: "unknown"` -- and must still travel those edges, or a v1 record
could not replay its own skips. So the guard is written as "not the
toolchain" rather than "the learner". One line in `ledger.ts`
(`isHuman`); worth a sentence in the spec's provenance section if it is
ever amended. **spec** (minor).

## 8. What the suite says now

Baseline 242 tests / 27 suites; after the round 265 / 29 (+`events`,
`ledger`, `migrate` suites; `progress` deleted). The D-c inversion the
brief demanded: `progress.test.ts:325` asserted a click lands in
`completedStepIds`; `ledger.test.ts` now asserts a click on the
frontier read step lands as `attested` and that no event kind but
`graded` ever reaches `proved` -- exhaustively over the event union.
