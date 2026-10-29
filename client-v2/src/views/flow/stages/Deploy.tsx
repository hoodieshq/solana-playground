import { useEffect, useRef, useState } from "react";

import { CliDeployGuide } from "@/features/cli-deploy";
import type { GuideFrom } from "@/features/cli-deploy";

import BaseDeploy from "./BaseDeploy";
import type {
  DeployDetails,
  DeployPayer,
  DeployStatus,
  FundingStop,
} from "./BaseDeploy";
import IdlActions from "./IdlActions";
import {
  useBalance,
  useBlockExplorer,
  useProgramInfo,
  useRenderOnChange,
  useWallet,
} from "../../../hooks";
import {
  PgCommand,
  PgConnection,
  PgExplorer,
  PgGlobal,
  PgProgramInfo,
  PgWallet,
} from "../../../utils";
import type { Cluster } from "../../../utils";
import {
  DeployCancelledError,
  DeployFundingError,
  PgDeployRun,
} from "../../../commands/deploy/run";
import type { DeployStep } from "../../../commands/deploy/run";
import { isSignInFailure, PgSession } from "@/features/auth";
import {
  answerBackup,
  deployTelemetry,
  isBackupAnswered,
  useDeployRun,
} from "@/features/deploy";
import { createLogger } from "@/shared/lib/logger";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { PgDeployHistory } from "../state/deploy-history";
import type { DeployRecord } from "../state/deploy-history";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";

const log = createLogger("flow:deploy");

/** This workspace's deployments, newest first */
const readHistory = () =>
  PgDeployHistory.list(PgExplorer.currentWorkspaceName ?? "");

/** How the stage's last run stopped short of a deploy, when it did */
type Stop =
  | { kind: "funding"; detail: FundingStop }
  | { kind: "cancelled" }
  | null;

/**
 * A second click on Deploy while one is already running pauses it
 * (`deployState` becomes "paused") rather than starting a new one, which
 * upstream's sidebar exposes as an explicit "Continue"/pause toggle. Flow
 * does not offer that control, so the stage holds the button while a deploy
 * is "running" instead. A run the user cancelled is not a failure.
 */
const deployStatus = (
  deployState: unknown,
  flow: FlowState,
  stop: Stop
): DeployStatus => {
  if (deployState === "loading") return "running";
  if (flow.deploy === "failed" && stop?.kind !== "cancelled") return "failed";
  return "idle";
};

/**
 * Connect the Playground wallet a stage deploy pays from, without a dialog:
 * the current account, else the first, else a new one.
 */
const ensurePlaygroundWallet = () => {
  if (PgWallet.current) return;
  if (PgWallet.accounts.length === 0) PgWallet.add();
  else PgWallet.switch(Math.max(PgWallet.currentIndex, 0));
};

