import { CircleCheck, CircleX, ExternalLink } from "lucide-react";

import { shortKey, timeAgo } from "@/features/deploy";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleHeading,
} from "@/shared/ui/collapsible";
import { CopyButton } from "@/shared/ui/copy-button";
import { programMessage } from "./call-outcome";
import type { CallOutcome } from "./call-outcome";

export interface BaseCallResultProps {
  outcome: CallOutcome;
  /** The network the call went to, named in the Explorer link */
  cluster: string;
  txUrl: (signature: string) => string;
  /**
   * Both read the outcome in Spec 03's words with a shape icon and its time,
   * the program's message, the signature shortened in the middle with copy
   * and Explorer on one row, and the logs folded.
   * `card` sits inside the desk's form card, under Call, with no frame of its
   * own. `page` is a card of its own on the phone's page per instruction,
   * right above the pinned Call.
   */
  layout?: "card" | "page";
  /** When the call landed, for the page's time; `null` leaves it out */
  at?: number | null;
  /** The clock the time is read against; the board and tests pin it */
  now?: number;
}

/** The page's heading in Spec 03's words: "Called increment" */
const pageHeading = (o: CallOutcome) => {
  if (o.ok) return `Called ${o.instruction}`;
  if (!o.signature) return `${o.instruction} was not sent`;
  return `Call to ${o.instruction} failed`;
};

/** The secondary actions under the title share one quiet look */
const QUIET =
  "text-caption font-normal text-muted-foreground no-underline hover:text-foreground";

/**
 * The result: on the phone a card read right above the thumb, on the desk
 * the foot of the form's own card. Everything under the title starts where
 * the title's text does, right of the status icon.
 */
const Result = ({
  outcome,
  cluster,
  txUrl,
  at,
  now,
  inline,
}: Required<Omit<BaseCallResultProps, "layout" | "at">> & {
  at: number | null;
  /** Inside the desk's form card: no frame of its own */
  inline: boolean;
}) => {
  const Icon = outcome.ok ? CircleCheck : CircleX;
  const message = programMessage(outcome);
  return (
    <section
      aria-label="Call result"
      aria-live="polite"
      className={
        inline
          ? "flex flex-col gap-2"
          : "flex scroll-mb-36 flex-col gap-2 rounded-xl border border-border bg-surface-panel p-4"
      }
    >
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className={
            outcome.ok
              ? "size-5 shrink-0 text-success"
              : "size-5 shrink-0 text-error"
          }
        />
        <h4 className="m-0 min-w-0 flex-1 truncate text-control font-act text-foreground">
          {pageHeading(outcome)}
        </h4>
        {at !== null && (
          <time
            dateTime={new Date(at).toISOString()}
            className="shrink-0 text-caption text-muted-foreground"
          >
            {timeAgo(at, now) ?? new Date(at).toLocaleDateString("en-US")}
          </time>
        )}
      </div>

      {/* One axis: the icon's 20px and the 8px gap */}
      <div className="flex flex-col gap-2 pl-7">
        {message && (
          <p
            className={`m-0 font-mono text-code break-words ${
              outcome.ok ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {message}
          </p>
        )}

        {/* Under a finger copy, Explorer and the logs' toggle are 44 px
            targets; the rows pull in by the extra height, so the lines keep
            their rhythm and only the hit areas grow */}
        {outcome.signature && (
          <div className="flex min-h-6 flex-wrap items-center gap-x-1.5 gap-y-1 pointer-coarse:-my-2.5">
            <span className="text-caption text-muted-foreground">
              Signature
            </span>
            <code
              className="font-mono text-code text-foreground"
              title={outcome.signature}
            >
              {shortKey(outcome.signature)}
            </code>
            <CopyButton
              value={outcome.signature}
              label="Copy signature"
              onError={reportButtonFailure("copy the signature")}
              className="pointer-coarse:size-11"
            />
            <a
              href={txUrl(outcome.signature)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on Explorer (${cluster})`}
              className={`ml-2 inline-flex items-center gap-1 rounded-sm pointer-coarse:ml-0 pointer-coarse:min-h-11 pointer-coarse:px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${QUIET}`}
            >
              Explorer
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        )}

        {outcome.logs.length > 0 && (
          <Collapsible>
            <CollapsibleHeading
              className={`min-h-6 pointer-coarse:-my-2.5 pointer-coarse:min-h-11 ${QUIET}`}
            >
              <CollapsibleChevron className="-ml-1 size-3.5" />
              Show all logs
            </CollapsibleHeading>
            <CollapsibleContent className="mt-2">
              <pre className="m-0 max-h-72 overflow-auto rounded-lg bg-surface-well p-3 font-mono text-code whitespace-pre-wrap text-muted-foreground">
                {outcome.logs.join("\n")}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </section>
  );
};

/** The last call's result: how it went, its signature, its logs */
const BaseCallResult = ({
  outcome,
  cluster,
  txUrl,
  layout = "card",
  at = null,
  now = Date.now(),
}: BaseCallResultProps) => (
  <Result
    outcome={outcome}
    cluster={cluster}
    txUrl={txUrl}
    at={at}
    now={now}
    inline={layout === "card"}
  />
);

export default BaseCallResult;
