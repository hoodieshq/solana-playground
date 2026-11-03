import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  CircleCheck,
  CircleX,
  ExternalLink,
  Eye,
} from "lucide-react";

import type { RunResult } from "@/features/tutorial-conversation";
import { devnetExplorerUrl } from "@/shared/lib/devnet-explorer";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { CopyButton } from "@/shared/ui/copy-button";
import { READ, formatSeconds } from "./Prose";

type TxResult = Extract<RunResult, { act: "run" | "call" }>;
type Landed = Extract<TxResult, { ok: true }>;
type Failed = Extract<TxResult, { ok: false }>;

const PROGRAM_LOG = "Program log: ";

/** The head's meta when no instruction was decoded */
const SENT_FROM: Record<TxResult["act"], string> = {
  run: "from client.ts",
  call: "from the chat",
};

/** lamports as test SOL, the way the details sentence says the fee */
const testSol = (lamports: number) => String(lamports / 1e9);

/** Where a run or call came from, for the sentence and a meta fallback */
const FROM: Record<TxResult["act"], string> = {
  run: "client.ts",
  call: "Your call",
};

/**
 * The card's frame, as the prototype's result shell draws it: a status head
 * that opens the details under it, what came back in view below the head,
 * and the details in the same box.
 */
const Shell = ({
  icon,
  title,
  meta,
  failed = false,
  body,
  details,
}: {
  icon: ReactNode;
  title: string;
  meta: ReactNode;
  failed?: boolean;
  body?: ReactNode;
  details?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const status = (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-[0.8125rem] font-label text-foreground">
          {title}
        </span>
        {meta && (
          <span className="min-w-0 truncate text-caption text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
    </>
  );
  const row = "flex h-9 w-full items-center gap-2 px-3 text-left";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "overflow-hidden rounded-control border bg-surface-panel",
        failed ? "border-error/40" : "border-border"
      )}
    >
      <div role="status">
        {details ? (
          <CollapsibleTrigger
            className={cn(
              row,
              "group transition-colors duration-150 hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-ring"
            )}
          >
            {status}
            <span className="sr-only">Details</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:text-foreground motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
        ) : (
          <div className={row}>{status}</div>
        )}
        {body && <div className="flex flex-col gap-3 px-3 pb-3">{body}</div>}
      </div>
      {details && (
        <CollapsibleContent>
          <div className="mx-3 flex flex-col gap-2 border-t border-border pt-3 pb-3">
            {details}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

/** The transaction's log, in mono, for the details' Log */
const LogLines = ({ lines }: { lines: string[] }) => (
  <pre className="max-h-48 overflow-auto font-mono text-[0.75rem] leading-[1.6] whitespace-pre-wrap break-words text-muted-foreground">
    {lines.join("\n")}
  </pre>
);

/** A landed run or call: "Confirmed", the instruction, what the program said */
const LandedCard = ({ result }: { result: Landed }) => {
  const [showLog, setShowLog] = useState(false);
  const ix = result.called[result.called.length - 1]?.instruction ?? null;
  const signature = result.signatures[result.signatures.length - 1] ?? null;
  const receipt = result.receipt ?? {};
  const said = result.line?.startsWith(PROGRAM_LOG)
    ? result.line.slice(PROGRAM_LOG.length)
    : result.line;

  const usage: string[] = [];
  if (receipt.computeUnits !== undefined) {
    usage.push(
      `it used ${receipt.computeUnits.toLocaleString("en-US")} compute units`
    );
  }
  if (receipt.fee !== undefined) {
    usage.push(`the fee was ${testSol(receipt.fee)} test SOL from your wallet`);
  }
  const how = usage.join(", and ");
  const sentence = `${FROM[result.act]} ran in ${formatSeconds(
    result.seconds
  )}${ix ? ` and called \`${ix}\`` : ""}.${
    how ? ` ${how[0].toUpperCase()}${how.slice(1)}.` : ""
  }`;

  return (
    <Shell
      icon={
        <CircleCheck
          aria-hidden="true"
          className="size-4 shrink-0 text-success"
        />
      }
      title="Confirmed"
      meta={
        ix ? (
          <code className="font-mono text-[0.75rem]">{ix}</code>
        ) : (
          SENT_FROM[result.act]
        )
      }
      body={
        said !== null && (
          <p className="border-l-2 border-success pl-3 font-mono text-[0.75rem] break-words">
            <span className="text-muted-foreground">{PROGRAM_LOG}</span>
            <span className="text-foreground">{said}</span>
          </p>
        )
      }
      details={
        <>
          <p className="text-caption text-muted-foreground">{sentence}</p>
          <div className="flex flex-wrap items-center gap-1">
            {signature && (
              <>
                <CopyButton
                  value={signature}
                  label="Copy signature"
                  onError={reportButtonFailure("copy the signature")}
                />
                <Button variant="ghost" size="xs" asChild>
                  <a
                    href={devnetExplorerUrl({ kind: "tx", value: signature })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Explorer
                    <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
              </>
            )}
            {receipt.log && (
              <Button
                variant="ghost"
                size="xs"
                aria-expanded={showLog}
                onClick={() => setShowLog(!showLog)}
              >
                Log
              </Button>
            )}
          </div>
          {showLog && receipt.log && <LogLines lines={receipt.log} />}
        </>
      }
    />
  );
};

/** The log line that names the failure: Anchor's error, else the program's exit */
const errorLineOf = (log: string): string | null => {
  const lines = log.split("\n");
  return (
    lines.find((l) => l.includes("AnchorError")) ??
    lines.find((l) => / failed: /.test(l)) ??
    null
  );
};

/** A run or call that failed, or that sent nothing */
const FailedCard = ({ result }: { result: Failed }) => {
  if (result.reason === "no_transaction") {
    return (
      <Shell
        icon={
          <Eye
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        }
        title="No transaction"
        meta={`${
          result.act === "run" ? "client.ts" : "the call"
        } sent none · see the terminal`}
      />
    );
  }
  const titles = {
    no_funds: "Not enough devnet SOL",
    no_wallet: "No wallet",
  } as const;
  const title =
    (result.reason && titles[result.reason]) ??
    (result.act === "run" ? "Run failed" : "Call failed");
  const error = result.refused?.error;
  const meta = error?.name
    ? `${error.name} · error ${error.code}`
    : result.message;
  const errorLine = errorLineOf(result.log);
  const lines = result.log ? result.log.split("\n") : [];
  return (
    <Shell
      failed
      icon={
        <CircleX aria-hidden="true" className="size-4 shrink-0 text-error" />
      }
      title={title}
      meta={meta}
      body={
        <>
          {errorLine && (
            <p className="border-l-2 border-error/40 pl-3 font-mono text-[0.75rem] break-words text-foreground/90">
              {errorLine}
            </p>
          )}
          {/* The head's meta truncates; the whole reason reads here */}
          <p className={READ}>{result.message}</p>
        </>
      }
      details={lines.length ? <LogLines lines={lines} /> : undefined}
    />
  );
};

/**
 * A run's or a call's result, as Almaz's tutorial-v2 prototype draws it
 * (`ResultCard`, "Tx ok" and the failure card): the head says what happened,
 * the program's line or the error stays in view, and how it went (the
 * sentence with compute units and fee, Copy signature, Explorer, the log)
 * waits behind the head's chevron.
 *
 * TODO(tutorial-flow-v2 3.6): the prototype's failure card carries "Explain
 * the error" and "I'll fix it myself" while it is live; they arrive with the
 * assistant. An older card does not fold to its head yet.
 */
const BaseTxResultCard = ({ result }: { result: TxResult }) =>
  result.ok ? <LandedCard result={result} /> : <FailedCard result={result} />;

export default BaseTxResultCard;
