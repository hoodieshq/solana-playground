import { useEffect, useState } from "react";

import { cliClusterOf } from "../model/commands";
import type { CliCluster, CliTool } from "../model/commands";
import { cliDeployTelemetry } from "../model/telemetry";
import type { GuideFrom } from "../model/telemetry";
import BaseCliDeployGuide from "./BaseCliDeployGuide";
import DownloadProgram, { useProgramName } from "./DownloadProgram";

export interface CliDeployGuideProps {
  /** The control that opened the guide; `null` while it is closed */
  from: GuideFrom | null;
  onClose: () => void;
  /** Playground's cluster, `null` until read */
  cluster: string | null;
  /** The last build succeeded, so there is a binary to download */
  built: boolean;
  /** The project's program id, `null` when it has none yet */
  programId: string | null;
}

/**
 * The cluster the guide opens on: Mainnet from the mainnet warning, else the
 * one Playground is on, else Devnet
 */
const openingCluster = (from: GuideFrom, cluster: string | null): CliCluster =>
  from === "mainnet-warning" ? "mainnet" : cliClusterOf(cluster) ?? "devnet";

/** The CLI deploy guide, connected: the program's name, the download, events */
const CliDeployGuide = (p: CliDeployGuideProps) => {
  const name = useProgramName();
  const [tool, setTool] = useState<CliTool>("solana");
  const [cluster, setCluster] = useState<CliCluster>("devnet");

  const { from } = p;
  useEffect(() => {
    if (!from) return;
    setCluster(openingCluster(from, p.cluster));
    cliDeployTelemetry.track("cli_guide_opened", { from });
    // Only an opening resets the cluster; a cluster read while the guide is
    // open must not undo the user's pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  return (
    <BaseCliDeployGuide
      open={from !== null}
      onOpenChange={(open) => {
        if (!open) p.onClose();
      }}
      tool={tool}
      cluster={cluster}
      onToolChange={setTool}
      onClusterChange={setCluster}
      name={name}
      programId={p.programId}
      download={p.built ? <DownloadProgram from="guide" /> : null}
      onCopy={() =>
        cliDeployTelemetry.track("cli_command_copied", { tool, cluster })
      }
    />
  );
};

export default CliDeployGuide;
