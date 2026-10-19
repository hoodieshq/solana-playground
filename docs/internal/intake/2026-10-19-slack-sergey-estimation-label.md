# Slack: Sergey asks to estimate the "estimation" issues and place them in milestones (2026-10-19)

**Source:** Slack, Sergey Prokhorov to Slava, 2026-10-19 21:13. Raw:
`solana-playground/.claude/intake/raw/2026-10-19-slack-sergey-estimation-label.md`
(local). Read alongside: intake 2026-10-19-slack-sergey-linear-setup (T-shirt
estimates stay; stages vs milestones still open).

**Decided**

- Nothing new. The request uses the T-shirt scale, which Sergey kept the same
  day.

**Requirements changed**

- Issues labelled `estimation` are to be estimated and placed in milestones by
  Slava. (Sergey's request.)

**Facts learned** (Linear, read 2026-10-19 23:48)

- The `estimation` label is on 61 Solana Playground issues; the label is
  team-wide, and about 30 Explorer issues carry it too, outside this request.
- 60 of the 61 have no estimate; HOO-2158 (Dependabot alerts, Sergey) is S.
- 8 have no milestone: HOO-2143 (sx review rule in client-v2/CLAUDE.md),
  HOO-2150 (.workspace ENOENT), HOO-2144 (chat reload duplicates items),
  HOO-2111 (local e2e queue port), HOO-2108 (lighter local e2e spike),
  HOO-1926 (tidy client-v2/CLAUDE.md after #43), HOO-1924 (17 lint
  warnings), HOO-1896 (e2e names after OpenSpec scenarios).
- The other 53 already sit in a sheet-section milestone (K Design pass,
  J Infra, A2 History frontend, C AI rail, I Mobile, F, G,
  tech-debt-and-improvements).
- Most are Slava's; some are Sergey's (HOO-2133, HOO-2158) or unassigned.
  Sergey's request covers changing them.

**Open questions**

- Where do estimates come from: the plan graphs already hold durations
  (optimistic / planned / pessimistic per ticket), so the T-shirt size could
  be derived from them rather than guessed per issue?
- "Place in milestones" against which layout: today's sheet sections, or the
  layout changed on the call (see the linear-setup entry)?

**Actions** (routed to Planner on Slava's word, 2026-10-19 23:52; Lead only
if Planner cannot, since Lead is overloaded)

1. Estimate the 60 Playground issues on the T-shirt scale (XS 1, S 2, M 3,
   L 5, XL 8), from the plan graphs' durations where a ticket is in one.
2. Place the 8 issues without a milestone, after looking at how milestones
   are organised in Linear now; check the other 53 still fit that layout.
3. Reply to Sergey in the thread when done, with the count and anything left
   unestimated and why.
