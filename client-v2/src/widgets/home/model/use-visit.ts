import { useEffect, useState } from "react";

import { PgSession } from "@/features/auth";
import { useRenderOnChange } from "@/hooks";
import { PgExplorer } from "@/utils";
import { visitOf } from "./visit";
import type { SessionSeen, Visit } from "./visit";

const sessionSeen = (): SessionSeen => {
  if (!PgSession.hasRead) return "unread";
  return PgSession.readFailed ? "failed" : "answered";
};

/**
 * The visit, for both Homes, kept current: the project list changes by a
 * switch, an init, sync's imports or another tab's delete, and the session
 * by a sign-in or a sign-out, which fire a change, or by its first read,
 * which fires none when it finds nobody; the local `read` state re-renders
 * for that one
 */
export const useVisit = (): Visit => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  useRenderOnChange(PgExplorer.onDidInit);
  useRenderOnChange(PgExplorer.onDidChangeWorkspaceList);
  useRenderOnChange(PgExplorer.onDidDeleteWorkspace);
  useRenderOnChange(PgSession.onDidChange);
  const [, setRead] = useState(PgSession.hasRead);
  useEffect(() => {
    let live = true;
    // Never rejects; a failed read settles too, and leaves the visit unknown
    void PgSession.whenRead().then(() => {
      if (live) setRead(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return visitOf(PgExplorer.allWorkspaceNames, sessionSeen());
};
