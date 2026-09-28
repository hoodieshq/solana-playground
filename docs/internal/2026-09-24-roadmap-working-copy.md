# The roadmap working copy, 2026-09-24

Source record for the amendment to D43. The customer spreadsheet is
read-only to us and public to them; this is the copy we keep, and it is
generated from two inputs rather than edited by hand.

## What was built

`Playground-roadmap-working-copy.xlsx`, four tabs.

**Read me.** What each added column means, which decisions a reader has
to know before re-deciding anything, and the three questions the sheet
cannot settle by itself.

**Roadmap.** The 119 rows of the customer sheet, unchanged and in their
original order, plus seven columns: `Linear`, `Status`, `Assignee`,
`Wave`, `Evidence`, `Blocked by`, `Comment`. Then two sections that
exist only here - `L`, the PR #29 follow-ups and the Flow defects, and
`M`, engineering tooling.

**Gantt.** One row per lane and wave that has work in it, with week
columns from 2026-09-22 and the blockers named beside each bar.

**Linear.** All 47 issues: the 35 live ones with the section they serve,
and the 12 closed before the scope document existed, kept apart.

The generator is in `assets/2026-09-24-roadmap-copy/`: `build.py` plus
its two data files and the CSV export it was built against. Rerun it
rather than editing the workbook, or the next Linear pull silently
discards whatever was typed in.

## The inputs, and when they were taken

The sheet, exported as CSV on 2026-09-24, byte-identical to the
2026-09-22 export - the customer has not touched it in two days. Linear,
pulled the same day: team Hoodies, project Solana Playground, 47 issues,
no next page. A sweep of every Hoodies issue created since 2026-09-01
found no Playground work filed outside the project.

## What the numbers say

Of 93 scope items, **65 are not filed in Linear at all**. Eleven rows
are Done, five in progress, two in review, twenty-three filed and not
started, five in the backlog, one descoped by D41, and one - the
Postgres instance - reads `Needs confirmation` because a database plainly
exists and nothing we hold says which one.

Lanes B, C, H and I have no Linear coverage whatsoever. C is sixteen
rows of the AI rail and H is the agent-side lesson validation, both P1
in the customer's own document.

The gap is not a filing backlog. It is the reason the copy exists: the
sheet on its own reads as a plan, and until this round nothing said that
four fifths of it had never become work.

## Statuses that rest on something other than a ticket

The `Evidence` column carries this, and it should be read before any row
is quoted to anybody.

Four A1 rows and four A2 rows are marked Done on **Sergey's status
update of roughly 19 Sep** and the Done state of HOO-1633, not on a
ticket of their own. That is good evidence for the lane and weak
evidence per row. Whoever next speaks to Sergey should walk A2 row by
row; it is ten rows and would take five minutes.

The Cloud SQL row is the sharpest case. The status says history syncs to
PostgreSQL, so an instance is reachable from Vercel, which is exactly
what BL-2 asks for. Whether it is the Foundation's, who holds it and
whether it survives September is unrecorded.

## What the copy makes impossible to miss

**The ai SDK conflict, section C row 35.** The customer has been told
the migration is in progress. The sheet gates it on a spike verdict
nothing records, R-2 names the migration as a risk, and D1 rejected the
Vercel AI SDK on React 17 and a Node-only core. The row is in Wave 1 for
that reason alone: it is a decision, not a task.

**ConnectorKit, section G row 71.** HOO-1615, HOO-1616 and HOO-1617
still read "Solana Wallet Adapter". D40 settled on 2026-09-22 that they
are the same work under the name the customer used a day after they were
filed. They are to be retitled, not duplicated, and that has not been
done yet.

**Kora, sixteen rows of section G.** All of Wave 4, all annotated with
D41. Nobody should be estimating them for September, and the Jupiter API
key is not a blocker to escalate.

**The blockers.** BL-1 Cloud Run, BL-3 Maintain on the fork, BL-4 Secret
Manager, BL-6 the GA4 property. Eleven rows across F and J cannot finish
until somebody outside the team hands over access, and the red cells in
`Blocked by` are there so a reader stops treating those lanes as ours to
schedule.

## The waves are an order, not a promise

Wave 1 is what is in flight or gates the history lane the team
committed to. Wave 2 is the rest of P1. Wave 3 is P2. Wave 4 is the P3
rows plus what D41 moved out of September. The week columns start
2026-09-22 and render that order against a calendar so the shape is
legible; **no date in the file has been agreed with anyone**, and the
file says so on the Gantt tab, in the Read me and here. 21 Sep, the
Phase 1 date in Rev 2, has passed and nobody restated it.
