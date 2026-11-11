# Tasks

## 1. A buffer write with no answer counts as refused

- [x] 1.1 Put a 20 s time limit on each buffer write in `loadBuffer`; a write past it is refused with "No answer in
  20 s" and ends its round (HOO-2819). Verify with `npx vitest run src/commands/deploy`: a write that never answers
  prints the line within the limit and the load ends at the stalled-round limit, and a write answered under the limit
  lands; the first test fails without the change.

## Workflow follow-up

- Archive the change in the PR that ticks 1.1, without `tasks.md`.
