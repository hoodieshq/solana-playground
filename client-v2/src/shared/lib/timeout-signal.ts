/**
 * A signal that aborts a request after `ms`.
 *
 * `fetch` itself never gives up: a request stuck on a dead connection hangs
 * for as long as the browser lets it. An aborted request rejects, which lands
 * in the caller's existing catch.
 *
 * @returns the signal, or `undefined` where the browser cannot make one --
 * the request then behaves as it did before
 */
export const timeoutSignal = (ms: number): AbortSignal | undefined =>
  typeof AbortSignal !== "undefined" &&
  typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
