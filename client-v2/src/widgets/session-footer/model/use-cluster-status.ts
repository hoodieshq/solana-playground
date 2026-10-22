import { useRenderOnChange } from "../../../hooks";
import { PgConnection } from "../../../utils";
import { isClusterDown } from "./account";

/** The current cluster's name and whether it answers */
export interface ClusterStatus {
  /** `"unknown"` until the connection has a cluster */
  name: string;
  down: boolean;
}

/**
 * The cluster status the footer's row and the rail's dot show,
 * re-rendering when any part changes
 */
export const useClusterStatus = (): ClusterStatus => {
  const cluster = useRenderOnChange(PgConnection.onDidChangeCluster);
  const isConnected = useRenderOnChange(PgConnection.onDidChangeIsConnected);
  const slotStalled = useRenderOnChange(PgConnection.onDidChangeIsClusterDown);
  return {
    name: cluster ?? "unknown",
    down: isClusterDown(isConnected, slotStalled),
  };
};
