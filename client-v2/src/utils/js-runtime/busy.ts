// Kept apart from `js-runtime.ts`, which loads lazily with mocha and the
// TypeScript compiler, so a command can tell a refused run without loading them.

/**
 * `PgJsRuntime.execute` refused because tests or a client script were
 * already running. Its message says what to wait for.
 */
export class RunBusyError extends Error {
  name = "RunBusyError";
}

/**
 * Whether a run was refused because another run was in progress.
 *
 * @param error what `PgJsRuntime.execute` threw
 * @returns `true` for a `RunBusyError`
 */
export const isRunBusy = (error: unknown): error is RunBusyError =>
  error instanceof RunBusyError;
