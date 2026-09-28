# The scope sheet's sections become Linear milestones

2026-09-25. Second pass over the same sheet, on the same day the two
columns went in (`2026-09-25-sheet-status-columns.md`). That pass made the
sheet say what Linear knows. This one makes Linear hold what the sheet
promises: every scope row now has an issue, and the sheet's sections exist
in Linear as milestones.

## What was wrong

**Sixty-eight of ninety-three scope rows had no Linear issue.** The sheet
read `Not started` for all of them, which was honest but useless - it
said nothing about whether the work was understood, sized or owned, only
that nobody had begun. A customer reading it could not tell a row we had
thought about from a row we had merely typed.

**The parent issues duplicated their own children.** `HOO-1720` carried a
numbered "Children, by priority" list; `HOO-1615` carried three
`Create child task: ...` checkboxes. Linear already shows sub-issues under
the parent, with their status and priority, so both lists were a second
copy that would silently go stale the first time a child was renamed,
reprioritised or closed.

## What was done

**Twelve milestones**, one per sheet section, named exactly as the sheet
names them - `A1 History backend` through `K Design pass`. Each carries
the section's intent and the constraints that shape it, so the milestone
answers "why does this group exist" without anyone opening the sheet.

Slava chose milestones over a parent issue per section. A parent issue
would have matched the phrase he used - attach the tasks to a task - but
it puts twelve umbrellas into the issue list that nobody will ever work,
and Linear's project view already groups and measures by milestone. The
sections are phases of one project, which is what a milestone is for; a
parent issue is for work that genuinely decomposes.

**Sixty-eight issues**, one per unfiled row, each with the sheet's own
user story where it had one, its size as a Linear estimate (XS through XL
mapped onto the Fibonacci scale), and the row's note where the note said
something a reader would otherwise have to rediscover. Where a row rests
on an unanswered question, the question is in the issue rather than in a
status nobody can act on:

- The Postgres row (`HOO-1735`) says an instance exists and is reachable
  and that **which** instance, and whose, is unconfirmed.
- The transcript-shape row (`HOO-1737`) says storing the model's
  reasoning was asked about, never answered, and is implemented as "not
  stored" by assumption.
- The browser-storage key row (`HOO-1748`) says `sessionStorage` versus
  `localStorage` is undecided and why it matters here - project code runs
  same-origin behind a string blacklist.
- The ai SDK migration (`HOO-1754`) is `Backlog`, blocked by the spike
  (`HOO-1753`) in Linear, with the note that "it would work" is not the
  same answer as "it is worth it".
- The client generator (`HOO-1769`) says plainly that no such generator
  was found in v1 or upstream, so the row's own estimate is wrong if
  nobody can point at one.

**One row was not filed.** The mainnet paymaster row is `Descoped`; a
ticket for work we decided not to do is noise. It is the only item row in
the sheet with no Linear link, and that is the correct reading.

**One conflict is recorded rather than resolved.** `HOO-1764` asks us to
delete the server share routes and the Mongo client. Our own working
agreement says the backend and the sharing infrastructure are not ours to
modify. The issue says so, and says the row goes back to the customer if
the agreement is not amended. Filing a ticket is not the same as being
allowed to do the work.

**Eighteen existing issues** were attached to their milestone, so the
project reads as one hierarchy. `HOO-1720` and the six of its children
that are PR follow-ups rather than sheet rows stay outside the
milestones, because they are not scope - they are the cost of a merge.

## What is deliberately outside a milestone

Asked the same day: why do the closed tickets belong to nothing?

Every closed ticket that **is** a scope row already had one - `HOO-1633`
in A1, `HOO-1651` in G, `HOO-1708` in K. The rest were never rows.

The pre-September platform work now has a milestone of its own,
**`0 Platform foundations`**, holding the nine finished issues that got
Playground running as the Foundation's service at all: GCP (`HOO-342`
with `HOO-392`), the first security pass (`HOO-450` with `HOO-480`), the
upstream sync (`HOO-429`), the workflows (`HOO-482`), the client on Vercel
(`HOO-865`), the deploy process (`HOO-942`), and macOS (`HOO-393`). It
reads 9/9 and carries a target date of 2026-08-10, the day the last of
them closed. It is history, so nothing new goes in it.

Linear's API cannot set a milestone's sort order, so it was created last
and sits after `K Design pass` until someone drags it to the front in the
UI. One drag; not worth signing a browser into Linear for.

**Twenty tickets stay outside every milestone, on purpose.** Three
September bugfixes from our own rounds (`HOO-1707`, `HOO-1709`,
`HOO-1688`), three cancelled directions (`HOO-233`, `HOO-483`,
`HOO-481`), the `HOO-1720` umbrella with the six children that are PR
follow-ups rather than scope, and the current bug and tooling list
(`HOO-1734`, `HOO-1719`, `HOO-1715`, `HOO-1686`, `HOO-1685`, `HOO-1687`,
`HOO-634`).

The rejected alternative was a second bucket milestone to hold them so
that nothing hangs loose. A milestone is a phase that finishes; a bucket
of bugs never reaches 100% and would sit unfinished in the project view
forever, making a complete September look incomplete. Not belonging to a
milestone is the signal that something is not scope - which is the same
line that keeps bugs and tooling out of the customer's sheet.

## The sheet, after

`Not started` is gone: 42 `Todo`, 36 `Backlog`, 8 `Done`, 5 `In Progress`,
1 `In Review`, 1 `Descoped`. Ninety-two of ninety-three item rows carry a
Linear link.

The colour rules did not change. `Todo` (`#f0f0ec`) and `Backlog`
(`#e9e7f0`) were chosen to sit a hair off white precisely so that filing
the backlog would not flood the sheet, which is what has now happened -
the tint that reads at a glance is still `Done` green, `In Progress`
amber and `In Review` blue. If `Todo` and `Backlog` should be plain
white, deleting those two rules is the whole change.

## How it was written

Same path as the morning: Playwright, clipboard, no Google credentials.
The status column went in as plain text so the dropdown and its twelve
validation ranges survived; the Linear column went in as an HTML table so
the anchors came with it. Both were verified by re-reading the public CSV
export and diffing against what was intended, not by looking at a
screenshot.

One correction worth keeping: the first status paste was hand-transcribed
into the tool call and was fourteen rows short. It failed to apply at
all, which is the only reason it did no damage. The second was generated
from the file. Do not retype a column by hand when a generator produced
it.
