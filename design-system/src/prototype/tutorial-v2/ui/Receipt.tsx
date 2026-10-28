import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { LESSON, PROGRAM_ID, TX_CONFIRMED, TX_FEE, WALLET, shortKey, type Tx } from "../data";
import { openExplorer } from "./explorer";

type Row = { label: string; value: ReactNode; text: string };

/** What a transaction cost and who paid, in the order a newcomer asks: what ran, who paid, what it
 * said. Grouped, with a hairline between groups; the signature closes it */
function groups(tx: Tx): Row[][] {
  const units = `${tx.compute.toLocaleString("en-US")} CU`;
  const muted = (text: string) => (
    <span className="text-muted-foreground">{text}</span>
  );
  return [
    [
      // The key never breaks across lines: on a narrow card it goes under the name, whole
      {
        label: "Program",
        value: (
          <>
            {LESSON.program}{" "}
            <span className="whitespace-nowrap text-muted-foreground">
              · {shortKey(PROGRAM_ID)}
            </span>
          </>
        ),
        text: `${LESSON.program} (${PROGRAM_ID})`,
      },
      {
        label: "Instruction",
        value: <span className="font-mono">{tx.instruction}</span>,
        text: tx.instruction,
      },
    ],
    [
      {
        label: "Fee payer",
        value: (
          <>
            <span className="font-mono">{shortKey(WALLET)}</span> {muted("· your wallet, signer")}
          </>
        ),
        text: `${WALLET} (your wallet, signer)`,
      },
      {
        label: "Fee",
        value: (
          <>
            {TX_FEE} {muted("· test SOL")}
          </>
        ),
        text: `${TX_FEE}, test SOL`,
      },
      { label: "Compute", value: units, text: units },
      { label: "Confirmed", value: TX_CONFIRMED, text: TX_CONFIRMED },
    ],
    // The line the program wrote, the reason the receipt is worth reading
    [
      {
        label: "Log",
        value: <span className="font-mono text-foreground">{tx.said}</span>,
        text: tx.said,
      },
    ],
  ];
}

/** The receipt as plain text, for pasting into a chat: full keys, since nobody can look up a cut one */
function receiptText(tx: Tx) {
  const rows = [
    ...groups(tx).flat(),
    { label: "Signature", text: tx.signature },
  ];
  return [
    `${LESSON.card.name} · transaction receipt`,
    ...rows.map((r) => `${r.label.padEnd(12)}${r.text}`),
    "Example values from the Solana Playground tutorial prototype",
  ].join("\n");
}

/** The old way to copy, from a selected field, still inside the click: for a browser or a frame that
 * refuses the Clipboard API its write permission */
function copyBySelection(text: string) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(field);
  field.select();
  const ok = document.execCommand("copy");
  field.remove();
  return ok;
}

export const copyReceipt = (tx: Tx) => copy(receiptText(tx), "Receipt");

const copy = (text: string, what: string) => {
  const done = () => toast(`${what} copied`);
  const failed = () =>
    copyBySelection(text)
      ? done()
      : toast(`Couldn't copy the ${what.toLowerCase()}`);
  if (!navigator.clipboard) return failed();
  navigator.clipboard.writeText(text).then(done, failed);
};

// Receipts already printed this session, so each prints once: as its transaction comes back, or as
// the finish opens. Coming back to it later, or after switching views, finds it already there
const printed = new Set<string>();
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Whether a receipt keyed `print` still has to print. Read once, as it mounts, so it doesn't stop
 * halfway when something above it renders again */
function usePrint(print: string | null | undefined) {
  const [on] = useState(
    () => !!print && !printed.has(print) && !reduce.matches,
  );
  useEffect(() => {
    if (print) printed.add(print);
  }, [print]);
  return on;
}

/** A row's place in the print order: rows come out one by one, 60ms apart (see prototype.css) */
const at = (i: number) => ({
  "data-print": "",
  style: { "--i": i } as CSSProperties,
});

// Copy and Explorer reach past the row's padding, so each is 44px tall for a finger. On a narrow
// card they keep only their icons, each a 44px square, so the signature keeps room to be read
const LINK =
  "-my-2 flex shrink-0 items-center gap-1 py-2 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 @max-[17rem]:-mx-1.5 @max-[17rem]:size-11 @max-[17rem]:justify-center @max-[17rem]:py-0";

