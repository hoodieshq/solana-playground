import { createLogger } from "@/shared/lib/logger";

const log = createLogger("ui:button");

/**
 * The `onError` for `AsyncButton` and `CopyButton`. A failure logged only to
 * the console never reached the team; this one is marked for reporting. A
 * command that already printed its failure to the terminal is reported too;
 * the duplicate is cheaper than a lost one.
 */
export const reportButtonFailure = (error: unknown): void =>
  log.error(error, { report: true });