/** The Deploy stage, connected: the flow, the history, the chain, commands */
const Deploy = () => {
  const [flow, setFlow] = useState<FlowState>(PgFlow.state);
  // Read on mount, not only on change: the stage router remounts this stage
  // on every switch, and no event fires to fill it again.
  const [history, setHistory] = useState<DeployRecord[]>(readHistory);
  const [guide, setGuide] = useState<GuideFrom | null>(null);
  const [stop, setStop] = useState<Stop>(null);
  const [staleAnswer, setStaleAnswer] = useState<
    ((deploy: boolean) => void) | null
  >(null);
  const [backupFor, setBackupFor] = useState<string | null>(null);
  const explorer = useBlockExplorer();
  const programInfo = useProgramInfo();
  const run = useDeployRun();
  const wallet = useWallet();
  const balance = useBalance();
  const deployState = useRenderOnChange(PgGlobal.onDidChangeDeployState);
  useRenderOnChange(PgConnection.onDidChangeCluster);

  // The step a run was on when it threw; the run state is reset by then
  const lastStep = useRef<DeployStep | null>(null);
  if (run.step) lastStep.current = run.step;

  useEffect(() => {
    const refresh = () => setHistory(readHistory());
    const a = PgFlow.onDidChange(setFlow);
    const b = PgDeployHistory.onDidChange(refresh);
    const c = PgExplorer.onDidSwitchWorkspace(refresh);
    return () => {
      a.dispose();
      b.dispose();
      c.dispose();
    };
  }, []);

  // Only what the chain answered for a deployed program. The authority and
  // the program-data size describe the upgrade path, so they show only while
  // the program can still be upgraded.
  const onChain = programInfo.onChain;
  const deployed = onChain?.deployed === true;
  const upgradable = deployed && onChain?.upgradable === true;
  const details: DeployDetails = {
    upgradable: deployed ? upgradable : null,
    authority: upgradable ? onChain?.authority?.toBase58() ?? null : null,
    programSize: upgradable ? onChain?.programDataLen ?? null : null,
  };

  const payer: DeployPayer | null = wallet
    ? {
        address: wallet.publicKey.toBase58(),
        balance: typeof balance === "number" ? balance : null,
      }
    : null;

  const deploy = () => {
    setStop(null);
    setBackupFor(null);
    lastStep.current = null;
    // Interact's deployment switcher may have pointed the project at an
    // imported id; redeploying always targets the project's own key,
    // never whatever Interact last selected.
    PgProgramInfo.update({ customPk: null });
    ensurePlaygroundWallet();

    const cluster: Cluster | null = PgConnection.cluster;
    const redeploy = deployed;
    if (cluster) deployTelemetry.track("deploy_started", { cluster, redeploy });

    PgDeployRun.withAnswers(
      {
        confirmStaleBuild: () =>
          new Promise<boolean>((resolve) =>
            setStaleAnswer(() => (answer: boolean) => {
              setStaleAnswer(null);
              resolve(answer);
            })
          ),
      },
      () => PgCommand.deploy.execute()
    )
      .then((result) => {
        if (!result) return;
        if (cluster) {
          deployTelemetry.track("deploy_succeeded", { cluster, redeploy });
        }
        const paidBy = PgWallet.current;
        if (paidBy?.isPg) {
          const address = paidBy.publicKey.toBase58();
          if (!isBackupAnswered(address)) {
            setBackupFor(address);
            deployTelemetry.track("deploy_backup_shown", {});
          }
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DeployCancelledError) {
          setStop({ kind: "cancelled" });
          return;
        }
        if (error instanceof DeployFundingError) {
          setStop({ kind: "funding", detail: error.detail });
          if (cluster) {
            deployTelemetry.track("deploy_sol_needed_shown", {
              cluster,
              reason: error.detail.reason,
            });
            deployTelemetry.track("deploy_failed", {
              cluster,
              step: "funding",
            });
          }
          return;
        }
        if (cluster) {
          deployTelemetry.track("deploy_failed", {
            cluster,
            step: lastStep.current ?? "checks",
          });
        }
        reportButtonFailure("deploy")(error);
      });
  };

  const signIn = () => {
    PgSession.signIn()
      // Signed in, the funding the card asked for goes ahead on its own
      .then(deploy)
      .catch((error: unknown) => {
        // `PgSession.signInState` holds every failure and the account row
        // shows it; `auth` telemetry has its reason
        if (isSignInFailure(error)) {
          log.info("sign-in from the deploy stage failed", {
            context: { error: String(error) },
          });
          return;
        }
        log.error(error, { report: true, context: { from: "deploy" } });
      });
  };

  const backupAddress = wallet?.publicKey.toBase58() ?? null;
  const answerBackupLine = (save: boolean) => {
    if (!backupAddress) return;
    if (save) {
      try {
        PgWallet.export();
      } catch (error) {
        reportButtonFailure("save the keypair")(error);
        return;
      }
    }
    answerBackup(backupAddress);
    deployTelemetry.track(
      save ? "deploy_backup_saved" : "deploy_backup_dismissed",
      {}
    );
    setBackupFor(null);
  };

  const built = flow.build === "done";
  const programId = programInfo.pk?.toBase58() ?? null;

  return (
    <>
      <BaseDeploy
        cluster={PgConnection.cluster}
        built={built}
        deploy={deployStatus(deployState, flow, stop)}
        programId={programId}
        details={details}
        history={history}
        payer={payer}
        run={run}
        funding={stop?.kind === "funding" ? stop.detail : null}
        backup={backupFor !== null && backupFor === backupAddress}
        staleBuild={staleAnswer !== null}
        addressUrl={(id, cluster) =>
          explorer.getAddressUrl(id, cluster as Cluster)
        }
        txUrl={(signature, cluster) =>
          explorer.getTxUrl(signature, cluster as Cluster)
        }
        onDeploy={deploy}
        onSignIn={signIn}
        onSaveKeypair={() => answerBackupLine(true)}
        onDismissBackup={() => answerBackupLine(false)}
        onStaleBuildAnswer={(answer) => staleAnswer?.(answer)}
        onInteract={() => PgFlow.setStage("interact")}
        idlUpload={<IdlActions mode="upload" />}
        onOpenCliGuide={setGuide}
      />
      <CliDeployGuide
        from={guide}
        onClose={() => setGuide(null)}
        cluster={PgConnection.cluster}
        built={built}
        programId={programId}
      />
    </>
  );
};

export default Deploy;