/** What a transaction leaves behind, beside or under its log. It tells the step's story rather than
 * listing fields: what the program said, then what it cost your wallet in test SOL, then how
 * fast. Program, instruction, compute and the signature wait under Details. `print` keys it, so it
 * prints once as its transaction arrives. `flat` is the desktop terminal's cut: a column of the
 * terminal with a rule on its left, not a card floating over the log */
export function Receipt({
  tx,
  print,
  flat = false,
  className,
}: {
  tx: Tx;
  print?: string | null;
  flat?: boolean;
  className?: string;
}) {
  const printing = usePrint(print);
  let i = 0;
  const units = `${tx.compute.toLocaleString("en-US")} CU`;
  const row =
    "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 py-px @max-[17rem]:grid-cols-1 @max-[17rem]:py-0.5";
  return (
    <section
      aria-label="Transaction receipt"
      className={cn(
        "@container text-caption",
        flat
          ? "border-border px-4 py-3"
          : "rounded-control border border-border bg-surface-panel px-3 py-2.5",
        className,
      )}
    >
      <div className={cn("flex flex-col", printing && "pg-print")}>
        {/* Explorer opens the whole transaction, so it sits by the title */}
        <div {...at(i++)} className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 font-label text-muted-foreground">
            Transaction on devnet
          </h3>
          <button
            type="button"
            onClick={openExplorer}
            className={cn(LINK, "@max-[17rem]:-mr-3")}
          >
            <span className="@max-[17rem]:sr-only">Explorer</span>
            <ExternalLink
              strokeWidth={1.75}
              className="size-3.5"
              aria-hidden="true"
            />
          </button>
        </div>
        {/* What the program said: the reason the step was worth doing, so it leads */}
        <p
          {...at(i++)}
          className="mt-2 font-mono text-[0.9375rem] text-foreground"
        >
          {tx.said}
        </p>
        <p {...at(i++)} className="text-muted-foreground">
          logged by <span className="font-mono">msg!</span> in {tx.instruction}
        </p>
        {/* Who paid: the part a newcomer to Solana doesn't expect */}
        <div {...at(i++)} className="mt-3 border-t border-border pt-3">
          <p className="text-foreground">
            You paid <span className="font-medium">{TX_FEE}</span>
          </p>
          <p className="text-muted-foreground">
            Devnet SOL, free test money · confirmed in {TX_CONFIRMED}
          </p>
        </div>
        <details
          {...at(i++)}
          className="group/details mt-3 border-t border-border pt-2"
        >
          <summary className="-mx-1 flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-[6px] px-1 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              strokeWidth={1.75}
              className="size-3.5 transition-transform duration-150 group-open/details:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Details
          </summary>
          <dl className="mt-1 flex flex-col">
            <div className={row}>
              <dt className="text-muted-foreground">Program</dt>
              {/* The key never breaks across lines: on a narrow card it goes under the name, whole */}
              <dd className="min-w-0 break-words text-foreground">
                {LESSON.program}{" "}
                <span className="whitespace-nowrap text-muted-foreground">
                  · {shortKey(PROGRAM_ID)}
                </span>
              </dd>
            </div>
            <div className={row}>
              <dt className="text-muted-foreground">Instruction</dt>
              <dd className="min-w-0 font-mono text-foreground">
                {tx.instruction}
              </dd>
            </div>
            <div className={row}>
              <dt className="text-muted-foreground">Compute</dt>
              <dd className="min-w-0 text-foreground">{units}</dd>
            </div>
            <div className={cn(row, "items-center")}>
              <dt className="text-muted-foreground">Signature</dt>
              <dd className="flex min-w-0 items-center gap-3">
                <code
                  title={tx.signature}
                  className="min-w-0 flex-1 truncate font-mono text-code text-foreground"
                >
                  {shortKey(tx.signature)}
                </code>
                <button
                  type="button"
                  onClick={() => copy(tx.signature, "Signature")}
                  className={cn(LINK, "@max-[17rem]:-mr-3")}
                >
                  <Copy
                    strokeWidth={1.75}
                    className="hidden size-3.5 @max-[17rem]:block"
                    aria-hidden="true"
                  />
                  <span className="@max-[17rem]:sr-only">Copy</span>
                </button>
              </dd>
            </div>
          </dl>
        </details>
        {/* Honest about the numbers, at the foot, without a warning's weight */}
        <p
          {...at(i++)}
          className="mt-2 text-[0.6875rem] text-muted-foreground/70"
        >
          Example values in this prototype
        </p>
      </div>
    </section>
  );
}

