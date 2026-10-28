# Tasks

## 1. Stop a running build or deploy (HOO-2394)

- [x] 1.1 Runner stop signal and stoppability, `StoppedError`/`isStopped`, Ctrl+C and ⌘. in the terminal, stopped runs printed without "Process error" and never toasted; verified by `command.test.ts`, `terminal-process.test.ts` and the e2e scenarios "Ctrl+C during a build" and "⌘. during a build".
- [x] 1.2 Build honours the stop (aborted fetch, late reply dropped) and `PgFlow` returns to the settled status with `stopped: "build"`; verified by `build.test.ts` and `stage.test.ts` (depends on 1.1).
- [x] 1.3 Deploy honours the stop while funding and writing, closes the buffer, and locks the final step; verified by `deploy/stopped.test.ts` (the lines), `stage.test.ts` (the flow) and the manual deploy scenarios (depends on 1.1).
- [x] 1.4 Strip: Stop beside a turned-off Clear on a desktop, in its place on a phone, "Build stopped"/"Deploy stopped"; verified by `BaseConsoleDrawer.test.tsx`, `ConsoleDrawer.test.tsx`, `status.test.ts` and the e2e scenarios of `client-v2-command-stop`, with desktop and phone screenshots (depends on 1.2, 1.3).
