import { createLogger } from "@/shared/lib/logger";

const log = createLogger("ui:button");

/**
 * The `onError` every `AsyncButton` and `CopyButton` in client-v2 passes: a
 * click whose work failed reaches the team, as the legacy `Button`'s
 * `console.error` never did. A command that already printed its failure to
 * the terminal is reported too; the duplicate is cheaper than a lost one.
 */
export const reportButtonFailure = (error: unknown): void =>
  log.error(error, { report: true });
