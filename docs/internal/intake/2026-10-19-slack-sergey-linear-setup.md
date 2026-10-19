# Slack: Sergey on Cycles, Stage labels, priorities and estimates (2026-10-19)

**Source:** Slack thread, Slava's question to Sergey Prokhorov 2026-10-19 16:22,
Sergey's answers 18:59–19:08. Raw:
`solana-playground/.claude/intake/raw/2026-10-19-slack-sergey-linear-setup.md`
(local). Read alongside: memory `linear-transparency-round` (the 18 Oct Linear
setup), `.claude/prompts/proposal-linear-transparency.md`.

**Decided**

- No Linear Cycles for Solana Playground: cycles belong to the whole Hoodies
  team, not to one project, so turning them on would cut every other project
  on the team into the same sprints. (Sergey.)
- Estimates stay on the T-shirt scale (XS 1, S 2, M 3, L 5, XL 8) for now.
  (Sergey.)

**Requirements changed**

- Burndown over Cycle 1 (20 Oct – 2 Nov) and Cycle 2 (3 – 16 Nov) → no
  Linear cycle to burn down against; the cut-off question needs another
  surface.
- Stage as a label group (1 Face … 5 Access, none) → Sergey prefers splitting
  by milestones ("easier to track the board; with labels we'd struggle").
  Proposal, not yet agreed.

**Facts learned**

- HOO-1599 "Add server-side rust-analyzer LSP support to the editor" and
  HOO-1600 "Deploy the unstable server to Docker-capable infrastructure" are
  already High, both due 2026-11-11 (checked in Linear 23:30). Item 3 is done;
  the memory note "still Medium" is stale.
- Milestones as read 2026-10-19 23:30: the 12 scope-sheet sections (A1 … K)
  plus "0 Platform foundations", "tech-debt-and-improvements" and "Audit". An
  issue has one milestone, so stages as milestones would replace the area
  grouping, not sit beside it. Slava: the milestones were reorganised on
  today's call, so this list may not be the final shape.

**Open questions**

- Stages as milestones: replace the 12 section milestones (and break the
  sheet section = milestone rule), or keep areas and find stages another way
  (the existing `Stage:` line, a filtered view per stage)?
- Without cycles, what answers "what fits by 31 Oct": the six shared views
  plus due dates as they are, or something more?

**Actions**

1. Correct the memory note: HOO-1599/1600 are High; Cycles are off by
   Sergey's answer; estimates stay T-shirt.
2. Before deciding how stages show on the board, whoever applies this looks
   at how milestones are organised in Linear now (they changed on today's
   call) and decides from that, with Sergey where it changes his board.
   (Slava.)
3. Drop the cycle step from the date mirroring (graph → Linear): only due
   dates and milestone targets remain.
