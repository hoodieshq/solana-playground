# Call with the tech lead, 2026-10-16 - what it changed

Source record for the review, e2e and TESTING.md process the team has
followed since. Present: Slava and Sergey; Grigory joined for the first
part. The call was not transcribed. This record is built from Slava's
notes of the call, Sergey's recap in `#playground-dev` the same evening
(2026-10-16 22:48), and Slava's confirmation of the details on
2026-10-19.

Each item says what was decided, who confirmed it, and what it
replaces. The agreed process is the authority; this page is its
history.

## Why the process changed

Two costs drove every decision below. Local e2e runs and repeated
review gates made merges wait about a day each. Reviewers spent their
time running the review skill themselves instead of reading the change.

## Decided

**The author runs the sx review on every PR.** Before a PR goes up, the
author runs Sergey's `sx:review-pr` skill
([hoodieshq/solana-explorer-dev-skills](https://github.com/hoodieshq/solana-explorer-dev-skills))
in both modes: `/sx:review-pr full` and `/sx:review-pr`. The author
fixes every critical finding and the important findings that seem
necessary, and ranks the rest. Sergey's recap states the rule as: any
PR that exists implies its author ran the skill and fixed the critical
and important issues that seem necessary. This replaces the earlier
practice in which the review skill was run by reviewers only.
Confirmed by Sergey (recap) and by Slava (2026-10-19).

**Gaps that reach outside the PR become Linear issues.** A shortcoming
or a gap that repeats across changes is fixed inside the PR when it
belongs there. When it reaches beyond the PR, it becomes an issue in
Linear and is fixed later, either through the agents' rules or through
tooling where tooling can enforce it. Tech-debt findings carry the
tech-debt label. A miss that a human finds becomes a rule or a UI test.
A retrospective over review feedback, to tune the agents' rules, comes
later and has no date. Confirmed by Sergey (recap).

**Human reviewers read and click through.** With the skill already run
by the author, the reviewer does a classic read of the diff and clicks
through the preview deploy. The reviewer does not run the skill again.

**E2E runs in CI, not in the local pipeline.** CI runs the e2e suite on
every PR, internal PRs into `new-face` included. Locally the author
runs only the specs the PR adds or changes. Any other spec runs locally
only after Slava's yes, when the author is unsure; the full suite runs
locally only on an explicit override. Slava narrowed "local runs only
when unsure", as said on the call, to these conditions on 2026-10-19.

**TESTING.md cases run in full only before the external PR.** The PR
from `new-face` to the external repository runs every TESTING.md case.
A PR in between runs only the cases Slava confirms: the author proposes
which cases the change reaches, Slava answers which to run and which to
skip, and the skipped cases are marked as skipped. Confirmed by Slava
(2026-10-19).

**Preview deploys have to work.** The click-through above depends on a
built preview of every PR. Sergey took the fix. Until it lands, a
failing preview deploy does not block a merge.

**The Linear board goes to Cat on Monday 19 October.** The tidied board
(statuses and dates, every issue in a milestone) is what Cat sees.
Slava's estimate pass is shared internally on Monday morning first.
Slava drafts the status text; Sergey and Grigory edit it.

**Focus for the week of 19 October.** Sergey works on the AI track and
on deploys in the project synced with the Foundation. Slava finishes
the design in its present scope and moves on. A separate call with
Sergey on the AI track happens that week.

## Open after the call

- `client-v2/CLAUDE.md`, step "Run the review agents", still names
  `/pr-review-toolkit:review-pr` as the pre-PR review. The change to
  `sx:review-pr` is tracked in HOO-2143 (Urgent, filed 19 Oct).
- CI e2e on internal PRs into `new-face` depends on the CI work tracked
  in HOO-2093.

## Deliberately not carried over

The capacity and billing discussion is internal and stays out of this
record.
