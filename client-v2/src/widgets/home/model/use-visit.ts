import { useEffect, useState } from "react";

import { PgSession } from "@/features/auth";
import { useRenderOnChange } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer } from "@/utils";
import { visitOf } from "./visit";
import type { SessionSeen, Visit } from "./visit";

const log = createLogger("home:visit");

const sessionSeen = (): SessionSeen => {
  if (!PgSession.hasRead) return "unread";
  return PgSession.get() ? "in" : "out";
};

/**
 * The visit, for both Homes, kept current: the project list changes by a
 * switch, an init, sync's imports or another tab's delete, and the session
 * by a sign-in, a sign-out or its first read (which, finding nobody, fires
 * no change)
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
    PgSession.whenRead().then(
      () => live && setRead(true),
      // A read that fails leaves the visit unknown: Home leads with nothing
      // rather than offer the example to someone who may be signed in
      (e: unknown) =>
        log.warn("the session could not be read", { context: { e } })
    );
    return () => {
      live = false;
    };
  }, []);
  return visitOf(PgExplorer.allWorkspaceNames, sessionSeen());
};
