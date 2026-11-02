import { ArrowUpRight } from "lucide-react";

import type { LandedCall } from "@/features/tutorial-conversation";
import { CopyButton } from "@/shared/ui/copy-button";
import {
  explorerAddress,
  explorerTx,
  shortKey,
  solOf,
} from "../model/explorer";

/** One row of the receipt: what it is, and the key it shows */
interface Row {
  label: string;
  key: string;
  url: string;
}

/** The rows the receipt has: the signature, the signer, then each account */
const rowsOf = (call: LandedCall): Row[] => {
  const rows: Row[] = [];
  const signature = call.signatures.at(-1);
  if (signature) {
    rows.push({
      label: "Signature",
      key: signature,
      url: explorerTx(signature),
    });
  }
  const { receipt } = call;
  if (receipt?.signer) {
    rows.push({
      label: "Your wallet · signer",
      key: receipt.signer,
      url: explorerAddress(receipt.signer),
    });
  }
  for (const account of receipt?.accounts ?? []) {
    rows.push({
      label: account.name,
      key: account.address,
      url: explorerAddress(account.address),
    });
  }
  return rows;
};

/** The log the receipt shows: the transaction's, or the line the definition picked */
const logOf = (call: LandedCall): string[] => {
  if (call.receipt?.log?.length) return call.receipt.log;
  return call.line ? [call.line] : [];
};

/** The receipt as text, row by row, for Copy receipt */
export const receiptText = (call: LandedCall): string => {
  const lines = rowsOf(call).map((r) => `${r.label}: ${r.key}`);
  if (call.receipt?.fee !== undefined) {
    lines.push(`Fee ${solOf(call.receipt.fee)} devnet SOL`);
  }
  return lines.concat(logOf(call)).join("\n");
};

export interface BaseReceiptProps {
  call: LandedCall;
  onCopyError: (error: unknown) => void;
}

/**
 * The last call's receipt, inside the finish card's "Transaction details":
 * every address row with Copy and an Explorer link on devnet, the fee, and
 * the log. Each row shows only when the result has its field; the call
 * runner (task 4.3) fills the fee, the signer, the accounts and the log.
 */
const BaseReceipt = ({ call, onCopyError }: BaseReceiptProps) => {
  const log = logOf(call);
  return (
    <div className="flex flex-col gap-2 text-caption">
      <ul className="flex flex-col gap-1">
        {rowsOf(call).map((row) => (
          <li
            key={`${row.label}:${row.key}`}
            className="flex items-center gap-2"
          >
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {row.label}
            </span>
            <span className="font-mono text-foreground">
              {shortKey(row.key)}
            </span>
            <CopyButton
              value={row.key}
              label={`Copy ${row.label}`}
              onError={onCopyError}
            />
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${row.label} in Explorer`}
              className="inline-flex size-6 items-center justify-center rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-purple"
            >
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
      {call.receipt?.fee !== undefined && (
        <p className="text-muted-foreground tabular-nums">
          Fee {solOf(call.receipt.fee)} devnet SOL
        </p>
      )}
      {log.length > 0 && (
        <pre className="overflow-x-auto rounded-control bg-surface-well px-3 py-2 font-mono text-[0.75rem] leading-[1.6] text-foreground">
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
};

export default BaseReceipt;
