import { ChevronRight, Circle, CircleCheck, CircleX } from "lucide-react";

import { timeAgo } from "@/features/deploy";
import type { CallRecord } from "../state/call-history";

export interface InstructionRow {
  name: string;
  args: number;
  accounts: number;
}

export interface BaseInstructionListProps {
  instructions: InstructionRow[];
  /** This program's calls on this network, newest first: each row shows its last */
  history: CallRecord[];
  onOpen: (name: string) => void;
  /** The clock the call times are read against; the board and tests pin it */
  now?: number;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "2 args · 3 accounts", or "No inputs" */
const inputs = (r: InstructionRow) => {
  const parts = [
    r.args > 0 && plural(r.args, "arg"),
    r.accounts > 0 && plural(r.accounts, "account"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No inputs";
};

/** "Failed 2 min ago", "Called 5 min ago" */
const statusWord = (last: CallRecord, now: number) => {
  const word = last.ok ? "Called" : "Failed";
  const ago = timeAgo(last.at, now);
  if (ago) return `${word} ${ago}`;
  return `${word} ${new Date(last.at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

/** "4 instructions · 2 called, 1 failed" */
const summary = (
  instructions: InstructionRow[],
  lasts: (CallRecord | undefined)[]
) => {
  const called = lasts.filter(Boolean).length;
  const failed = lasts.filter((l) => l && !l.ok).length;
  const counts =
    failed > 0 ? `${called} called, ${failed} failed` : `${called} called`;
  return `${plural(instructions.length, "instruction")} · ${counts}`;
};

/** The row's leading status: its shape says it, colour only repeats it */
const StatusIcon = ({ last }: { last: CallRecord | undefined }) => {
  if (!last) {
    return (
      <Circle aria-hidden="true" className="size-5 shrink-0 text-subtle" />
    );
  }
  if (last.ok) {
    return (
      <CircleCheck
        aria-hidden="true"
        className="size-5 shrink-0 text-success"
      />
    );
  }
  return <CircleX aria-hidden="true" className="size-5 shrink-0 text-error" />;
};

/**
 * Interact on a phone: the program's instructions as a list, each opening a
 * page of its own (Spec 03, task 4.6). Once anything was called, a summary
 * sits over the list and every row leads with its status icon; the second
 * line starts with the status word and time ("Failed 2 min ago"), then what
 * the call takes. Status is never a dot alone. The row is named by the
 * instruction and described by that line, so a screen reader hears both.
 * Rows are 56 px, above the 44 px floor; IDL order, never sorted by status.
 */
const BaseInstructionList = ({
  instructions,
  history,
  onOpen,
  now = Date.now(),
}: BaseInstructionListProps) => {
  const lasts = instructions.map((ix) =>
    history.find((r) => r.instruction === ix.name)
  );
  const anyCalled = lasts.some(Boolean);
  return (
    <section aria-label="Instructions" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="m-0 text-caption font-act text-muted-foreground">
          Instructions
        </h3>
        {anyCalled && (
          <span className="text-caption text-muted-foreground tabular-nums">
            {summary(instructions, lasts)}
          </span>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-xl border border-border bg-surface-panel p-0">
        {instructions.map((ix, i) => {
          const last = lasts[i];
          const nameId = `instruction-row-${ix.name}`;
          const lineId = `instruction-row-${ix.name}-status`;
          let status: string | null = null;
          if (last) status = statusWord(last, now);
          else if (anyCalled) status = "Not called yet";
          return (
            <li key={ix.name}>
              <button
                type="button"
                aria-labelledby={nameId}
                aria-describedby={lineId}
                onClick={() => onOpen(ix.name)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left outline-none first:rounded-t-xl last:rounded-b-xl hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {anyCalled && <StatusIcon last={last} />}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    id={nameId}
                    className="truncate font-mono text-control font-act text-foreground"
                  >
                    {ix.name}
                  </span>
                  <span
                    id={lineId}
                    className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground"
                  >
                    {status && (
                      <>
                        <span className="shrink-0 font-act text-foreground">
                          {status}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="truncate">{inputs(ix)}</span>
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-subtle"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default BaseInstructionList;
