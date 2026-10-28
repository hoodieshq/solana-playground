import { useEffect, useState } from "react";

import { PgSession } from "@/features/auth";
import { onDidChangeSyncMarkers, syncMarkerOf } from "@/features/persistence";
import type { SyncMarker } from "@/features/persistence";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer } from "@/utils";

const log = createLogger("app-nav:sync-markers");

type Markers = Readonly<Record<string, SyncMarker>>;

const NONE: Markers = {};

const sameMarkers = (a: Markers, b: Markers) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
};

/**
 * Each workspace's sync marker, by name, read again whenever one may have
 * moved: sync's own events (`onDidChangeSyncMarkers`), the session, and the
 * explorer's list. One read at a time: a change during a read queues one
 * more, never a second read alongside it.
 */
export const useSyncMarkers = (): Markers => {
  const [markers, setMarkers] = useState<Markers>(NONE);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let queued = false;

    const readAll = async () => {
      const next: Record<string, SyncMarker> = {};
      for (const name of PgExplorer.allWorkspaceNames ?? []) {
        const id = PgExplorer.workspaceIdOf(name);
        if (!id) continue;
        const marker = await syncMarkerOf(id, name);
        if (marker) next[name] = marker;
      }
      return next;
    };

    const read = async () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        do {
          queued = false;
          const next = await readAll();
          if (disposed) return;
          setMarkers((prev) => (sameMarkers(prev, next) ? prev : next));
        } while (queued);
      } catch (e) {
        // The rows keep the markers they had; the next change reads again
        log.warn("sync markers could not be read", { context: { e } });
      } finally {
        running = false;
      }
    };
    const reread = () => void read();

    reread();
    const subscriptions = [
      onDidChangeSyncMarkers(reread),
      PgSession.onDidChange(reread),
      PgExplorer.onDidCreateWorkspace(reread),
      PgExplorer.onDidRenameWorkspace(reread),
      PgExplorer.onDidDeleteWorkspace(reread),
      PgExplorer.onDidSwitchWorkspace(reread),
      PgExplorer.onDidChangeWorkspaceList(reread),
    ];
    return () => {
      disposed = true;
      subscriptions.forEach((s) => s.dispose());
    };
  }, []);

  return markers;
};
