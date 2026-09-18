# Filing a Linear ticket for this repo

Workspace `solana-fndn`, team **Hoodies** (the only team), project
**Solana Playground**.

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
