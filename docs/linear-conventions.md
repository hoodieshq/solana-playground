# Filing a Linear ticket for this repo

Workspace `solana-fndn`, team **Hoodies** (the only team), project
**Solana Playground**.

## Every PR has a ticket

A pull request without a Linear issue is not ready for review. The rule has
two halves:

- **The ticket exists before the PR is asked for.** One issue per PR, in
  project `Solana Playground`, its state matching reality (`In Review` while
  the PR is open, `In Progress` while it is a draft), assigned to whoever
  owns the work.
- **The PR body links it on the first line**, as a bare markdown link -- the
  reviewer's first click, above the summary.

**Tickets are filed with `/sx:brief`, never by hand.** The skill reads the
workspace templates live, applies the substitutions below, and shows the
draft before it creates anything. Filing by hand is how a ticket ends up in
the Explorer project with an Explorer heading. If the skill is not available
in the session, follow its `SKILL.md`: TLDR proposal plus ballpark, a
horizontal rule, then the template's own sections.

Checked on 2026-09-21: PRs #23, #25, #26, #27, #28 and #29 all carry one
(HOO-1599, HOO-1707, HOO-1708, HOO-1709, HOO-1651, HOO-1633).

## The two substitutions

The workspace's `Bug` and `Feature` templates were written for the Solana
Explorer project and are shared with that team. **Do not edit them.** Apply
two substitutions per ticket instead:

| The template gives | Use instead | Why |
| --- | --- | --- |
| project `Explorer` | project `Solana Playground` | the template carries Explorer's own `projectId`, so a ticket created from the template alone lands in the wrong project |
| heading `## Reference in Explorer` | `## Reference in Playground` | the only project-specific heading in the body |

Everything else the template sets is left alone: Medium priority, the `Todo`
state, and the `Bug` label. The remaining headings — Summary, Steps to
reproduce, Actual behavior, Expected Behavior (DOD), Environment,
Logs/Screenshots, Additional notes — are project-neutral, and the Environment
hint about cluster, browser and wallet fits Playground unchanged.

Existing tickets may still carry the old heading; HOO-1651 does. Leave them.

## Screenshots

Commit the image to `docs/internal/assets/<date>-<slug>/` on
`context-archive`, then reference its `raw.githubusercontent.com` URL in the
ticket body. Linear turns the markdown image into a real hosted image on
save. The repo is public, so the URL renders for everyone.

Do not paste a `uploads.linear.app` URL back into a ticket you are rewriting:
the signature in its query string expires within minutes, and Linear re-signs
the bare path on every read.

## Drafting

`/sx:brief <description>` drafts the body and creates the ticket, showing the
full draft first. It reads the Linear templates live, so the substitutions
above are applied to what it produces, not to a copy kept here.

Its TLDR and the `Ballpark` line under it are **proposals**: a human rewrites
the TLDR before grooming, fills the Estimate field from the ballpark, and
deletes both markers. Their absence is the signal that a human vetted the
summary.

## Why not fix this at the source

Two better fixes exist and were both rejected for now:

- **Editing the shared `Bug` template.** It belongs to the Explorer team as
  much as to us.
- **Adding a `Bug (Playground)` template beside it.** Additive and it would
  retire both substitutions, but it still lives in the shared workspace, and
  the Linear MCP has no `save_template` — it would be a manual, one-time job
  in the Linear UI.

Worth revisiting once Playground tickets are frequent enough that the manual
substitution costs more than the template would. As of 18 Sep 2026 there are
five.
