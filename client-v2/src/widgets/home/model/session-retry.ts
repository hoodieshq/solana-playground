import { useCallback, useEffect, useRef, useState } from "react";

import { PgSession } from "@/features/auth";

/**
 * How many automatic re-reads a failed account check gets before Home
 * offers "Try again": five, then a manual retry, as the designers' Spec 08
 * section "Retries and backoff" asks
 */
const AUTO_RETRIES = 5;

/**
 * How long the first timed re-read waits after Home starts waiting on a
 * failed check; each later one waits twice as long (2, 4, 8, 16, 32 s)
 */
const FIRST_RETRY_MS = 2_000;

export type SessionRetry =
  /** Nothing to retry: the session answered, or Home leads anyway */
  | { kind: "none" }
  /**
   * Re-reading on its own: on a timer that backs off, and sooner on a focus
   * or a return online
   */
  | { kind: "waiting" }
  /**
   * The automatic re-reads are spent (the last may still be in flight); the
   * line stays, and `retry` re-reads on a press until a read answers
   */
  | { kind: "exhausted"; retry: () => Promise<void> };

/**
 * Re-reads a failed account check while it decides what Home leads with
 * (`active`: no project in the browser, so the visit hangs on it). It reads
 * on a backing-off timer from `FIRST_RETRY_MS`, and on each focus or return
 * online, counting only reads it starts, up to `AUTO_RETRIES`; offline
 * pauses, as a read then could only fail again. The count resets when the
 * retry is no longer needed (the check answered, or a project now leads).
 */
export const useSessionRetry = (active: boolean): SessionRetry => {
  const [tries, setTries] = useState(0);
  const reading = useRef<Promise<void> | null>(null);

  /** Starts a read, or joins the one this hook has in flight; whether it started one */
  const reread = useCallback(() => {
    if (reading.current) return { started: false, done: reading.current };
    const done = PgSession.refresh().finally(() => {
      reading.current = null;
    });
    reading.current = done;
    return { started: true, done };
  }, []);

  useEffect(() => {
    if (!active) setTries(0);
  }, [active]);

  useEffect(() => {
    if (!active || tries >= AUTO_RETRIES) return;
    const onWake = () => {
      if (!navigator.onLine) return;
      if (reread().started) setTries((n) => n + 1);
    };
    const timed = setTimeout(onWake, FIRST_RETRY_MS * 2 ** tries);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      clearTimeout(timed);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [active, tries, reread]);

  if (!active) return { kind: "none" };
  if (tries < AUTO_RETRIES) return { kind: "waiting" };
  return {
    kind: "exhausted",
    retry: async () => {
      await reread().done;
    },
  };
};
