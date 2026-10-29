import { useCallback, useEffect, useRef, useState } from "react";

import { PgSession } from "@/features/auth";

/**
 * How many automatic re-reads a failed session check gets before Home offers
 * "Try again" (the designers' Spec 08, retries and backoff: five, then a
 * manual retry)
 */
const AUTO_RETRIES = 5;

export type SessionRetry =
  /** Nothing to retry: the session answered, or Home leads anyway */
  | { kind: "none" }
  /** Re-reading on its own, on focus and when the browser is back online */
  | { kind: "waiting" }
  /** The automatic re-reads are spent; only the user's press reads again */
  | { kind: "exhausted"; retry: () => Promise<void> };

/**
 * Re-reads a failed session check while it decides what Home leads with
 * (`active`: no project in the browser, so the visit hangs on it). Each
 * focus or return online re-reads, up to `AUTO_RETRIES`; offline pauses, as
 * a re-read then could only fail again. After that, `retry` re-reads on a
 * press and starts a fresh round.
 */
export const useSessionRetry = (active: boolean): SessionRetry => {
  const [tries, setTries] = useState(0);
  const reading = useRef(false);

  const reread = useCallback(async () => {
    if (reading.current) return;
    reading.current = true;
    try {
      await PgSession.refresh();
    } finally {
      reading.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || tries >= AUTO_RETRIES) return;
    const onWake = () => {
      if (!navigator.onLine) return;
      setTries((n) => n + 1);
      void reread();
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [active, tries, reread]);

  if (!active) return { kind: "none" };
  if (tries < AUTO_RETRIES) return { kind: "waiting" };
  return {
    kind: "exhausted",
    retry: async () => {
      setTries(0);
      await reread();
    },
  };
};
