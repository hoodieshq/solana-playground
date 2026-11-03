import { Button } from "@/shared/ui/button";

export interface BaseDownloadIdlProps {
  /** The file the IDL is saved as, `<program>.json` */
  fileName: string;
  /** Playground holds an IDL for the program */
  hasIdl: boolean;
  /** Saves the IDL */
  onDownload: () => void;
}

/**
 * Saves the IDL Playground holds, beside "Download .so". Without one it is
 * `aria-disabled`, not `disabled`: it stays focusable, so keyboard and
 * screen-reader users still reach why it is off.
 */
const BaseDownloadIdl = (p: BaseDownloadIdlProps) => (
  <Button
    variant="outline"
    aria-disabled={!p.hasIdl}
    className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    title={p.hasIdl ? `Save ${p.fileName}` : "This program has no IDL"}
    onClick={p.hasIdl ? p.onDownload : undefined}
  >
    Download IDL
  </Button>
);

export default BaseDownloadIdl;
