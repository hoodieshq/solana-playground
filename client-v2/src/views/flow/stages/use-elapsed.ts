import { useEffect, useState } from "react";

import type { FlowState } from "../state/stage";

/** What the count reads of the flow */
type BuildClock = Pick<FlowState, "build" | "buildStartedAt">;

/**
 * How long the running build has run, ticking once a second while it runs
 * and `null` otherwise, so an idle stage keeps no timer
 */
export const useElapsed = (flow: BuildClock) => {
  const running = flow.build === "running" ? flow.buildStartedAt : null;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (running === null) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);
  return running === null ? null : Math.max(0, now - running);
};
