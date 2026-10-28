# Design

## Context

Commands run through `PgCommandManager.execute`, inside `PgTerminal.process`,
which disables the prompt and prints any thrown error as "Process error: …".
The shell passes only Ctrl+C (`\x03`) through while a command runs, then
ignores it (`TODO: implement stopping commands`). `PgServer.build` is a plain
`fetch`. Deploy already pauses and cancels the write step through
`PgGlobal.deployState` and an `AbortController` that
`BpfLoaderUpgradeable.loadBuffer` checks between chunks, but only behind two
terminal questions ("Continue deployment?", "close the buffer account?").
The strip's status comes from `PgFlow.state` (`views/flow/state/stage.ts`).

## Goals / Non-Goals

**Goals:** one stop path shared by Ctrl+C and the strip; build and deploy
honour it; a stop is never shown as a failure.

**Non-Goals:** stopping every command; closing the buffer on stop; Kora.

## Decisions

- **The runner owns the signal; commands opt in.** `execute` creates an
  `AbortController` per top-level run and passes `signal` in the handler's
  input; a command declares `stoppable: true`. `PgCommandManager.stop()`
  aborts the run in flight when it is stoppable and otherwise prints that it
  can't stop. Racing every handler against the signal was rejected: a
  handler that ignores it keeps running (a deploy would keep sending
  transactions) while the prompt says it stopped.
- **A stop is an error type, declared once.** `StoppedError` and `isStopped`
  live beside the runner. `PgTerm.process` prints a stopped run's message
  without the "Process error:" prefix and marks it shown, so no button
  toasts it. `PgFlow` maps a stopped `build` to `build-stop` (back to the
  settled status) and a stopped `deploy` to `deploy-stop` (back to `active`),
  and keeps `stopped: "build" | "deploy" | null` for the strip's words.
- **Build drops a late reply.** The signal goes into `fetch`; after the
  response (or the Seahorse compile) the handler checks `signal.aborted` once
  more before touching `PgProgramInfo` or `PgBuildOutput`.
- **Deploy keeps its pause, loses its questions on stop.** The run's signal
  aborts `loadBufferWithControl`'s controller and, if a pause question is
  open, answers it, and the loader resolves `cancelled` only after
  `loadBuffer` returns, so the chunks in flight land first. `processDeploy`
  then prints the buffer line instead of asking to close it. Checkpoints sit
  before the binary fetch result is used and before the buffer is created.
  The final transaction has no checkpoint: interrupting it is not possible
  and a half-sent upgrade is worse than a finished one.
- **The strip's Stop replaces Clear** (Spec 13, phone section) and stays
  visible folded, since the strip is all a folded console shows. The design
  sources draw no Stop for the strip; a ghost `xs` Button like Clear is the
  closest match (design gap, sent to the designers' batch).

## Risks / Trade-offs

- [A stop after the last chunk but before the deploy transaction leaves a
  fully written buffer] → the line names the buffer and the reclaim command.
- [`deploy.ts` also changes on `scope/users-work` (HOO-2385)] → the edit is
  kept to the cancelled branch and the loader; Lead is told the file names.
