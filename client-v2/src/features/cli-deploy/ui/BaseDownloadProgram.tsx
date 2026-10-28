import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { AsyncButton } from "@/shared/ui/async-button";

export interface BaseDownloadProgramProps {
  /** The file the binary is saved as, `<program>.so` */
  fileName: string;
  /** The server no longer holds the build, so the binary must be built again */
  notBuilt: boolean;
  /** Fetches and saves the binary; a rejection is a failure to report */
  onDownload: () => Promise<void>;
}

/** Saves the program binary the last build produced; nothing is kept here */
const BaseDownloadProgram = (p: BaseDownloadProgramProps) => (
  <>
    <AsyncButton
      variant="outline"
      title={`Save ${p.fileName}`}
      onClick={p.onDownload}
      onError={reportButtonFailure("download the program binary")}
    >
      Download .so
    </AsyncButton>
    {p.notBuilt && (
      <span role="status" className="font-mono text-xs text-muted-foreground">
        Build again to download the binary.
      </span>
    )}
  </>
);

export default BaseDownloadProgram;
