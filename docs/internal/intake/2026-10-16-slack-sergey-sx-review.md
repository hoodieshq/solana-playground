# Slack: Sergey's recap of the sx review rule (2026-10-16)

**Source:** Slack, Sergey Prokhorov to @playground-dev, 2026-10-16 22:48. A
written recap of what the 16 Oct call (Slava, Sergey) agreed on PR review.
Raw: `solana-playground/.claude/intake/raw/2026-10-16-slack-sergey-sx-review.md`
(local). Read alongside: `.claude/prompts/backlog.md` ("Process decisions
from Slava's 16 Oct call with Sergey"), Linear HOO-2131.

**Decided**

- Every PR author runs the `sx:review-pr` skill
  (hoodieshq/solana-explorer-dev-skills) before the PR is opened, and fixes
  the critical and important findings that seem necessary. Slava builds the
  run into the agent pipeline. (Slava and Sergey on the call; Sergey's recap.)
- Review gaps and repeated gaps in the code get fixed. One outside the PR's
  scope becomes a Linear issue, improved later through agent rules or, where
  possible, tooling. (Same.)

**Requirements changed**

- Author's gate: `/pr-review-toolkit:review-pr` in the author's session,
  `sx:review-pr` reviewer-only → `sx:review-pr` run by the author on every PR.
- What the author must fix from it: critical only (as the call was first
  relayed) → critical and important "that seem necessary".

**Facts learned**

- The skill's source is `github.com/hoodieshq/solana-explorer-dev-skills`.
- The fleet change is live: the runtime fleet (4e44d7f, installed
  2026-10-19) has the author run `/sx:review-pr full` then
  `/sx:review-pr` before `gh pr create`, again before READY only if the diff
  moved materially, with `sx:review-pr (full + default) @ <sha>: 0 critical
  open` in the PR body. `client-v2/CLAUDE.md:284` still names
  `pr-review-toolkit`; `full` mode runs its agents, so both are met.
- No notes of the 16 Oct call are committed to `docs/internal/`; this recap
  is the only written team-facing record of the review rule.
- Out-of-PR tech-debt findings already have a home: HOO-2131 "Tech debt:
  findings kept out of the stage plans" (label Tech Debt, Backlog).

**Open questions**

- "Important that seem necessary": who judges, and where does a skipped
  important finding get recorded (the `Dispositions:` block)?
- Is the recap's "create an issue in Linear" one issue per gap, or children
  of HOO-2131?

**Actions**

1. Route the fleet change (author runs `sx:review-pr`, fixes critical +
   important) to Architect, noting it is already backlog item 5 and that the
   fleet check-in skill still forbids it. Slava: the change is already in
   progress; give Architect this recap as context. — lead 2026-10-19-author-review-gate (merged with Architect's matching item; recap relayed)
2. Decide where out-of-PR review gaps land in Linear (HOO-2131 children or
   standalone issues) and say it in the PR rules. — declined: out-of-PR gaps
   already reach Lead as `INTAKE`, and Lead places every ticket
3. Write the 16 Oct call notes to `docs/internal/` so the review, e2e and
   TESTING.md decisions have a committed record. — lead 2026-10-19-call-notes-16-oct (internal docs, no Linear ticket)
