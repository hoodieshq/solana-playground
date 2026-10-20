import { useCallback, useEffect, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import { PgExplorer, PgRouter } from "@/utils";
import { homeTelemetry } from "./telemetry";
import type { HomeLeaveVia, HomeVia } from "./telemetry";

export type StartView = "pending" | "home" | "work";

const log = createLogger("home:start");

/**
 * How long `/` waits for the explorer before it gives up on Home: IndexedDB
 * held by another tab's upgrade never answers, and the stage would stay
 * empty for good.
 */
export const START_TIMEOUT_MS = 10_000;

/**
 * Home is for a start on `/` with no project open. Any other route opens
 * straight on the work; on `/` the answer waits for the explorer. Projects
 * listed with none current is still Home: sync imports the account's
 * projects without opening them, and the work mounted then throws in the
 * explorer. `useStartView` leaves Home once one is opened.
 */
export const decideStart = ({
  path,
  workspaces,
  current,
}: {
  path: string;
  workspaces: readonly string[] | undefined;
  current: string | undefined;
}): StartView => {
  if (path !== "/") return "work";
  if (workspaces === undefined) return "pending";
  return workspaces.length && current ? "work" : "home";
};

/**
 * Whether the work can be drawn: anywhere but `/`, or on `/` with a project
 * open (a temporary one counts; it has no name). On `/` with none open the
 * explorer throws, so Home is the only page there.
 */
const workDrawable = () =>
  PgRouter.location.pathname !== "/" ||
  PgExplorer.isTemporary ||
  PgExplorer.currentWorkspaceName !== undefined;

/** What the page shows, and how Home came to show */
type Shown = { view: StartView; via: HomeVia };

export type PageView = {
  view: StartView;
  /**
   * Whether the work stays mounted under Home: whenever it can be drawn.
   * Going back then finds the editor and the console as they were.
   */
  workKept: boolean;
  /** Show Home from the work (the navigation's Home) */
  showHome: (via: HomeVia) => void;
  /** Go back to the work, when there is one to go back to */
  leaveHome: (via: HomeLeaveVia) => void;
};

/**
 * Whether the page shows Home, the work, or neither yet, for the whole page
 * load. The start shows Home on `/` with no project open; the route
 * initialises the explorer inside the editor's mount, which Home does not
 * have, so on `/` this initialises it first (`PgExplorer.init` runs its calls
 * one after another, so the route's own call later is harmless). After the
 * start Home comes back from the navigation (`showHome`) and on its own
 * whenever `/` is left with no project open: the last one deleted, here, by
 * another tab or by sync, or a way back to `/`.
 */
export const useStartView = (): PageView => {
  const [shown, setShown] = useState<Shown>(() => ({
    view: decideStart({
      path: PgRouter.location.pathname,
      workspaces: PgExplorer.allWorkspaceNames,
      current: PgExplorer.currentWorkspaceName,
    }),
    via: "start",
  }));
  const [workKept, setWorkKept] = useState(workDrawable);
  const view = shown.view;

  useEffect(() => {
    if (view !== "pending") return;
    let live = true;
    const watchdog = setTimeout(() => {
      live = false;
      log.error(
        new Error(`The explorer did not answer within ${START_TIMEOUT_MS} ms`),
        { report: true }
      );
      setShown({ view: "work", via: "start" });
    }, START_TIMEOUT_MS);
    PgExplorer.init()
      .finally(() => clearTimeout(watchdog))
      .then(() => {
        if (!live) return;
        const workspaces = PgExplorer.allWorkspaceNames;
        if (workspaces === undefined) {
          // An init that lists nothing is a broken explorer, not a first
          // visit; the work is the start without Home and copes
          log.error(new Error("The explorer listed no projects after init"), {
            report: true,
          });
          setShown({ view: "work", via: "start" });
          return;
        }
        setShown({
          view: decideStart({
            path: PgRouter.location.pathname,
            workspaces,
            current: PgExplorer.currentWorkspaceName,
          }),
          via: "start",
        });
      })
      .catch((e: unknown) => {
        // The work is the start without Home and still works
        log.error(e, { report: true });
        if (live) setShown({ view: "work", via: "start" });
      });
    return () => {
      live = false;
      clearTimeout(watchdog);
    };
  }, [view]);

  // Whatever shows, the explorer and the route decide whether the work can
  // be drawn; the work cannot be drawn on `/` with no project open, so Home
  // takes over there
  useEffect(() => {
    const check = (via: HomeVia) => {
      const drawable = workDrawable();
      setWorkKept(drawable);
      if (drawable) return;
      setShown((now) => (now.view === "work" ? { view: "home", via } : now));
    };
    const subs = [
      PgExplorer.onDidSwitchWorkspace(() => check("last-deleted")),
      PgExplorer.onDidInit(() => check("last-deleted")),
      PgExplorer.onDidDeleteWorkspace(() => check("last-deleted")),
      PgRouter.onDidChangePath(() => check("back")),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, []);

  useEffect(() => {
    if (view !== "home") return;
    homeTelemetry.track("home_shown", { via: shown.via });
    // Leaves once a project is open, not once one exists: sync imports the
    // account's projects without opening them (`PgExplorer.importWorkspace`),
    // and the work mounted with projects listed and none current throws in
    // the explorer. The session's `adopt` (effects/session) opens the newest
    // one right after, through `PgExplorer.switchWorkspace`.
    const toWork = () => {
      if (!PgExplorer.currentWorkspaceName) return;
      homeTelemetry.track("home_left", { via: "open" });
      setShown({ view: "work", via: shown.via });
    };
    const subs = [
      // A project made here, or the account's opened after arriving by sync
      PgExplorer.onDidCreateWorkspace(toWork),
      PgExplorer.onDidSwitchWorkspace(toWork),
      PgRouter.onDidChangePath((path) => {
        if (path === "/") return;
        homeTelemetry.track("home_left", { via: "open" });
        setShown({ view: "work", via: shown.via });
      }),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, [view, shown.via]);

  const showHome = useCallback((via: HomeVia) => {
    setShown((now) => (now.view === "home" ? now : { view: "home", via }));
  }, []);

  const leaveHome = useCallback(
    (via: HomeLeaveVia) => {
      if (view !== "home" || !workDrawable()) return;
      homeTelemetry.track("home_left", { via });
      setShown({ view: "work", via: shown.via });
    },
    [view, shown.via]
  );

  return { view, workKept, showHome, leaveHome };
};
