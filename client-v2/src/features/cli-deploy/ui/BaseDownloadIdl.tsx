import { Button } from "@/shared/ui/button";

export interface BaseDownloadIdlProps {
  /** The file the IDL is saved as, `<program>.json` */
  fileName: string;
  /** Playground holds an IDL for the program */
  hasIdl: boolean;
  /** Saves the IDL */
  onDownload: () => void;
}

/** Saves the IDL Playground holds, beside "Download .so"; off without one */
const BaseDownloadIdl = (p: BaseDownloadIdlProps) => (
  <Button
    variant="outline"
    disabled={!p.hasIdl}
    title={p.hasIdl ? `Save ${p.fileName}` : "This program has no IDL"}
    onClick={p.onDownload}
  >
    Download IDL
  </Button>
);

export default BaseDownloadIdl;
