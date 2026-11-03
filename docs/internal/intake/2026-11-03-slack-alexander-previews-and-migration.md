# Slack: previews on a Vercel-generated domain, file migration dropped (2026-11-03)

## Source
Slack, Alexander Anikeev, 2026-11-03 14:40 his time; passed on by Slava 2026-11-03 15:21. Raw: `.claude/intake/raw/2026-11-03-slack-alexander-previews-and-migration.md`.

## Decided
None yet; both points are proposals from Alexander, routed for the owners to settle.

## Requirements changed
None yet.

## Facts learned
- Alexander: previews need not run on the customer's Vercel; master can be deployed there and the Vercel-generated domain used as the stage before release.
- Alexander: the task about migrating existing files is not relevant, because the release goes to a separate domain with no current users; migration from the SolPG beta, if possible, only by the user by hand.
- Related: the unrecorded draft on team Vercel preview costs (2026-10-29).

## Open questions
- Which tickets the dropped file migration affects (Planner checking).
- Whether previews move off the customer's Vercel (Lead).

## Actions
- Preview and deploy process proposal -> lead (inbox 1793701351096-1fcd).
- Check tickets affected by the dropped file migration -> planner (inbox 1793701351142-9176).
