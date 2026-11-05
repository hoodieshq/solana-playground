import type { DeployFundingError } from "@/commands/deploy/run";
import type { StageDeployState } from "@/features/deploy";

import type { StageStatus } from "../state/stage";

/** Why the last run could not fund its wallet */
export type FundingStop = DeployFundingError["detail"];

/**
 * What the Deploy stage shows, one at a time: a running deploy hides the
 * funding card, the failure and the backup line, whoever started it.
 */
export type DeployView =
  | { kind: "idle"; backup: boolean }
  | { kind: "running"; askingStaleBuild: boolean }
  | { kind: "funding"; stop: FundingStop }
  | { kind: "failed" };

/** The stage's view while nothing runs, stopped or failed */
export const IDLE_VIEW: DeployView = { kind: "idle", backup: false };

/** Where the stage is open now: the funding card and backup line belong to one place */
export interface DeployHere {
  cluster: string | null;
  workspace: string | undefined;
  /** The current wallet's address; absent while none is current */
  wallet: string | undefined;
}

/** What the view is read from */
export interface DeployRun {
  /** The stage's own run */
  stage: StageDeployState;
  /**
   * The global deploy state: a terminal `deploy` sets it to "loading" while
   * the stage's phase stays where its last run left it
   */
  deployState: unknown;
  /** The flow's last deploy result */
  flowDeploy: StageStatus;
}

/** The stage's one view, for the project and network open now (`here`) */
export const deployView =
  (here: DeployHere) =>
  ({ stage, deployState, flowDeploy }: DeployRun): DeployView => {
    if (deployState === "loading" || stage.phase === "running") {
      return {
        kind: "running",
        askingStaleBuild: stage.phase === "running" && stage.askingStaleBuild,
      };
    }
    if (stage.phase === "stopped") {
      const { stop } = stage;
      if (stop.kind === "cancelled") return IDLE_VIEW;
      const onThisProject =
        stop.cluster === here.cluster &&
        (stop.workspace ?? undefined) === here.workspace;
      if (onThisProject) return { kind: "funding", stop: stop.detail };
    }
    if (flowDeploy === "failed") return { kind: "failed" };
    return {
      kind: "idle",
      backup:
        stage.phase === "done" &&
        stage.backupFor !== null &&
        stage.backupFor === here.wallet,
    };
  };
