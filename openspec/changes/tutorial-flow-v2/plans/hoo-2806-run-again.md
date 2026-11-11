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
not exist"). A relative path is looked for in the command's own folder, as
the completion list offers it, so `run tests/x.test.ts` is still refused. Its line names the scripts there are, or, with none, where to
add one. A refused value of any other command with nothing to choose from
says so instead of "(possible values: )". The shell's Enter reports a
failed command through `reportUnhandled` rather than leaving an unhandled
rejection, so the console shows no "Uncaught (in promise)".

## A client run outside the card

Only the Call panel called `PgConversation.passed`, so a `run` typed in the
terminal on step 3 ran `client.ts` and the step waited on, though the
assistant's context says running the client file passes the step.

- `run-call.ts`: the reading after the send moves to `fromSends`, which the
  run act and `readOutsideRun` share; the latter funds, stages and prints
  nothing, and reads nothing off devnet.
- `client-run-watch.ts`: `watchClientRuns(begin, port)` captures a `run`
  of the client file (`run` alone, or paths naming `client.ts`) from its
  start to its finish and reads it back; at the start it hands `pg.program`
  the deployed IDL, as the run act does. The run act's own
  run goes through `run` inside the act's capture, so its capture answers
  `CAPTURE_BUSY` and the watcher leaves it to the card.
- `reducer.ts`: `clientRunInput` is the live step's call or refused goal as
  a `RunInput`, null on any other step, once it passed, or while an act runs.
- `store.ts`: `PgConversation.watchClientRuns` hands the result to
  `passed("client", result)`, unless another tutorial opened, this one
  started over, or the cursor left the step meanwhile; the reducer judges it as any `passed`.
- `TutorialConversation.tsx` starts it with `realClientRuns()`, as it starts
  `watchDeploys`.
- Spec: a sentence and a scenario under "A step passes on what happened".

## No dead end (the user's rule, 11 Nov)

"Any card that requires an action that has a possibility to be failed needs
to show an appropriate retry button so there's never a dead end for the
user." The matrix of act × outcome → control is in the PR body and in the
table-driven test `never a dead end` in `view.ts`. Two cells were dead ends
beyond the run and call ones above:

- An unplanned build failure: Explain closed the card and "Show me the fix"
  wrote the lines, and "I'll fix it myself" only moved the caret; neither
  left a Build to press. `fixMyself` on a failed build now records
  `selfFixAt` (saved, parsed in `progress.ts`) and closes the card; once it
  is closed that way, or by Explain once the answer ended, `view.ts` posts
  "Build again" with `FIX_AND_BUILD` in the retry slot. A planned failure
  still goes to `onFail`.
- A run or call with no wallet: `BaseTxResultCard`'s "No wallet" card gets
  the deploy card's Create wallet, wired to the same `createWallet` handler.

The HOO-2356 refusals (immutable program, wrong authority) are `failed`
deploys, so they keep Try again with the refusal as the card's message; a
reason of their own stays with HOO-2356.
