import { CircleCheck, CircleX } from "lucide-react";

import type { Text } from "@/entities/tutorial";
import type { RunResult } from "@/features/tutorial-conversation";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Kbd } from "@/shared/ui/kbd";
import BaseTxResultCard from "./BaseTxResultCard";
import { Prose, READ, formatSeconds } from "./Prose";

export interface BaseResultCardProps {
  result: RunResult;
  /** The definition's line for the failure it plans, when this is it */
  planned: Text | null;
  /** A failure still waiting for Explain or "I'll fix it myself" */
  open: boolean;
  onExplain: () => void;
  onFixMyself: () => void;
  /** Open a file at a line: the compiler's location */
  onShowLine: (file: string, line: number) => void;
  /** Run the act again: a build whose server never answered */
  onRetry: () => void;
}

/** The unreachable build server's line (HOO-2355, designers' BUILD-04) */
export const UNREACHABLE =
  "Build couldn't start. The Playground server didn't answer. Your code is unchanged.";

/** lamports to devnet SOL, as the card prints it */
const sol = (lamports: number) =>
  `${Math.round((lamports / 1e9) * 10000) / 10000} devnet SOL from your wallet`;

type TxResult = Extract<RunResult, { act: "run" | "call" }>;

const isTxResult = (r: RunResult): r is TxResult =>
  r.act === "run" || r.act === "call";

/** The head's title and meta for a build's or a deploy's result */
const headOf = (
  r: Exclude<RunResult, TxResult>
): { title: string; meta: string } => {
  if (r.act === "build") {
    if (r.ok) {
      const count = r.instructions.length;
      const names = r.instructions.join(", ");
      return {
        title: "Build successful",
        meta: `IDL: ${count} ${count === 1 ? "instruction" : "instructions"}${
          names ? ` · ${names}` : ""
        } · ${formatSeconds(r.seconds)}`,
      };
    }
    if (r.reason === "unreachable") {
      return { title: "Build server unreachable", meta: "" };
    }
    const where = [
      r.error?.code,
      r.error?.line !== null && r.error?.line !== undefined
        ? `line ${r.error.line}`
        : null,
      formatSeconds(r.seconds),
    ]
      .filter(Boolean)
      .join(" · ");
    return { title: "Build failed", meta: where };
  }
  // A deploy or a build-and-deploy
  if (r.ok) {
    return {
      title: r.upgraded ? `Upgraded ${r.programId}` : "Deployed",
      // A deploy recognised after a reload has no known cost
      meta: r.lamports === null ? "" : sol(r.lamports),
    };
  }
  const titles = {
    no_funds: "Not enough devnet SOL",
    no_wallet: "No wallet",
    failed: "Deploy failed",
  } as const;
  return { title: titles[r.reason], meta: r.message };
};

/**
 * What a run came back with, one shape for build, deploy, run and call. This
 * is the shell: the head, and for a failed build the compiler's line, its
 * location as a link, the definition's line when it plans the failure, and
 * Explain and "I'll fix it myself" while it is open. The run tickets (4.1 to
 * 4.3) fill the bodies each result carries.
 *
 * A run's or call's result is `BaseTxResultCard`'s.
 *
 * TODO(tutorial-flow-v2 4.2): an open failed deploy draws no button yet.
 * Its card is 4.2's (Try again and Open faucet). In Hello Anchor, the one
 * definition so far, no deploy act is reachable before step 1's build
 * passes, which needs a wired runner.
 */
const BaseResultCard = ({
  result,
  planned,
  open,
  onExplain,
  onFixMyself,
  onShowLine,
  onRetry,
}: BaseResultCardProps) => {
  if (isTxResult(result)) return <BaseTxResultCard result={result} />;
  const { title, meta } = headOf(result);
  const Icon = result.ok ? CircleCheck : CircleX;
  const failedBuild = result.act === "build" && !result.ok ? result : null;
  const error = failedBuild?.error ?? null;
  // A Base component takes types only from the feature: the slice's entry
  // would load its store
  const unreachable = failedBuild?.reason === "unreachable";

  return (
    <div
      role="status"
      className={cn(
        "overflow-hidden rounded-control border bg-surface-panel",
        result.ok ? "border-border" : "border-error/40"
      )}
    >
      <div className="flex h-9 items-center gap-2 px-3">
        <Icon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            result.ok ? "text-success" : "text-error"
          )}
        />
        <span className="text-[0.8125rem] font-label text-foreground">
          {title}
        </span>
        {meta && (
          <span className="truncate text-caption text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      {open && unreachable && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <p className={READ}>{UNREACHABLE}</p>
          <Button className="w-fit" onClick={onRetry}>
            Try again
            <Kbd
              aria-hidden="true"
              className="bg-white/15 text-primary-foreground/80"
            >
              ⌘↵
            </Kbd>
          </Button>
        </div>
      )}
      {open && failedBuild && !unreachable && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          {error && (
            <p className="font-mono text-[0.75rem] text-foreground">
              {error.message}
            </p>
          )}
          {error?.file && error.line !== null && (
            <Button
              variant="link"
              size="xs"
              onClick={() => onShowLine(error.file!, error.line!)}
              className="h-auto w-fit px-0 font-mono text-[0.75rem] text-muted-foreground"
            >
              {`--> ${error.file}:${error.line}${
                error.column !== null ? `:${error.column}` : ""
              }`}
            </Button>
          )}
          {/* No line to link: the log is all the learner has to go on */}
          {!(error?.file && error.line !== null) && failedBuild.log && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[0.75rem] text-muted-foreground">
              {failedBuild.log}
            </pre>
          )}
          {planned && (
            <p className={READ}>
              <Prose text={planned} />
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onExplain}>
              Explain the error
              <Kbd
                aria-hidden="true"
                className="bg-white/15 text-primary-foreground/80"
              >
                ⌘↵
              </Kbd>
            </Button>
            <Button variant="ghost" onClick={onFixMyself}>
              I&apos;ll fix it myself
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseResultCard;
