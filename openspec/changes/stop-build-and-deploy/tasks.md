# Tasks

## 1. Stop a running build or deploy (HOO-2394)

- [x] 1.1 Runner stop signal, `StoppedError`/`isStopped`, Ctrl+C in the shell, stopped runs printed without "Process error" and never toasted; verified by unit tests on `PgCommandManager` and the shell.
- [x] 1.2 Build honours the stop (aborted fetch, late reply dropped) and `PgFlow` returns to the settled status with `stopped: "build"`; verified by `build.test.ts` and `stage.test.ts` (depends on 1.1).
- [x] 1.3 Deploy honours the stop before the buffer and between chunks, with the buffer line and no questions; verified by unit tests on the cancelled branch (depends on 1.1).
- [x] 1.4 Strip: Stop in place of Clear, "Build stopped"/"Deploy stopped"; verified by `ConsoleDrawer.test.tsx`, `status` tests and the e2e scenarios of `client-v2-command-stop`, with desktop and phone screenshots (depends on 1.2, 1.3).
