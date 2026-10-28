# Proposal

## Why

Spec 13 draws the console strip as "Building… · {elapsed} · Stop". The strip
shows the words and the seconds (HOO-2324, #200), but nothing can stop a
build or a deploy: the shell drops Ctrl+C, the build awaits the server with
no abort, and the deploy's own cancel is a pause behind two terminal
questions. A person who started the wrong build waits it out (HOO-2394).

## What Changes

- A running command can be stopped. The command runner hands every run a
  stop signal; a command says whether it honours it. Ctrl+C in the terminal
  and the strip's Stop button both stop the run in flight.
- Build honours a stop: the request to the build server is aborted and a
  reply that still arrives is dropped. Nothing about the project changes.
- Deploy honours a stop before the buffer account is created and between
  chunks of the write step, without the pause and close-buffer questions. The
  last transaction (deploy or upgrade) is not interrupted.
- After a stop the terminal prints `^C` and one line saying what was stopped
  and what was left behind; the prompt returns. A stopped run is never
  reported as a failure: no "Process error", no toast, no failed stage.
- The strip shows a Stop button in place of Clear while a build or a deploy
  runs, folded or open, and "Build stopped" / "Deploy stopped" after.
- A command that cannot stop answers Ctrl+C with one line saying so.
- Telemetry: none changed. The strip and the commands live in the legacy
  roots (`views/`, `commands/`, `utils/`), outside any telemetry slice;
  Spec 13's `command_cancelled` is a follow-up (ticket to file).

## Capabilities

### New Capabilities

- `client-v2-command-stop`: stopping a running terminal command (build,
  deploy) from the terminal or the console strip, and what a stop leaves
  behind.

### Modified Capabilities

None.

## Impact

- Code: `src/utils/command.ts` (stop signal, `stop()`), `src/utils/server.ts`
  (abortable build request), `src/utils/terminal/shell.ts` and
  `terminal.ts` (Ctrl+C, stopped runs are not errors),
  `src/commands/build/build.ts`, `src/commands/deploy/deploy.ts`,
  `src/views/flow/state/stage.ts`, `src/views/flow/console/*`.
- `deploy.ts` is also changed by HOO-2385 on `scope/users-work`; the edit
  here stays inside `handle`, `processDeploy`'s cancelled branch and
  `loadBufferWithControl`.
- Out of scope: Kora deploys (not on this branch); stopping `solana`,
  `spl-token`, `sugar`, `test` and the rest (they answer Ctrl+C with "can't be
  stopped"); closing the buffer automatically after a stop; the Deploy
  panel's own Cancel (Spec 03, HOO-2385); Spec 13 Open question 3 beyond the
  minimal answer below, which goes to the designers' batch.
