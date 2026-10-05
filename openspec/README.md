# openspec

Specs and change proposals for `client-v2`, laid out the way
[OpenSpec](https://github.com/Fission-AI/OpenSpec) lays them out. The
structure is what matters; the CLI is not a dependency.

```
openspec/
  specs/<capability>/spec.md      what the system does today: the truth about
                                  the code, kept current
  changes/<change>/proposal.md    why we are changing it, goals, non-goals,
                                  the decisions made
  changes/<change>/design.md      how: architecture, trade-offs, what was
                                  measured
  changes/<change>/tasks.md       the steps, their state, their tickets/PRs
  changes/archive/<date>-<change>/  closed changes, their deltas already in specs/
```

Two rules keep the two folders honest:

- `specs/` describes the code as it is. A plan never lives there. When a
  change lands, the spec it touched is updated in the same PR.
- `changes/` holds work in progress. When every task is done, the folder
  moves to `archive/` with the date it closed.

How a change moves through here is written in `client-v2/CLAUDE.md`, section
"Specs and changes".