/** The finish's last transaction as a printed receipt: mono, dashed hairlines, a torn foot, and
 * Copy as text for sharing it. Prints once, as the finish opens */
/** `under`: opened under the finish's answer card, which already says what the program said and that
 * you paid nothing, and carries Copy and Explorer. So it drops its title, those two rows and its own
 * actions, and keeps the rest: the full record, on demand */
export function PrintedReceipt({
  tx,
  when,
  under = false,
  titled = true,
  className,
}: {
  tx: Tx;
  when: number | null;
  under?: boolean;
  /** false where a row above already names it, as the finish's Transaction details does */
  titled?: boolean;
  className?: string;
}) {
  const printing = usePrint(`finish:${when}`);
  const date =
    when === null
      ? null
      : new Date(when).toLocaleString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  let i = 0;
  const row = "flex justify-between gap-x-4 py-0.5 @max-xs:flex-col";
  const action =
    "flex min-h-11 items-center gap-1.5 text-muted-foreground hover:text-foreground";
  return (
    <section
      aria-labelledby={under || !titled ? undefined : "receipt-title"}
      aria-label={under ? "Full receipt" : !titled ? "Transaction receipt" : undefined}
      className={className}
    >
      {!under && titled && (
        <h2 id="receipt-title" className="text-caption text-muted-foreground">
          Your last transaction
        </h2>
      )}
      {/* The foot is torn, so the card has no border at the bottom: the teeth are its edge */}
      <div
        className={cn(
          "pg-receipt @container rounded-t-control border border-b-0 border-border bg-surface-panel px-4 pt-4 font-mono text-code",
          !under && "mt-2",
        )}
      >
        {/* Set from the left edge, as the rows under it are: a centred head read as a till slip */}
        <div className={cn("flex flex-col", printing && "pg-print")}>
          <p {...at(i++)} className="text-foreground">
            {LESSON.program} · devnet
          </p>
          {date && (
            <p {...at(i++)} className="text-muted-foreground">
              {date}
            </p>
          )}
          <dl className="contents">
            {groups(tx)
              .map((group) =>
                under
                  ? group.filter((r) => r.label !== "You" && r.label !== "Log")
                  : group,
              )
              .filter((group) => group.length > 0)
              .map((group, g) => (
                <div
                  key={g}
                  className="contents [&>div:first-child]:mt-3 [&>div:first-child]:border-t [&>div:first-child]:border-dashed [&>div:first-child]:border-border-strong [&>div:first-child]:pt-3"
                >
                  {group.map((r) => (
                    <div key={r.label} {...at(i++)} className={row}>
                      <dt className="shrink-0 text-muted-foreground">
                        {r.label}
                      </dt>
                      <dd className="min-w-0 text-right break-words text-foreground @max-xs:text-left">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </div>
              ))}
            <div
              {...at(i++)}
              className={cn(
                row,
                "mt-3 border-t border-dashed border-border-strong pt-3",
              )}
            >
              <dt className="shrink-0 text-muted-foreground">Signature</dt>
              <dd
                title={tx.signature}
                className="min-w-0 text-right text-foreground @max-xs:text-left"
              >
                {shortKey(tx.signature)}
              </dd>
            </div>
          </dl>
          <p
            {...at(i++)}
            className="mt-3 font-sans text-[0.6875rem] text-muted-foreground"
          >
            Example values in this prototype
          </p>
          {!under && (
            <div
              {...at(i++)}
              className="mt-2 flex flex-wrap gap-x-6 border-t border-dashed border-border-strong pt-1 font-sans text-caption"
            >
              <button
                type="button"
                onClick={() => copy(receiptText(tx), "Receipt")}
                className={action}
              >
                <Copy
                  strokeWidth={1.75}
                  className="size-3.5"
                  aria-hidden="true"
                />
                Copy as text
              </button>
              <button type="button" onClick={openExplorer} className={action}>
                Explorer
                <ExternalLink
                  strokeWidth={1.75}
                  className="size-3.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
          {under && <div className="h-3" />}
        </div>
      </div>
    </section>
  );
}
