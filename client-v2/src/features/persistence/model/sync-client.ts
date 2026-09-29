import { LOCKED_REQUEST_MS, timeoutSignal } from "./sync-lock";

/**
 * Whether the backend will accept sync at all.
 *
 * Asked once and remembered, the same way the assistant panel probes
 * `/api/agent` before offering the default backend. A deployment with no
 * database answers "no" and every caller quietly stays local.
 */
export class PgSyncClient {
  static async available(): Promise<boolean> {
    if (PgSyncClient._available === null) {
      const probe: Promise<boolean> = PgSyncClient._probe().then((answer) => {
        // No answer is not a "no". Remembered, a request that timed out or
        // met a dead connection would turn sync off for the life of the tab.
        if (answer === null && PgSyncClient._available === probe) {
          PgSyncClient._available = null;
        }
        return answer === true;
      });
      PgSyncClient._available = probe;
    }
    return PgSyncClient._available;
  }

  /** Test seam: forget the memoised probe */
  static reset() {
    PgSyncClient._available = null;
  }

  private static _available: Promise<boolean> | null = null;

  /**
   * @returns the backend's answer, or `null` when the request itself failed
   * and there is none
   */
  private static async _probe(): Promise<boolean | null> {
    let response: Response;
    try {
      // Time-limited: this runs inside the sync lock, as the first thing a
      // reconcile asks, and every other tab's sync waits behind it
      response = await fetch("/api/sync", {
        cache: "no-store",
        signal: timeoutSignal(LOCKED_REQUEST_MS),
      });
    } catch {
      return null;
    }

    try {
      if (!response.ok) return false;
      const body = await response.json();
      return body?.enabled === true;
    } catch (e) {
      // The timeout covers the body too, and a body cut off is no answer.
      // One that is not JSON is: a deployment that serves the app for every
      // path, with no `/api` behind it.
      const name = (e as Error | undefined)?.name;
      return name === "TimeoutError" || name === "AbortError" ? null : false;
    }
  }
}
