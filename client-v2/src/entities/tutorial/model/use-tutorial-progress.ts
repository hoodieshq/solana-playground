import { useCallback, useEffect, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
// By module, not the utils barrel, which reads the build's globals on import
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgTutorial } from "../../../utils/tutorial/tutorial";
import { progressOf } from "./progress";
import type { TutorialProgress } from "./progress";

const log = createLogger("tutorial:progress");

const NEW: TutorialProgress = { state: "new" };

/**
 * Every registered tutorial's progress, by name. Before the explorer knows
 * its workspaces every tutorial reads as new, and
 * the hook reads again once the explorer initialises. A started tutorial
 * whose saved progress cannot be read shows as started on page 1 and the
 * failure is logged, never thrown into the render.
 */
export const useTutorialProgress = (): ((name: string) => TutorialProgress) => {
  const [progress, setProgress] = useState<Map<string, TutorialProgress>>(
    () => new Map()
  );

  useEffect(() => {
    let live = true;
    // Only the latest read lands: one begun on mount can finish after the
    // one the explorer's init begins
    let latest = 0;
    const update = () => {
      const n = ++latest;
      read().then((next) => {
        if (live && n === latest) setProgress(next);
      });
    };
    const sub = PgExplorer.onDidInit(update);
    update();
    return () => {
      live = false;
      sub.dispose();
    };
  }, []);

  return useCallback((name) => progress.get(name) ?? NEW, [progress]);
};

const read = async (): Promise<Map<string, TutorialProgress>> => {
  // Before the explorer is initialised nothing is started yet, and
  // `isStarted` would throw
  if (!PgExplorer.allWorkspaceNames) return new Map();

  const entries = await Promise.all(
    PgTutorial.all.map(async (t) => {
      if (!PgTutorial.isStarted(t.name)) return [t.name, NEW] as const;
      let meta = null;
      try {
        meta = await PgTutorial.getMetadata(t.name);
      } catch (e) {
        log.warn(`no saved progress for ${t.name}`, {
          context: { error: e instanceof Error ? e.message : String(e) },
        });
      }
      return [t.name, progressOf(true, meta, t.pageCount)] as const;
    })
  );
  return new Map(entries);
};
