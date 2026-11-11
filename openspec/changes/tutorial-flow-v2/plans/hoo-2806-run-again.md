# HOO-2806: a failed run or call runs again

Bug ticket, inline. Ticket: https://linear.app/solana-fndn/issue/HOO-2806.
Base `scope/interface-3`.

## Goal

After a run or call fails, the learner can run it again from the feed: the
failed card has a live act card under it, as a failed deploy's Try again.
Today the act card gives way to the failed result and nothing follows.

## Shape

- `view.ts`: `retryOf` returns `fix` for a failed run or call (no reason, or
  `no_transaction`) and `again` for its `no_funds`; null for `no_wallet` and
  `unconfirmed` (that card has Check again). `tryAgain` gives a run or call
  the button "<first word of its button> again" and, for `fix`, the line
  `FIX_AND_RUN` / `FIX_AND_CALL`. The card is the existing
  `<beat>:retry` act turn, so it carries a call's fields, waits while an act
  runs and gives way once the new run starts.
- A button on the result card was the first idea; a call act with fields
  (Hello Anchor's `name`) would send no arguments from there, since a failed
  result does not keep them, so the act card it is.
- Engine: unchanged. `act` already runs a beat whose last run failed while
  the step has not passed; a landed run is judged on the goal.
- Spec: a sentence and a scenario under "Client runs and calls send real
  transactions".

## Terminal

`run` and `test` complete their paths from the scripts under `client/` and
`tests/`, but no longer have `PgCommandManager` refuse a path the list does
not hold (`Arg.suggestOnly`): `runFiles` refuses it inside `processCommon`,
so `run_errored {reason: "other"}` is sent (funnel-events, "A file that does
not exist"). Its line names the scripts there are, or, with none, where to
add one. A refused value of any other command with nothing to choose from
says so instead of "(possible values: )". The shell's Enter reports a
failed command through `reportUnhandled` rather than leaving an unhandled
rejection, so the console shows no "Uncaught (in promise)".
