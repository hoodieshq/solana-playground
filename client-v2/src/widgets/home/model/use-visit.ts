import { useEffect } from "react";

import { PgSession } from "@/features/auth";
import { useRenderOnChange } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer } from "@/utils";
import { visitOf } from "./visit";
import type { Visit } from "./visit";

const log = createLogger("home:visit");

/**
 * The visit, for both Homes, kept current: the project list changes by a
 * switch, an init, sync's imports or another tab's delete, and the session
 * fires a change on a sign-in, a sign-out or any change in how its read went
 */
export const useVisit = (): Visit => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  useRenderOnChange(PgExplorer.onDidInit);
  useRenderOnChange(PgExplorer.onDidChangeWorkspaceList);
  useRenderOnChange(PgExplorer.onDidDeleteWorkspace);
  useRenderOnChange(PgSession.onDidChange);
  // Starts the page's first read if nothing has; its result arrives as a change
  useEffect(() => {
    PgSession.whenRead().catch((e: unknown) =>
      // `whenRead` never rejects; should it start to, the team hears of it
      log.error(e, { report: true })
    );
  }, []);
  return visitOf(PgExplorer.allWorkspaceNames, PgSession.readState);
};
