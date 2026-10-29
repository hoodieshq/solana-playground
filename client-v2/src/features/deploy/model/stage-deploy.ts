import { useSyncExternalStore } from "react";

import {
  DeployCancelledError,
  DeployFundingError,
  PgDeployRun,
} from "@/commands/deploy/run";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import {
  PgCommand,
  PgConnection,
  PgGlobal,
  PgProgramInfo,
  PgWallet,
} from "@/utils";
import { answerBackup, isBackupAnswered } from "./backup";
import { deployTelemetry } from "./telemetry";

/** How the stage's last run stopped short of a deploy, when it did */
export type StageStop =
  | { kind: "funding"; detail: DeployFundingError["detail"] }
  | { kind: "cancelled" }
  | null;

/**
 * The stage's run, kept outside the stage: the stage router remounts it on
 * every switch, and a question or an outcome must outlive that
 */
export interface StageDeployState {
  /** A run the stage started has not finished */
  starting: boolean;
  /** The run is waiting on "Your last build failed" */
  askingStaleBuild: boolean;
  stop: StageStop;
  /** The wallet address the backup line is shown for */
  backupFor: string | null;
}

/** How long a new Playground wallet may take to become current */
const WALLET_TIMEOUT_MS = 15_000;

/**
 * Connect the Playground wallet a stage deploy pays from, without a dialog:
 * the current account, else the first, else a new one. Resolves once it is
 * `PgWallet.current`, which is derived asynchronously: the deploy's own
 * wallet check would otherwise ask in the terminal.
 */
const ensurePlaygroundWallet = async () => {
  if (PgWallet.current) return;
  let dispose = () => {};
  const connected = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("The Playground wallet did not connect.")),
      WALLET_TIMEOUT_MS
    );
    const sub = PgWallet.onDidChangeCurrent((current) => {
      if (!current) return;
      clearTimeout(timer);
      resolve();
    });
    dispose = () => {
      clearTimeout(timer);
      sub.dispose();
    };
  });
  try {
    if (PgWallet.accounts.length === 0) PgWallet.add();
    else PgWallet.switch(Math.max(PgWallet.currentIndex, 0));
    await connected;
  } finally {
    dispose();
  }
};

/** The Deploy stage's runs: started, answered and finished here */
export class PgStageDeploy {
  static get state(): StageDeployState {
    return PgStageDeploy._state;
  }

  static onDidChange(cb: () => void) {
    PgStageDeploy._listeners.add(cb);
    return () => {
      PgStageDeploy._listeners.delete(cb);
    };
  }

  /** Deploy the project's program from the stage; a second press is ignored */
  static async start() {
    if (PgStageDeploy._state.starting || PgGlobal.deployState === "loading") {
      return;
    }
    PgStageDeploy._set({ starting: true, stop: null, backupFor: null });

    const cluster = PgConnection.cluster;
    const redeploy = PgProgramInfo.onChain?.deployed === true;
    let result: Awaited<ReturnType<typeof PgCommand.deploy.execute>>;
    try {
      // Interact's deployment switcher may have pointed the project at an
      // imported id; redeploying always targets the project's own key,
      // never whatever Interact last selected.
      PgProgramInfo.update({ customPk: null });
      if (cluster) {
        deployTelemetry.track("deploy_started", { cluster, redeploy });
      }
      await ensurePlaygroundWallet();
      result = await PgDeployRun.withAnswers(
        { confirmStaleBuild: PgStageDeploy._askStaleBuild },
        () => PgCommand.deploy.execute()
      );
    } catch (error) {
      PgStageDeploy._failed(error, cluster);
      return;
    } finally {
      PgStageDeploy._set({ starting: false, askingStaleBuild: false });
    }

    // A press that only paused or resumed a run reports nothing
    if (!result) return;
    if (cluster) {
      deployTelemetry.track("deploy_succeeded", { cluster, redeploy });
    }
    const paidBy = PgWallet.current;
    if (paidBy?.isPg) {
      const address = paidBy.publicKey.toBase58();
      if (!isBackupAnswered(address)) {
        PgStageDeploy._set({ backupFor: address });
        deployTelemetry.track("deploy_backup_shown", {});
      }
    }
  }

  /** The user answered "Your last build failed" */
  static answerStaleBuild(deploy: boolean) {
    const resolve = PgStageDeploy._staleResolve;
    PgStageDeploy._staleResolve = null;
    PgStageDeploy._set({ askingStaleBuild: false });
    resolve?.(deploy);
  }

  /**
   * The user answered the backup line; it hides for this wallet whether or
   * not the answer could be stored
   */
  static answerBackup(saved: boolean) {
    const address = PgStageDeploy._state.backupFor;
    if (!address) return;
    answerBackup(address);
    deployTelemetry.track(
      saved ? "deploy_backup_saved" : "deploy_backup_dismissed",
      {}
    );
    PgStageDeploy._set({ backupFor: null });
  }

  private static _askStaleBuild = () =>
    new Promise<boolean>((resolve) => {
      PgStageDeploy._staleResolve = resolve;
      PgStageDeploy._set({ askingStaleBuild: true });
    });

  private static _failed(error: unknown, cluster: typeof PgConnection.cluster) {
    if (error instanceof DeployCancelledError) {
      PgStageDeploy._set({ stop: { kind: "cancelled" } });
      return;
    }
    if (error instanceof DeployFundingError) {
      PgStageDeploy._set({ stop: { kind: "funding", detail: error.detail } });
      if (cluster) {
        deployTelemetry.track("deploy_sol_needed_shown", {
          cluster,
          reason: error.detail.reason,
        });
        deployTelemetry.track("deploy_failed", { cluster, step: "funding" });
      }
      return;
    }
    if (cluster) {
      deployTelemetry.track("deploy_failed", {
        cluster,
        step: PgDeployRun.lastStep ?? "checks",
      });
    }
    reportButtonFailure("deploy")(error);
  }

  private static _set(patch: Partial<StageDeployState>) {
    PgStageDeploy._state = { ...PgStageDeploy._state, ...patch };
    for (const cb of PgStageDeploy._listeners) cb();
  }

  private static _state: StageDeployState = {
    starting: false,
    askingStaleBuild: false,
    stop: null,
    backupFor: null,
  };
  private static _staleResolve: ((deploy: boolean) => void) | null = null;
  private static readonly _listeners = new Set<() => void>();
}

/** The stage's run, re-rendering as it moves */
export const useStageDeploy = (): StageDeployState =>
  useSyncExternalStore(PgStageDeploy.onDidChange, () => PgStageDeploy.state);
