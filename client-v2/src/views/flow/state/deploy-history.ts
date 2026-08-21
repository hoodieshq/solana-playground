import {
  PgCommand,
  PgConnection,
  PgExplorer,
  PgProgramInfo,
} from "../../../utils";
import type { Disposable } from "../../../utils";

export interface DeployRecord {
  id: string;
  workspace: string;
  cluster: string;
  programId: string;
  signature: string | null;
  at: number;
}

const KEY = "flow.deploys";

/** Every deploy this browser has made, newest first, keyed by
 * workspace. */
export class PgDeployHistory {
  static list(workspace: string): DeployRecord[] {
    return PgDeployHistory._all().filter((r) => r.workspace === workspace);
  }

  static latest(workspace: string): DeployRecord | null {
    return PgDeployHistory.list(workspace)[0] ?? null;
  }

  static add(r: Omit<DeployRecord, "id" | "at">): DeployRecord {
    const record: DeployRecord = {
      ...r,
      id: `${r.programId}-${Date.now()}`,
      at: Date.now(),
    };
    const all = [record, ...PgDeployHistory._all()];
    localStorage.setItem(KEY, JSON.stringify(all));
    for (const cb of PgDeployHistory._listeners) cb();
    return record;
  }

  static onDidChange(cb: () => void): Disposable {
    PgDeployHistory._listeners.add(cb);
    cb();
    return { dispose: () => PgDeployHistory._listeners.delete(cb) };
  }

  /** Record real deploys as they finish. Call once from the Flow
   * layout. */
  static init(): Disposable {
    return PgCommand.deploy.onDidFinish((result) => {
      if ("err" in result) return; // Ignore deploy errors

      const programId = PgProgramInfo.getPkStr();
      const workspace = PgExplorer.currentWorkspaceName;
      const cluster = PgConnection.cluster;
      if (!programId || !workspace || !cluster) return;

      // Deploy command returns void, so signature is always null.
      // A later task can populate this from elsewhere if needed.
      PgDeployHistory.add({
        workspace,
        cluster,
        programId,
        signature: null,
      });
    });
  }

  private static _all(): DeployRecord[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DeployRecord[];
    } catch {
      return [];
    }
  }

  private static readonly _listeners = new Set<() => void>();
}
