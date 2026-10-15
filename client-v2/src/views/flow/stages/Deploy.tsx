import { useEffect, useState } from "react";

import BaseDeploy from "./BaseDeploy";
import type { DeployDetails } from "./BaseDeploy";
import IdlActions from "./IdlActions";
import {
  useBlockExplorer,
  useProgramInfo,
  useRenderOnChange,
} from "../../../hooks";
import {
  PgCommand,
  PgConnection,
  PgExplorer,
  PgGlobal,
  PgProgramInfo,
} from "../../../utils";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { PgDeployHistory } from "../state/deploy-history";
import type { DeployRecord } from "../state/deploy-history";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";

/** This workspace's deployments, newest first */
const readHistory = () =>
  PgDeployHistory.list(PgExplorer.currentWorkspaceName ?? "");

/** The Deploy stage, connected: the flow, the history, the chain, commands */
const Deploy = () => {
  const [flow, setFlow] = useState<FlowState>(PgFlow.state);
  // Read on mount, not only on change: the stage router remounts this stage
  // on every switch, and no event fires to fill it again.
  const [history, setHistory] = useState<DeployRecord[]>(readHistory);
  const explorer = useBlockExplorer();
  const programInfo = useProgramInfo();
  const deployState = useRenderOnChange(PgGlobal.onDidChangeDeployState);
  useRenderOnChange(PgConnection.onDidChangeCluster);

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

  // Only what the chain answered for a deployed program; the authority
  // matters only while the program can still be upgraded.
  const onChain = programInfo.onChain;
  const deployed = onChain?.deployed === true;
  const upgradable = deployed && onChain?.upgradable === true;
  const details: DeployDetails = {
    upgradable: deployed ? upgradable : null,
    authority: upgradable ? onChain?.authority?.toBase58() ?? null : null,
    programSize: upgradable ? onChain?.programDataLen ?? null : null,
  };

  return (
    <BaseDeploy
      cluster={PgConnection.cluster}
      built={flow.build === "done"}
      // A second click on Deploy while one is already running pauses it
      // (`deployState` becomes "paused") rather than starting a new one,
      // which upstream's sidebar exposes as an explicit "Continue"/pause
      // toggle. Flow does not offer that control, so a click here would
      // either be a no-op or an unintended pause -- hold the button instead.
      deploying={deployState === "loading"}
      failed={flow.deploy === "failed"}
      programId={programInfo.pk?.toBase58() ?? null}
      latest={history[0] ?? null}
      details={details}
      history={history}
      addressUrl={(id) => explorer.getAddressUrl(id)}
      txUrl={(signature) => explorer.getTxUrl(signature)}
      onDeploy={() => {
        // Interact's deployment switcher may have pointed the project at an
        // imported id; redeploying always targets the project's own key,
        // never whatever Interact last selected.
        PgProgramInfo.update({ customPk: null });
        PgCommand.deploy.execute().catch(reportButtonFailure);
      }}
      onInteract={() => PgFlow.setStage("interact")}
      idlDrop={<IdlActions showUpload />}
    />
  );
};

export default Deploy;
