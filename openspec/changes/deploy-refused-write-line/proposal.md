# Proposal

## Why

A buffer write the cluster refuses is retried in the next round without a word in the terminal, until the deploy gives
up after five rounds that land nothing. On 10 Nov a deploy to a local validator crawled for 821 s with only its
progress showing, and nothing told the user, or the person reading the log afterwards, why (HOO-2797).

## What Changes

- While a deploy writes its buffer, the first write the cluster refuses in each round, for a reason other than a rate
  limit, prints one warning line in the terminal with the cluster's message: "Warning: The cluster refused a buffer
  write ({message}), sending it again...". Later refusals in the same round print nothing more.
- The line prints for a deploy started from the Deploy stage or typed in the terminal, and for a tutorial's deploy.
- A rate-limited write keeps its own "Reached rate-limits" line and prints no refusal line.
- Telemetry: no event is added, renamed or removed. The Deploy funnel step's `deploy_started` and `deploy_succeeded`
  keep firing from `commands/deploy/deploy.ts` as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-v2-deploy`: a refused buffer write shows in the terminal, once per round, with the cluster's message.

## Impact

- Code: `client-v2/src/commands/deploy/` (`bpf-loader-upgradeable.ts` reports a round's first refusal through a new
  `onRefusal` option, `refused-write.ts` holds the line, `deploy.ts` prints it) and the tutorial deploy runner
  (`features/tutorial-conversation/model/runners/real-deploy.ts`).
- Out of scope: the write pace, the backoff and the stalled-round limit, which stay as they are; the "N transactions
  not confirmed" and rate-limit lines; a line per refused write; the in-app steps for starting a local validator.
