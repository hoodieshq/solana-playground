/** Which import a link went to */
export type LinkSource = "github" | "gist";

/** Why an import from a link stopped, as New project's events count it */
export type LinkImportFailure =
  | "bad-link"
  | "not-found"
  | "rate-limited"
  | "too-large"
  | "no-program"
  | "invalid"
  | "request-failed";

/**
 * How an import from a link ended. A failure carries the message the card
 * shows, and the error behind it, if any, for the log.
 */
export type LinkImport =
  | { outcome: "imported"; source: LinkSource }
  | { outcome: "cancelled" }
  | {
      outcome: "failed";
      /** `unknown` for a link that is neither a repository nor a gist */
      source: LinkSource | "unknown";
      reason: LinkImportFailure;
      message: string;
      error?: unknown;
    };
