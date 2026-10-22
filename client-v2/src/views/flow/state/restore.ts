import { PgFlow } from "./stage";
import { PgDeployHistory } from "./deploy-history";
import { PgExplorer, PgProgramInfo } from "../../../utils";
import type { Disposable } from "../../../utils";

/**
 * Show what an opened project kept from before: a built interface and a
 * deploy on record. The loop's state lives in memory, so without this a
 * reload put a project already on devnet back at Write with nothing ticked.
 * It only fills in a loop that has not run this session; a build or a
 * deploy started here always wins.
 */
export const restoreFlow = (): Disposable => {
  const sync = () => {
    const workspace = PgExplorer.currentWorkspaceName;
    if (!workspace) return;
    PgFlow.restore({
      built: !!PgProgramInfo.idl,
      deployed: PgDeployHistory.list(workspace).length > 0,
    });
  };
  const subs = [
    PgProgramInfo.onDidChange(sync),
    PgDeployHistory.onDidChange(sync),
  ];
  sync();
  return { dispose: () => subs.forEach((s) => s.dispose()) };
};
