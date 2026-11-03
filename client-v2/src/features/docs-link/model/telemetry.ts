import { createTracker } from "@/shared/lib/telemetry";

import type { DocsLinkFailure } from "../lib/link";

/** Where a run from the stage row's project came from */
export type RunSource = "link" | "project";

/** How a run from the stage row ended */
export type RunOutcome = "done" | "failed" | "missing-package";

type DocsLinkEvents = {
  /**
   * A docs link decoded and its project opened. `host` is the host of the
   * link's `from`, or `none`; `bytes` is the decoded file's size.
   */
  docs_link_opened: { host: string; bytes: number };
  /** "This link is broken" showed; `reason` says what did not decode */
  docs_link_failed: { reason: DocsLinkFailure };
  /** The stage row's Run started a run */
  docs_link_run_started: { source: RunSource };
  /** A run from the stage row ended; `seconds` is its whole seconds */
  docs_link_run_finished: {
    source: RunSource;
    outcome: RunOutcome;
    seconds: number;
  };
  /**
   * Run stopped at "Not enough SOL on devnet"; `wallet` is `new` when Run
   * had to set the wallet up first
   */
  docs_link_run_funding_shown: { wallet: "new" | "existing" };
};

export const docsLinkTelemetry = createTracker<DocsLinkEvents>();
