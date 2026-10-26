import { useEffect, useState } from "react";

// By module, not the utils barrel, which reads the build's globals on import
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgTutorial } from "../../../utils/tutorial/tutorial";

/**
 * The tutorial on screen while it is not started, or `null`: off a tutorial's
 * route, once Start has made its workspace, and before the explorer knows its
 * workspaces. Until Start there is no project of the tutorial's to show, so
 * the assistant names the tutorial and the files column stays empty, even
 * when other projects exist.
 */
export const useTutorialBeforeStart = () => {
  const [name, setName] = useState(read);
  useEffect(() => {
    const update = () => setName(read());
    // Start makes the workspace and switches to it; the route sets the
    // tutorial; the explorer initialises after the panels on a cold start
    const subs = [
      PgTutorial.onDidChangeCurrent(update),
      PgExplorer.onDidInit(update),
      PgExplorer.onDidSwitchWorkspace(update),
      PgExplorer.onDidChangeWorkspaceList(update),
    ];
    update();
    return () => subs.forEach((sub) => sub.dispose());
  }, []);
  return name;
};

const read = (): string | null => {
  const name = PgTutorial.current?.name;
  const workspaces = PgExplorer.allWorkspaceNames;
  if (!name || !workspaces || workspaces.includes(name)) return null;
  return name;
};
