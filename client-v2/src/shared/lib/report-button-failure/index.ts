import { createLogger } from "@/shared/lib/logger";

const log = createLogger("ui:button");

/**
 * Where a failed click goes: the `onError` of `AsyncButton` and
 * `CopyButton`, and the catch of a click path that is not one of them (such
 * as `ImportButton` and Chat's send). The failure is marked for reporting.
 * A command that already printed its failure to the terminal is reported
 * too; the duplicate is cheaper than a lost one.
 */
export const reportButtonFailure = (error: unknown): void =>
  log.error(error, { report: true });
