import { useSyncExternalStore } from "react";

import {
  DeployCancelledError,
  DeployFundingError,
  PgDeployRun,
} from "@/commands/deploy/run";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import type { Cluster } from "@/utils";
import { createLogger } from "@/shared/lib/logger";
import { answerBackup, isBackupAnswered } from "./backup";
import { deployTelemetry } from "./telemetry";

const log = createLogger("deploy:stage");

/**
 * How the stage's last run stopped short of a deploy, when it did; the
 * project and network it ran on, so another project or network never shows
 * this run's card
 */
export type StageStop =
  | {
      kind: "funding";
      detail: DeployFundingError["detail"];
      cluster: string | null;
      workspace: string | null;
    }
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
const ensurePlaygroundWallet = async (
  PgWallet: typeof import("@/utils").PgWallet
) => {
  if (PgWallet.current) return;
  let dispose = () => {};
  const connected = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "The Playground wallet did not connect. Reload the page, then deploy again."
          )
        ),
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
    if (PgStageDeploy._state.starting) return;
    // Loaded here, not at the top: the slice's parts and helpers render in
    // places that never load the playground's runtime
    const {
      PgCommand,
      PgConnection,
      PgExplorer,
      PgGlobal,
      PgProgramInfo,
      PgWallet,
    } = await import("@/utils");
    if (PgStageDeploy._state.starting || PgGlobal.deployState === "loading") {
      return;
    }
    PgStageDeploy._set({ starting: true, stop: null, backupFor: null });

    const cluster = PgConnection.cluster;
    const workspace = PgExplorer.currentWorkspaceName ?? null;
    const redeploy = PgProgramInfo.onChain?.deployed === true;
    // A step recorded by an earlier run says nothing about this one, which
    // may fail before it reaches the deploy command
    let reachedRun = false;
    let result: Awaited<ReturnType<typeof PgCommand.deploy.execute>>;
    try {
      // Interact's deployment switcher may have pointed the project at an
      // imported id; redeploying always targets the project's own key,
      // never whatever Interact last selected.
      PgProgramInfo.update({ customPk: null });
      if (cluster) {
        deployTelemetry.track("deploy_started", { cluster, redeploy });
      }
      await ensurePlaygroundWallet(PgWallet);
      reachedRun = true;
      result = await PgDeployRun.withAnswers(
        { confirmStaleBuild: PgStageDeploy._askStaleBuild },
        () => PgCommand.deploy.execute()
      );
    } catch (error) {
      PgStageDeploy._failed(error, { cluster, workspace, reachedRun });
      return;
    } finally {
      // A question still open when the run ended can no longer be answered
      PgStageDeploy._staleResolve?.(false);
      PgStageDeploy._staleResolve = null;
      PgStageDeploy._set({ starting: false, askingStaleBuild: false });
    }

    // A press that only paused or resumed a run reports nothing
    if (!result) return;
    try {
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
    } catch (error) {
      // The program is deployed; only the backup line or an event is lost
      log.error(error, { report: true, context: { after: "deploy" } });
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
      // Another run's question, if one is somehow open, is answered no
      // rather than left to hang
      PgStageDeploy._staleResolve?.(false);
      PgStageDeploy._staleResolve = resolve;
      PgStageDeploy._set({ askingStaleBuild: true });
    });

  private static _failed(
    error: unknown,
    run: {
      cluster: Cluster | null;
      workspace: string | null;
      reachedRun: boolean;
    }
  ) {
    const { cluster, workspace } = run;
    if (error instanceof DeployCancelledError) {
      PgStageDeploy._set({ stop: { kind: "cancelled" } });
      return;
    }
    if (error instanceof DeployFundingError) {
      PgStageDeploy._set({
        stop: { kind: "funding", detail: error.detail, cluster, workspace },
      });
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
        step: (run.reachedRun && PgDeployRun.lastStep) || "checks",
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
