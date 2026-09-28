/** One name for the whole origin: every tab decides against the same marks */
export const SYNC_LOCK = "pg-project-sync";

/**
 * Run `fn` while no other tab of this browser is deciding or writing.
 *
 * Tabs share the sync marks, so a reconcile in one tab and an upload in
 * another read and write the same state in whatever order they happen to
 * run. The tab-switch race came from exactly that: B listed the account
 * before A's flush landed and read the mark after it, and so saw a
 * divergence that was only A's own edit in flight.
 *
 * Not re-entrant -- no Web Lock is. A caller that already holds it says so
 * to `push` with `immediate`, which is the same promise `reconcile` makes
 * about the push gate.
 *
 * Where the browser has no Web Locks (jsdom, very old engines) `fn` just
 * runs. That loses cross-tab ordering, not correctness within a tab.
 */
export const withSyncLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return await fn();
  return (await locks.request(SYNC_LOCK, fn)) as T;
};

/** How long a request made while holding the lock may take */
export const LOCKED_REQUEST_MS = 15_000;

/**
 * A signal that aborts a request after `ms`, for anything sent while the
 * lock is held.
 *
 * Every other tab's sync waits behind the holder, and `fetch` itself never
 * gives up: a request stuck on a dead connection kept the lock, and with it
 * every tab's reconcile and upload, for as long as the browser let it hang.
 * An aborted request rejects, which lands in the caller's existing catch.
 *
 * @returns the signal, or `undefined` where the browser cannot make one --
 * the request then behaves as it did before
 */
export const timeoutSignal = (ms: number): AbortSignal | undefined =>
  typeof AbortSignal !== "undefined" &&
  typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
