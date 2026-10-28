import { useState } from "react";

import { useRenderOnChange } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer, PgProgramInfo, PgServer } from "@/utils";
import { downloadFailure, programName } from "../model/program";
import { cliDeployTelemetry } from "../model/telemetry";
import type { DownloadFrom } from "../model/telemetry";
import BaseDownloadProgram from "./BaseDownloadProgram";

const log = createLogger("cli-deploy:download");

/** Hands `bytes` to the browser to save as `name`, keeping no copy */
const save = (name: string, bytes: Uint8Array) => {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/octet-stream" })
  );
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  a.click();
  // The click starts the download synchronously; the URL is not needed after
  setTimeout(() => URL.revokeObjectURL(url));
};

/** The program's file name, from the IDL the last build produced */
export const useProgramName = () => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl) as {
    name?: string;
    metadata?: { name?: string };
  } | null;
  return programName({
    idlName: idl?.metadata?.name ?? idl?.name,
    workspace: PgExplorer.currentWorkspaceName,
  });
};

/** "Download .so", connected: fetches the last build's binary on press */
const DownloadProgram = ({ from }: { from: DownloadFrom }) => {
  const name = useProgramName();
  const [notBuilt, setNotBuilt] = useState(false);
  const fileName = `${name}.so`;

  const onDownload = async () => {
    setNotBuilt(false);
    const uuid = PgProgramInfo.uuid;
    try {
      if (!uuid) throw new Error("No build to download");
      save(fileName, await PgServer.deploy(uuid));
    } catch (e) {
      const reason = uuid ? downloadFailure(e) : "not-built";
      cliDeployTelemetry.track("cli_binary_download_failed", { from, reason });
      if (reason === "not-built") {
        // Expected once the server drops the build: the user is told to
        // rebuild, so nothing for the team to hear about
        log.info("Binary no longer on the server", { context: { uuid } });
        setNotBuilt(true);
        return;
      }
      throw e;
    }
    cliDeployTelemetry.track("cli_binary_downloaded", { from });
  };

  return (
    <BaseDownloadProgram
      fileName={fileName}
      notBuilt={notBuilt}
      onDownload={onDownload}
    />
  );
};

export default DownloadProgram;
